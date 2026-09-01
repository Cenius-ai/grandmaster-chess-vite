# Installation

## 1. Prerequisites
- Node.js 20 or later

## 2. Obtain the Source Code
Download the project source code (e.g., clone the repository).

## 3. Install Stockfish Engine
Run the included installation script to download and prepare the Stockfish engine:
```bash
./install.sh
```

## 4. Install Dependencies
```bash
npm install
```

## 5. Environment Variables
Copy the example environment file and adjust if needed:
```bash
cp .env.example .env
```
The file contains `PORT` (not required for `npm run dev`) and `STOCKFISH_FOUND` (set automatically by `install.sh`).

## 6. Start Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

## 7. Production Build
```bash
npm run build
```
The output will be in the `dist/` directory.

## 8. Troubleshooting
- **Node.js version**: Ensure you are using Node.js 20 or later. Check with `node --version`.
- **Port conflict**: If port 5173 is in use, modify `vite.config.js` or use the `--port` flag in `package.json`.
- **Stockfish not loaded**: Verify that `install.sh` completed successfully and that `public/stockfish/stockfish.js` and `public/stockfish/stockfish.wasm` exist.