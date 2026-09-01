# Usage

After starting the development server (`npm run dev`), open your browser to `http://localhost:5173`.

## Interface
- **Chessboard**: The main playing area rendered by `board.js`. Drag and drop pieces to move.
- **Controls**: Buttons provided by `controls.js`:
  - **New Game**: Reset the board to the starting position.
  - **Undo**: Take back your last move and the computer's response.
  - **Flip Board**: Rotate the board to view from Black's side.
- **Move List**: A panel (`moveList.js`) displaying the game's move history.
- **Status Display**: A bar (`statusDisplay.js`) showing current turn, check, checkmate, or stalemate.

## Gameplay
- You always play as White; the computer plays as Black.
- Make your move by dragging a piece. The computer will respond automatically.
- The game ends when checkmate or stalemate occurs, as indicated by the status display.

## Computer Opponent
- The computer uses the Stockfish engine, running locally via WebAssembly.
- It is configured for grandmaster-level play by default. No additional configuration is needed.