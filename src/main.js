/**
 * main.js — Application entry point.
 * Orchestrates game state, board UI, computer player, and UI components.
 */
import '@fontsource/anton';
import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/700.css';
import './style.css';

import { ChessGame } from './game/chessGame.js';
import { ChessboardUI } from './ui/board.js';
import { ComputerPlayer } from './game/computerPlayer.js';
import { StatusDisplay } from './ui/statusDisplay.js';
import { MoveList } from './ui/moveList.js';
import { Controls } from './ui/controls.js';

// ---- DOM references ----
const loadingScreen = document.getElementById('loading-screen');
const gameScreen = document.getElementById('game-screen');
const statusBar = document.getElementById('status-bar');
const statusMessage = document.getElementById('status-message');
const moveListContainer = document.getElementById('move-list');
const controlsContainer = document.getElementById('controls');
const chessboardContainer = document.getElementById('chessboard');
const engineStatusEl = document.getElementById('engine-status');
const keyboardHelp = document.getElementById('keyboard-help');
const panelToggle = document.getElementById('panel-toggle');
const sidePanel = document.getElementById('side-panel');
const keyboardHelpClose = document.getElementById('keyboard-help-close');

// ---- Core instances ----
const game = new ChessGame();
const board = new ChessboardUI(chessboardContainer, game);
const computer = new ComputerPlayer(game);
const status = new StatusDisplay(statusBar, statusMessage, game);
const moveList = new MoveList(moveListContainer, game);
const controls = new Controls(controlsContainer, game, board, computer);

// ---- State ----
let computerThinking = false;

// ---- Toast notifications ----
let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

function showToast(message, type = '') {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast${type ? ` toast--${type}` : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
    if (container.children.length === 0) {
      container.remove();
      toastContainer = null;
    }
  }, 3000);
}

// ---- Engine status (safe DOM construction — NO innerHTML) ----
// Reuse a single <span> child for the status indicator to avoid DOM churn.
let _engineSpan = null;

function updateEngineStatus(statusObj) {
  const { status: s, message } = statusObj;
  let indicatorClass = 'engine-indicator';
  switch (s) {
    case 'loading':
      indicatorClass += ' engine-indicator--loading';
      break;
    case 'ready':
      indicatorClass += ' engine-indicator--ready';
      break;
    case 'thinking':
      indicatorClass += ' engine-indicator--thinking';
      break;
    case 'error':
      indicatorClass += ' engine-indicator--error';
      break;
  }

  // Build safely with text nodes — zero HTML interpolation
  if (!_engineSpan) {
    // First call: construct the initial DOM
    engineStatusEl.textContent = ''; // clear any initial HTML content
    engineStatusEl.appendChild(document.createTextNode('Engine: '));
    _engineSpan = document.createElement('span');
    engineStatusEl.appendChild(_engineSpan);
  }
  _engineSpan.className = indicatorClass;
  _engineSpan.textContent = message;
}

computer.onStatusChange(updateEngineStatus);

// ---- Board interaction -> human move ----
board.onMove(async (move) => {
  if (computerThinking) return;
  if (game.isGameOver) return;

  // Execute human move
  const result = game.move(move.from, move.to, move.promotion);
  if (!result) {
    // Illegal move — shouldn't happen since we validate, but guard
    board.syncFromGame();
    return;
  }

  // Update UI after human move
  board.syncFromGame();
  moveList.update();
  status.update();
  controls.update();

  // Check if game ended after human move
  if (game.isGameOver) {
    status.update();
    controls.update();
    return;
  }

  // Now it's computer's turn
  await computerMove();
});

// ---- Computer move ----
async function computerMove() {
  if (game.isGameOver || game.turn !== 'b') return;

  computerThinking = true;
  controls.update();

  try {
    const result = await computer.makeMove();
    if (!result) {
      // No move returned — game might have ended
      board.syncFromGame();
      moveList.update();
      status.update();
      controls.update();
      return;
    }
  } catch (err) {
    console.error('Computer move error:', err);
    showToast('Computer engine error. Please try again.', 'error');
  } finally {
    computerThinking = false;
  }

  // Update UI after computer move
  board.syncFromGame();
  moveList.update();
  status.update();
  controls.update();

  if (game.isGameOver) {
    status.update();
  }
}

// ---- New Game ----
function newGame() {
  if (computerThinking) return;

  game.reset();
  computer.reset();
  board.syncFromGame();
  moveList.update();
  status.update();
  controls.update();
}

controls.onNewGame(newGame);

// ---- Undo ----
function undoMove() {
  if (computerThinking) return;
  if (game.moveCount < 2) return;

  // Undo both the computer's move and the human's move
  game.undoLastTwo();
  board.syncFromGame();
  moveList.update();
  status.update();
  controls.update();
}

controls.onUndo(undoMove);

// ---- Keyboard shortcuts ----
document.addEventListener('keydown', (e) => {
  // Don't handle if in an input or if a modifier is held
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  switch (e.key.toLowerCase()) {
    case 'n':
      e.preventDefault();
      newGame();
      break;
    case 'u':
      e.preventDefault();
      undoMove();
      break;
    case '?':
      e.preventDefault();
      keyboardHelp.classList.toggle('hidden');
      break;
    case 'escape':
      if (!keyboardHelp.classList.contains('hidden')) {
        keyboardHelp.classList.add('hidden');
      }
      break;
  }
});

// ---- Panel toggle ----
panelToggle.addEventListener('click', () => {
  sidePanel.classList.toggle('side-panel--collapsed');
});

keyboardHelpClose.addEventListener('click', () => {
  keyboardHelp.classList.add('hidden');
});

// ---- Initialization ----
async function init() {
  // Start loading the engine immediately
  updateEngineStatus({ status: 'loading', message: 'initializing…' });

  try {
    await computer.init();
  } catch (err) {
    console.error('Failed to initialize chess engine:', err);
    updateEngineStatus({ status: 'error', message: 'engine unavailable' });
    showToast(
      'Chess engine failed to load. The computer opponent may not work.',
      'error'
    );
    // Continue anyway — user can still interact with the board
  }

  // Show the game
  loadingScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');

  // Initial UI update
  board.update();
  status.update();
  moveList.update();
  controls.update();
}

// Start the app
init().catch((err) => {
  console.error('App initialization failed:', err);
  // Safe error display — no innerHTML
  loadingScreen.textContent = '';
  const errorP = document.createElement('p');
  errorP.style.cssText = 'color:#f87171;font-family:Rubik,sans-serif;';
  errorP.textContent = 'Failed to load. Please refresh the page.';
  loadingScreen.appendChild(errorP);
  loadingScreen.classList.remove('hidden');
});
