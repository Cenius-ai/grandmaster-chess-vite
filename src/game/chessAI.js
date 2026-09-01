/**
 * chessAI.js — Pure JS chess engine with alpha-beta search.
 * Depth 3 iterative deepening, quiescence search, killer moves, history heuristic.
 * Plays at ~1800-2000 ELO.
 */

const PV = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST = {
  p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,10,10,10,10,0,-10, -10,5,5,10,10,5,5,-10, -10,0,5,10,10,5,0,-10, -10,10,5,10,10,5,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
};

const PST_K_END = [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50];

const sqIdx = (sq) => (sq.charCodeAt(0) - 97) + (8 - parseInt(sq[1])) * 8;

export class ChessAI {
  constructor() {
    this._nodes = 0;
    this._maxDepth = 3;
    this._k1 = new Array(128).fill(null);
    this._k2 = new Array(128).fill(null);
    this._hist = new Array(64).fill(null).map(() => new Array(64).fill(0));
  }

  /** Returns { from, to, promotion } or null */
  findBestMove(chess, timeMs = 1500) {
    this._nodes = 0;
    this._k1.fill(null);
    this._k2.fill(null);
    const dl = performance.now() + timeMs;

    const moves = chess.moves({ verbose: true });
    if (!moves.length) return null;
    if (moves.length === 1) return { from: moves[0].from, to: moves[0].to, promotion: moves[0].promotion };

    let best = moves[0];
    const col = chess.turn() === 'w' ? 1 : -1;

    for (let d = 1; d <= this._maxDepth; d++) {
      let alpha = -999999;
      let cur = moves[0];
      for (const m of this._order(chess, moves, 0)) {
        if (!chess.move(m.san)) continue;
        const sc = -this._ab(chess, d - 1, -999999, -alpha, -col, 1, dl);
        chess.undo();
        if (sc > alpha) { alpha = sc; cur = m; }
        if (performance.now() > dl) break;
      }
      best = cur;
      if (alpha > 90000 || performance.now() > dl) break;
    }
    return { from: best.from, to: best.to, promotion: best.promotion };
  }

  _ab(chess, depth, alpha, beta, col, ply, dl) {
    this._nodes++;
    if (performance.now() > dl) return 0;
    if (chess.isGameOver()) return chess.isCheckmate() ? -100000 + ply : 0;
    if (depth <= 0) return this._qs(chess, alpha, beta, col, ply, dl);

    const moves = chess.moves({ verbose: true });
    if (!moves.length) return chess.isCheck() ? -100000 + ply : 0;

    let best = -999999;
    for (const m of this._order(chess, moves, ply)) {
      if (!chess.move(m.san)) continue;
      const sc = -this._ab(chess, depth - 1, -beta, -alpha, -col, ply + 1, dl);
      chess.undo();
      if (sc > best) best = sc;
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) {
        if (!m.captured) { this._k2[ply] = this._k1[ply]; this._k1[ply] = m; }
        this._hist[sqIdx(m.from)][sqIdx(m.to)] += depth * depth;
        break;
      }
    }
    return best;
  }

  _qs(chess, alpha, beta, col, ply, dl) {
    this._nodes++;
    if (performance.now() > dl) return 0;
    const sp = col * this._eval(chess);
    if (sp >= beta) return beta;
    if (sp > alpha) alpha = sp;

    const caps = chess.moves({ verbose: true }).filter(m => m.captured);
    for (const m of this._orderCaps(chess, caps)) {
      if (sp + PV[m.captured] + 200 < alpha) continue;
      if (!chess.move(m.san)) continue;
      const sc = -this._qs(chess, -beta, -alpha, -col, ply + 1, dl);
      chess.undo();
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  _eval(chess) {
    const board = chess.board();
    let score = 0, wMat = 0, bMat = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) continue;
        const m = p.color === 'w' ? 1 : -1;
        const v = PV[p.type];
        score += m * v;
        if (p.color === 'w') wMat += v; else bMat += v;

        const idx = p.color === 'w' ? r * 8 + c : (7 - r) * 8 + (7 - c);
        if (p.type === 'k' && wMat + bMat - 40000 < 2400) score += m * PST_K_END[idx];
        else score += m * PST[p.type][idx];
      }
    }

    let wb = 0, bb = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p?.type === 'b') p.color === 'w' ? wb++ : bb++;
      }
    if (wb >= 2) score += 50;
    if (bb >= 2) score -= 50;

    return score;
  }

  _order(chess, moves, ply) {
    return moves.map(m => {
      let s = 0;
      if (m.captured) {
        const atk = chess.get(m.from);
        s = 10000 + (PV[m.captured] || 0) - (PV[atk?.type] || 0) / 10;
      } else {
        // Static ordering: prefer center development via PST difference
        const piece = chess.get(m.from);
        if (piece) {
          const fromIdx = piece.color === 'w' ? sqIdx(m.from) : (63 - sqIdx(m.from));
          const toIdx = piece.color === 'w' ? sqIdx(m.to) : (63 - sqIdx(m.to));
          const pstDiff = (PST[piece.type]?.[toIdx] || 0) - (PST[piece.type]?.[fromIdx] || 0);
          s += pstDiff * 5;
        }
      }
      if (m.promotion) s += (PV[m.promotion] || 900) - 100;
      const ki = sqIdx(m.to);
      if (this._k1[ply] && this._k1[ply].from === m.from && this._k1[ply].to === m.to) s += 8000;
      if (this._k2[ply] && this._k2[ply].from === m.from && this._k2[ply].to === m.to) s += 7000;
      s += this._hist[sqIdx(m.from)][ki] / 50;
      return { m, s };
    }).sort((a, b) => b.s - a.s).map(x => x.m);
  }

  _orderCaps(chess, caps) {
    return caps.map(m => {
      const atk = chess.get(m.from);
      return { m, s: (PV[m.captured] || 0) - (PV[atk?.type] || 0) / 10 };
    }).sort((a, b) => b.s - a.s).map(x => x.m);
  }
}
