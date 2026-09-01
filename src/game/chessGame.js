/**
 * chessGame.js — Wraps chess.js for game state management.
 * Provides a clean API consumed by UI and computer player modules.
 */
import { Chess } from 'chess.js';
import { Player } from './player.js';

export class ChessGame {
  constructor() {
    this._chess = new Chess();
    /** @type {Player} — human plays white by default */
    this.whitePlayer = new Player('white', 'human');
    /** @type {Player} — computer plays black by default */
    this.blackPlayer = new Player('black', 'computer');
  }

  /** Get the Player whose turn it currently is */
  get currentPlayer() {
    return this._chess.turn() === 'w' ? this.whitePlayer : this.blackPlayer;
  }

  // ---- State accessors ----

  /** Current FEN string */
  get fen() {
    return this._chess.fen();
  }

  /** Whose turn: 'w' or 'b' */
  get turn() {
    return this._chess.turn();
  }

  /** Is the current side in check? */
  get isCheck() {
    return this._chess.isCheck();
  }

  /** Is the game checkmate? */
  get isCheckmate() {
    return this._chess.isCheckmate();
  }

  /** Is the game stalemate? */
  get isStalemate() {
    return this._chess.isStalemate();
  }

  /** Is the game drawn? (all draw types) */
  get isDraw() {
    return this._chess.isDraw();
  }

  /** Is the game over for any reason? */
  get isGameOver() {
    return this._chess.isGameOver();
  }

  /** Composite game status string */
  get gameStatus() {
    if (this._chess.isCheckmate()) return 'checkmate';
    if (this._chess.isStalemate()) return 'stalemate';
    if (this._chess.isDraw()) return 'draw';
    if (this._chess.isCheck()) return 'check';
    return 'playing';
  }

  /** Human-readable status message */
  get statusMessage() {
    if (this._chess.isCheckmate()) {
      const winner = this._chess.turn() === 'w' ? 'Black' : 'White';
      return `Checkmate! ${winner} wins.`;
    }
    if (this._chess.isStalemate()) return 'Stalemate! Draw.';
    if (this._chess.isDraw()) {
      if (this._chess.isInsufficientMaterial()) return 'Draw by insufficient material.';
      if (this._chess.isThreefoldRepetition()) return 'Draw by threefold repetition.';
      if (this._chess.isStalemate()) return 'Stalemate! Draw.';
      return 'Draw.';
    }
    if (this._chess.isCheck()) {
      const side = this._chess.turn() === 'w' ? 'White' : 'Black';
      return `${side} is in check.`;
    }
    const side = this._chess.turn() === 'w' ? 'White' : 'Black';
    return `${side} to move.`;
  }

  /** Bar-level status string */
  get statusBarMessage() {
    const s = this.gameStatus;
    if (s === 'checkmate') {
      const winner = this._chess.turn() === 'w' ? 'Black' : 'White';
      return `Checkmate — ${winner} wins!`;
    }
    if (s === 'stalemate') return 'Stalemate — Draw';
    if (s === 'draw') return 'Draw';
    if (s === 'check') {
      const side = this._chess.turn() === 'w' ? 'White' : 'Black';
      return `${side} is in check`;
    }
    return '';
  }

  /** Status bar CSS class */
  get statusBarClass() {
    return `status-bar${this.gameStatus !== 'playing' ? ` status-bar--${this.gameStatus}` : ''}`;
  }

  /** Raw chess.js instance (for advanced use) */
  get engine() {
    return this._chess;
  }

  // ---- Board representation ----

  /**
   * Returns an 8x8 array of { square, piece, color } or null.
   * Row 0 = rank 8 (top), Row 7 = rank 1 (bottom).
   */
  get boardState() {
    const board = [];
    for (let rank = 8; rank >= 1; rank--) {
      const row = [];
      for (let file = 0; file < 8; file++) {
        const sq = String.fromCharCode(97 + file) + rank;
        const piece = this._chess.get(sq);
        row.push(piece ? { square: sq, type: piece.type, color: piece.color } : null);
      }
      board.push(row);
    }
    return board;
  }

  /** All squares with pieces: { square, type, color }[] */
  get pieces() {
    const result = [];
    for (const row of this.boardState) {
      for (const p of row) {
        if (p) result.push(p);
      }
    }
    return result;
  }

  // ---- Move operations ----

  /**
   * Get legal moves for a square.
   * @param {string} square - e.g. 'e2'
   * @returns {Array<{from: string, to: string, san: string, flags: string}>}
   */
  legalMoves(square) {
    try {
      return this._chess.moves({ square, verbose: true });
    } catch {
      return [];
    }
  }

  /**
   * Get ALL legal moves in the current position.
   * @returns {Array<{from: string, to: string, san: string, flags: string}>}
   */
  allLegalMoves() {
    return this._chess.moves({ verbose: true });
  }

  /**
   * Make a move. Accepts SAN or from-to.
   * @param {string|object} move - SAN string like 'e4' or {from:'e2', to:'e4'}
   * @returns {object|null} Move object or null if illegal
   */
  move(move, promotion) {
    try {
      if (typeof move === 'string') {
        return this._chess.move(move);
      }
      return this._chess.move({ from: move.from, to: move.to, promotion: promotion || 'q' });
    } catch {
      return null;
    }
  }

  /** Undo the last move. Returns the undone move or null. */
  undo() {
    try {
      const move = this._chess.undo();
      return move || null;
    } catch {
      return null;
    }
  }

  /** Undo the last two half-moves (human + computer). Useful for undo button. */
  undoLastTwo() {
    const second = this.undo();
    const first = this.undo();
    return { first, second };
  }

  /** Reset to a new game */
  reset() {
    this._chess = new Chess();
  }

  // ---- Move history ----

  /** Full move history with verbose info */
  get history() {
    return this._chess.history({ verbose: true });
  }

  /** Number of half-moves played */
  get moveCount() {
    return this._chess.history().length;
  }

  /**
   * History grouped into move-pairs (white + black).
   * Returns [{ moveNumber, white, black }]
   */
  get pairedHistory() {
    const moves = this.history;
    const pairs = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: moves[i] || null,
        black: moves[i + 1] || null,
      });
    }
    return pairs;
  }

  // ---- Query ----

  /** Get the piece at a square */
  pieceAt(square) {
    return this._chess.get(square);
  }

  /** Is a square occupied by the current turn's piece? */
  isMyPiece(square) {
    const piece = this._chess.get(square);
    return piece && piece.color === this._chess.turn();
  }

  /** Get the king square for a color */
  kingSquare(color) {
    for (const row of this.boardState) {
      for (const p of row) {
        if (p && p.type === 'k' && p.color === color) return p.square;
      }
    }
    return null;
  }
}
