/**
 * controls.js — New Game and Undo buttons with keyboard shortcuts.
 */
export class Controls {
  /**
   * @param {HTMLElement} container
   * @param {import('../game/chessGame.js').ChessGame} game
   * @param {import('./board.js').ChessboardUI} board
   * @param {import('../game/computerPlayer.js').ComputerPlayer} computer
   */
  constructor(container, game, board, computer) {
    this._container = container;
    this._game = game;
    this._board = board;
    this._computer = computer;

    this._newGameCallback = null;
    this._undoCallback = null;

    this._build();
  }

  onNewGame(callback) {
    this._newGameCallback = callback;
  }

  onUndo(callback) {
    this._undoCallback = callback;
  }

  /** Update button enabled/disabled states */
  update() {
    const moveCount = this._game.moveCount;
    // Undo: enabled when human has moved (at least 2 half-moves in)
    // Actually enable when at least 1 full round (white + black) has been made
    this._undoBtn.disabled = moveCount < 2 || this._computer.isThinking;
    // New game always enabled unless thinking
    this._newGameBtn.disabled = this._computer.isThinking;
  }

  _build() {
    while (this._container.firstChild) { this._container.removeChild(this._container.firstChild); }

    this._newGameBtn = document.createElement('button');
    this._newGameBtn.className = 'btn btn--primary';
    this._newGameBtn.textContent = 'New Game';
    this._newGameBtn.title = 'Start a new game (N)';
    this._newGameBtn.addEventListener('click', () => {
      if (this._newGameCallback) this._newGameCallback();
    });

    this._undoBtn = document.createElement('button');
    this._undoBtn.className = 'btn btn--danger';
    this._undoBtn.textContent = 'Undo';
    this._undoBtn.title = 'Undo last move (U)';
    this._undoBtn.disabled = true;
    this._undoBtn.addEventListener('click', () => {
      if (this._undoCallback) this._undoCallback();
    });

    this._container.appendChild(this._newGameBtn);
    this._container.appendChild(this._undoBtn);
  }
}
