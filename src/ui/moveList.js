/**
 * moveList.js — Renders the move history list with paired notation.
 * Uses safe DOM construction (textContent only) — NO innerHTML.
 */
export class MoveList {
  /**
   * @param {HTMLElement} container
   * @param {import('../game/chessGame.js').ChessGame} game
   */
  constructor(container, game) {
    this._container = container;
    this._game = game;
  }

  /** Update the move list display — safe DOM-only, no innerHTML */
  update() {
    // Clear existing content
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }

    const pairs = this._game.pairedHistory;
    if (pairs.length === 0) {
      const p = document.createElement('p');
      p.className = 'move-list-empty';
      p.textContent = 'No moves yet. Your move as White.';
      this._container.appendChild(p);
      return;
    }

    // Build each move entry with DOM nodes
    for (const pair of pairs) {
      const entry = document.createElement('span');
      entry.className = 'move-entry';

      const numSpan = document.createElement('span');
      numSpan.className = 'move-number';
      numSpan.textContent = String(pair.moveNumber) + '.';
      entry.appendChild(numSpan);

      const whiteSpan = document.createElement('span');
      whiteSpan.className = 'move-san';
      whiteSpan.textContent = this._sanText(pair.white);
      entry.appendChild(whiteSpan);

      if (pair.black) {
        const blackSpan = document.createElement('span');
        blackSpan.className = 'move-san' +
          (this._isLastBlack(pair) ? ' move-san--last' : '');
        blackSpan.textContent = this._sanText(pair.black);
        entry.appendChild(blackSpan);
      }

      this._container.appendChild(entry);
    }

    // Scroll to bottom
    this._container.scrollTop = this._container.scrollHeight;
  }

  _sanText(move) {
    if (!move || !move.san) return '\u2026'; // ellipsis
    return move.san;
  }

  _isLastBlack(pair) {
    const history = this._game.history;
    if (history.length === 0) return false;
    const last = history[history.length - 1];
    return pair.black && last.from === pair.black.from && last.to === pair.black.to;
  }
}
