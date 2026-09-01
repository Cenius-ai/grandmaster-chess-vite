/**
 * statusDisplay.js — Manages the game status display bar and status message.
 */
export class StatusDisplay {
  /**
   * @param {HTMLElement} statusBarEl
   * @param {HTMLElement} statusMsgEl
   * @param {import('../game/chessGame.js').ChessGame} game
   */
  constructor(statusBarEl, statusMsgEl, game) {
    this._statusBar = statusBarEl;
    this._statusMsg = statusMsgEl;
    this._game = game;
  }

  /** Update both the status bar and the status message */
  update() {
    this._updateBar();
    this._updateMessage();
  }

  _updateBar() {
    this._statusBar.textContent = this._game.statusBarMessage;
    this._statusBar.className = this._game.statusBarClass;
  }

  _updateMessage() {
    const status = this._game.gameStatus;
    this._statusMsg.textContent = this._game.statusMessage;
    this._statusMsg.className = `status-message${status !== 'playing' ? ` status-message--${status}` : ''}`;
  }
}
