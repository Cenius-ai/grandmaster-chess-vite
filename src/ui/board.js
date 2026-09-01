/**
 * board.js — DOM-based interactive chessboard.
 * Renders pieces, handles click/keyboard interaction,
 * highlights legal moves, and emits move events.
 */

// Unicode chess pieces keyed by type+color
const PIECE_CHARS = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

export class ChessboardUI {
  /**
   * @param {HTMLElement} container
   * @param {import('../game/chessGame.js').ChessGame} game
   */
  constructor(container, game) {
    this._container = container;
    this._game = game;
    this._selectedSquare = null;
    this._legalMoves = [];        // verbose move objects
    this._legalSquares = new Set(); // destination squares only
    this._lastMoveFrom = null;
    this._lastMoveTo = null;
    this._orientation = 'white';   // white at bottom
    this._focusedSquare = 'e2';    // keyboard focus
    this._moveCallback = null;
    this._dragging = null;

    this._buildBoard();
    this._bindEvents();
    this.update();
  }

  // ---- Public API ----

  /** Register a callback: fn({from, to, promotion}) when human moves */
  onMove(callback) {
    this._moveCallback = callback;
  }

  /** Redraw the board from current game state */
  update() {
    const board = this._game.boardState;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = this._squareName(r, c);
        const cell = this._cells[r][c];
        const piece = board[r][c];

        // Update piece
        const pieceEl = cell.querySelector('.piece');
        if (piece) {
          const char = PIECE_CHARS[piece.color]?.[piece.type] || '';
          if (pieceEl) {
            if (pieceEl.textContent !== char) {
              pieceEl.textContent = char;
              pieceEl.className = `piece piece--${piece.color}`;
            }
          } else {
            const span = document.createElement('span');
            span.className = `piece piece--${piece.color}`;
            span.textContent = char;
            cell.appendChild(span);
          }
        } else {
          if (pieceEl) pieceEl.remove();
        }

        // Update square classes (keep structural classes, replace state ones)
        const baseClass = ((r + c) % 2 === 0) ? 'square--light' : 'square--dark';
        cell.className = `square ${baseClass}`;
        cell.setAttribute('data-square', sq);
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', this._ariaLabel(sq, piece));
      }
    }

    // Re-apply highlights
    this._applyHighlights();
  }

  /** Full re-render (slower, use update() when possible) */
  render() {
    this._buildBoard();
    this.update();
    this._applyHighlights();
  }

  /** Set board orientation */
  setOrientation(color) {
    this._orientation = color;
    this._buildBoard();
    this.update();
  }

  /** Destroy and clean up */
  destroy() {
    this._clearContainer();
    this._moveCallback = null;
  }

  // ---- Internal: Build ----

  /** Safe DOM clearing — no innerHTML */
  _clearContainer() {
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }
  }

  _buildBoard() {
    this._clearContainer();
    this._cells = [];

    for (let r = 0; r < 8; r++) {
      const row = [];
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        cell.setAttribute('data-square', this._squareName(r, c));
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('tabindex', '-1');
        row.push(cell);
        this._container.appendChild(cell);
      }
      this._cells.push(row);
    }
  }

  /** Map board row/col (0-index, top-left) to square name */
  _squareName(row, col) {
    // row 0 = rank 8 from white's perspective
    if (this._orientation === 'white') {
      const file = String.fromCharCode(97 + col);  // a-h
      const rank = 8 - row;
      return file + rank;
    } else {
      const file = String.fromCharCode(104 - col);  // h-a
      const rank = row + 1;
      return file + rank;
    }
  }

  /** Reverse: square name -> {row, col} in current orientation */
  _squareCoords(square) {
    const file = square.charCodeAt(0) - 97; // 0-7
    const rank = parseInt(square[1]) - 1;    // 0-7
    if (this._orientation === 'white') {
      return { row: 7 - rank, col: file };
    } else {
      return { row: rank, col: 7 - file };
    }
  }

  /** ARIA label for a square */
  _ariaLabel(square, piece) {
    if (!piece) return square;
    const names = { k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn' };
    const color = piece.color === 'w' ? 'White' : 'Black';
    return `${color} ${names[piece.type]} on ${square}`;
  }

  // ---- Internal: Highlights ----

  _applyHighlights() {
    // Selected square
    if (this._selectedSquare) {
      const { row, col } = this._squareCoords(this._selectedSquare);
      if (row >= 0 && row < 8 && col >= 0 && col < 8) {
        this._cells[row][col].classList.add('square--selected');
      }
    }

    // Legal destinations
    for (const move of this._legalMoves) {
      const { row, col } = this._squareCoords(move.to);
      if (row >= 0 && row < 8 && col >= 0 && col < 8) {
        const piece = this._game.pieceAt(move.to);
        this._cells[row][col].classList.add(piece ? 'square--legal-capture' : 'square--legal');
      }
    }

    // Last move highlight
    if (this._lastMoveFrom) {
      const from = this._squareCoords(this._lastMoveFrom);
      if (from.row >= 0 && from.row < 8 && from.col >= 0 && from.col < 8) {
        this._cells[from.row][from.col].classList.add('square--lastmove');
      }
    }
    if (this._lastMoveTo) {
      const to = this._squareCoords(this._lastMoveTo);
      if (to.row >= 0 && to.row < 8 && to.col >= 0 && to.col < 8) {
        this._cells[to.row][to.col].classList.add('square--lastmove');
      }
    }

    // Check highlight on king
    if (this._game.isCheck && !this._game.isGameOver) {
      const kingSq = this._game.kingSquare(this._game.turn);
      if (kingSq) {
        const { row, col } = this._squareCoords(kingSq);
        if (row >= 0 && row < 8 && col >= 0 && col < 8) {
          this._cells[row][col].classList.add('square--check');
        }
      }
    }
  }

  _clearHighlights() {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this._cells[r][c];
        cell.classList.remove(
          'square--selected', 'square--legal', 'square--legal-capture',
          'square--lastmove', 'square--check'
        );
      }
    }
  }

  // ---- Internal: Events ----

  _bindEvents() {
    this._container.addEventListener('click', (e) => this._onClick(e));
    this._container.addEventListener('keydown', (e) => this._onKeyDown(e));

    // Drag support
    this._container.addEventListener('mousedown', (e) => this._onDragStart(e));
    this._container.addEventListener('touchstart', (e) => this._onDragStart(e), { passive: false });

    document.addEventListener('mousemove', (e) => this._onDragMove(e));
    document.addEventListener('touchmove', (e) => this._onDragMove(e), { passive: false });
    document.addEventListener('mouseup', (e) => this._onDragEnd(e));
    document.addEventListener('touchend', (e) => this._onDragEnd(e));
  }

  _getSquareElement(e) {
    let el = e.target;
    while (el && el !== this._container) {
      if (el.classList.contains('square')) return el;
      el = el.parentElement;
    }
    return null;
  }

  _onClick(e) {
    if (this._dragging) return;
    const squareEl = this._getSquareElement(e);
    if (!squareEl) return;
    const square = squareEl.getAttribute('data-square');
    if (!square) return;

    this._handleSquareInteraction(square);
  }

  _handleSquareInteraction(square) {
    // Game over — no moves allowed
    if (this._game.isGameOver) return;

    // Only human can interact
    if (this._game.turn !== 'w') return;

    if (this._selectedSquare === null) {
      // No piece selected — try to select one
      if (this._game.isMyPiece(square)) {
        this._selectSquare(square);
      }
      return;
    }

    if (square === this._selectedSquare) {
      // Clicked same square — deselect
      this._deselect();
      return;
    }

    // Check if clicking another own piece — reselect
    if (this._game.isMyPiece(square)) {
      this._selectSquare(square);
      return;
    }

    // Check if legal destination
    if (this._legalSquares.has(square)) {
      this._executeMove(this._selectedSquare, square);
    } else {
      // Illegal — deselect
      this._deselect();
    }
  }

  _selectSquare(square) {
    this._deselect();
    this._selectedSquare = square;
    this._focusedSquare = square;

    const moves = this._game.legalMoves(square);
    this._legalMoves = moves;
    this._legalSquares = new Set(moves.map(m => m.to));

    this._clearHighlights();
    this._applyHighlights();

    // Focus the selected square for keyboard
    const { row, col } = this._squareCoords(square);
    this._cells[row][col].focus();
    this._cells[row][col].setAttribute('tabindex', '0');
  }

  _deselect() {
    if (this._selectedSquare) {
      const { row, col } = this._squareCoords(this._selectedSquare);
      this._cells[row][col].setAttribute('tabindex', '-1');
    }
    this._selectedSquare = null;
    this._legalMoves = [];
    this._legalSquares = new Set();
    this._clearHighlights();
    this._applyHighlights();
  }

  _executeMove(from, to) {
    // Check for promotion
    let promotion = 'q';
    const piece = this._game.pieceAt(from);
    if (piece && piece.type === 'p') {
      const toRank = parseInt(to[1]);
      if ((piece.color === 'w' && toRank === 8) || (piece.color === 'b' && toRank === 1)) {
        // Auto-promote to queen (could add UI for choice later)
        promotion = 'q';
      }
    }

    // Record last move before making it
    this._lastMoveFrom = from;
    this._lastMoveTo = to;

    // Clear selection
    this._deselect();

    // Notify callback
    if (this._moveCallback) {
      this._moveCallback({ from, to, promotion });
    }
  }

  /** Called after the game state changes externally (computer move, undo, etc.) */
  syncFromGame() {
    this._deselect();
    // Track last move from history
    const history = this._game.history;
    if (history.length > 0) {
      const last = history[history.length - 1];
      this._lastMoveFrom = last.from;
      this._lastMoveTo = last.to;
    } else {
      this._lastMoveFrom = null;
      this._lastMoveTo = null;
    }
    this._clearHighlights();
    this.update();
  }

  // ---- Keyboard Navigation ----

  _onKeyDown(e) {
    // Only handle board-level keys
    const key = e.key;
    let handled = true;

    switch (key) {
      case 'ArrowUp':
        this._moveFocus(1, 0);
        break;
      case 'ArrowDown':
        this._moveFocus(-1, 0);
        break;
      case 'ArrowLeft':
        this._moveFocus(0, -1);
        break;
      case 'ArrowRight':
        this._moveFocus(0, 1);
        break;
      case 'Enter':
      case ' ':
        this._onEnterPress();
        break;
      case 'Escape':
        this._deselect();
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
    }
  }

  _moveFocus(dRow, dCol) {
    const { row, col } = this._squareCoords(this._focusedSquare);
    const newRow = Math.max(0, Math.min(7, row + dRow));
    const newCol = Math.max(0, Math.min(7, col + dCol));
    this._focusedSquare = this._squareName(newRow, newCol);
    this._cells[newRow][newCol].focus();
  }

  _onEnterPress() {
    const square = this._focusedSquare;
    if (!square) return;
    this._handleSquareInteraction(square);
  }

  // ---- Drag & Drop ----

  _onDragStart(e) {
    if (this._game.isGameOver || this._game.turn !== 'w') return;

    const squareEl = this._getSquareElement(e);
    if (!squareEl) return;
    const square = squareEl.getAttribute('data-square');
    if (!square || !this._game.isMyPiece(square)) return;

    // Prevent default for touch
    if (e.type === 'touchstart') e.preventDefault();

    this._dragging = {
      square,
      startX: e.touches ? e.touches[0].clientX : e.clientX,
      startY: e.touches ? e.touches[0].clientY : e.clientY,
      moved: false,
    };
    this._selectSquare(square);
  }

  _onDragMove(e) {
    if (!this._dragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - this._dragging.startX;
    const dy = clientY - this._dragging.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this._dragging.moved = true;
      if (e.type === 'touchmove') e.preventDefault();
    }
  }

  _onDragEnd(e) {
    if (!this._dragging) return;

    if (this._dragging.moved) {
      // Find the square under the cursor
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      const el = document.elementFromPoint(clientX, clientY);
      if (el) {
        const squareEl = el.closest('.square');
        if (squareEl) {
          const toSquare = squareEl.getAttribute('data-square');
          if (toSquare && this._legalSquares.has(toSquare)) {
            this._executeMove(this._dragging.square, toSquare);
            this._dragging = null;
            return;
          }
        }
      }
    }

    this._dragging = null;
  }
}
