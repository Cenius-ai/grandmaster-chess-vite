/**
 * computerPlayer.js — Chess engine integration.
 * Tries Stockfish Web Worker first; falls back to pure JS alpha-beta AI.
 * Exposes Player fields: color ('black'), type ('computer').
 */

import { ChessAI } from './chessAI.js';
import { Player } from './player.js';

const THINK_TIME_MS = 1500;

export class ComputerPlayer {
  /**
   * @param {import('../game/chessGame.js').ChessGame} game
   */
  constructor(game) {
    this._game = game;
    this._worker = null;
    this._ready = false;
    this._thinking = false;
    this._onStatusChange = null;
    this._pendingResolve = null;
    this._initPromise = null;
    this._jsAI = new ChessAI();
    this._useStockfish = false;
    this._initAttempted = false;

    /** Player entity fields — matches data model */
    this.color = 'black';
    this.type = 'computer';
  }

  /** The Player entity for this computer opponent */
  get player() {
    return new Player(this.color, this.type);
  }

  onStatusChange(callback) {
    this._onStatusChange = callback;
  }

  async init() {
    if (this._initPromise) return this._initPromise;

    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    this._initAttempted = true;

    // Try Stockfish worker first
    try {
      await this._initStockfish();
      this._useStockfish = true;
      this._ready = true;
      this._setStatus('ready', 'Engine ready (Stockfish)');
      return;
    } catch (err) {
      console.warn('Stockfish unavailable, using built-in AI:', err.message);
    }

    // Fall back to pure JS AI — always ready
    this._ready = true;
    this._useStockfish = false;
    this._setStatus('ready', 'Engine ready (built-in AI)');
  }

  async _initStockfish() {
    return new Promise((resolve, reject) => {
      try {
        this._worker = new Worker('/sf-worker.js');
      } catch (err) {
        reject(new Error(`Cannot create worker: ${err.message}`));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Stockfish init timed out'));
      }, 8000);

      this._worker.onmessage = (e) => {
        const line = String(e.data || '').trim();
        if (!line) return;

        if (line === 'uciok') {
          this._send('isready');
          return;
        }

        if (line === 'readyok') {
          clearTimeout(timeout);
          resolve();
          return;
        }
      };

      this._worker.onerror = (err) => {
        clearTimeout(timeout);
        reject(err);
      };

      this._send('uci');
    });
  }

  _send(command) {
    if (this._worker) {
      this._worker.postMessage(command);
    }
  }

  async getBestMove() {
    if (!this._ready) await this.init();

    if (this._useStockfish && this._worker) {
      return this._getStockfishMove();
    }
    return this._getJSMove();
  }

  _getStockfishMove() {
    return new Promise((resolve) => {
      this._thinking = true;
      this._setStatus('thinking', 'Thinking…');
      this._pendingResolve = resolve;

      const moves = this._game.history.map(m => m.from + m.to).join(' ');
      if (moves.length > 0) {
        this._send(`position startpos moves ${moves}`);
      } else {
        this._send('position startpos');
      }
      this._send(`go movetime ${THINK_TIME_MS}`);

      setTimeout(() => {
        if (this._pendingResolve) {
          this._send('stop');
          setTimeout(() => {
            if (this._pendingResolve) {
              const r = this._pendingResolve;
              this._pendingResolve = null;
              this._thinking = false;
              this._setStatus('ready', 'Engine ready');
              r(this._getJSBestMoveStr());
            }
          }, 1000);
        }
      }, THINK_TIME_MS + 3000);

      const origOnMessage = this._worker.onmessage;
      this._worker.onmessage = (e) => {
        const line = String(e.data || '').trim();
        if (line.startsWith('bestmove') && this._pendingResolve) {
          const parts = line.split(' ');
          const bestMove = parts[1];
          const r = this._pendingResolve;
          this._pendingResolve = null;
          this._thinking = false;
          this._setStatus('ready', 'Engine ready');
          this._worker.onmessage = origOnMessage;
          r(bestMove && bestMove !== '(none)' ? bestMove : this._getJSBestMoveStr());
        } else if (origOnMessage) {
          origOnMessage(e);
        }
      };
    });
  }

  _getJSMove() {
    return new Promise((resolve) => {
      this._thinking = true;
      this._setStatus('thinking', 'Thinking…');

      setTimeout(() => {
        const result = this._getJSBestMoveStr();
        this._thinking = false;
        this._setStatus('ready', 'Engine ready');
        resolve(result);
      }, 50);
    });
  }

  _getJSBestMoveStr() {
    const chess = this._game.engine;
    const best = this._jsAI.findBestMove(chess, THINK_TIME_MS);
    if (!best) return null;
    return best.from + best.to + (best.promotion || '');
  }

  async makeMove() {
    if (this._game.isGameOver) return null;

    const uciMove = await this.getBestMove();
    if (!uciMove) return null;

    const from = uciMove.substring(0, 2);
    const to = uciMove.substring(2, 4);
    const promotion = uciMove.length > 4 ? uciMove.substring(4, 5) : 'q';

    const result = this._game.move({ from, to }, promotion);
    return result;
  }

  reset() {
    if (this._worker && this._ready && this._useStockfish) {
      this._send('ucinewgame');
    }
    this._thinking = false;
    this._pendingResolve = null;
    this._jsAI = new ChessAI();
  }

  destroy() {
    if (this._worker) {
      this._send('quit');
      this._worker.terminate();
      this._worker = null;
    }
    this._ready = false;
  }

  get isReady() { return this._ready; }
  get isThinking() { return this._thinking; }

  _setStatus(status, message) {
    if (this._onStatusChange) {
      this._onStatusChange({ status, message });
    }
  }
}
