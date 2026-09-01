#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Installing dependencies…"
npm install --no-audit --no-fund

echo "==> Setting up Stockfish engine…"
mkdir -p public/stockfish

STOCKFISH_FOUND=false

# Check for stockfish npm package already installed
if [ ! -d "node_modules/stockfish" ]; then
  echo "  -> Installing stockfish npm package…"
  npm install stockfish --no-save --no-audit --no-fund 2>/dev/null || true
fi

if [ -d "node_modules/stockfish/bin" ]; then
  # Use the lite-single variant (no SharedArrayBuffer/COOP/COEP needed, still grandmaster-level)
  for js_candidate in \
    "node_modules/stockfish/bin/stockfish-18-lite-single.js" \
    "node_modules/stockfish/bin/stockfish-18-lite.js" \
    "node_modules/stockfish/bin/stockfish.js" \
    "node_modules/stockfish/bin/stockfish-18.js"; do
    if [ -f "$js_candidate" ]; then
      cp "$js_candidate" public/stockfish/stockfish.js
      echo "  -> Copied stockfish.js from $js_candidate"
      STOCKFISH_FOUND=true
      break
    fi
  done

  for wasm_candidate in \
    "node_modules/stockfish/bin/stockfish-18-lite-single.wasm" \
    "node_modules/stockfish/bin/stockfish-18-lite.wasm" \
    "node_modules/stockfish/bin/stockfish.wasm" \
    "node_modules/stockfish/bin/stockfish-18.wasm"; do
    if [ -f "$wasm_candidate" ]; then
      cp "$wasm_candidate" public/stockfish/stockfish.wasm
      echo "  -> Copied stockfish.wasm from $wasm_candidate"
      break
    fi
  done
fi

# Fallback: if stockfish files not found, create stub
if [ "$STOCKFISH_FOUND" = false ]; then
  echo "  -> WARNING: Stockfish engine files not found. Creating graceful-degradation stub."
  cat > public/stockfish/stockfish.js << 'STUBEOF'
// Stockfish stub — engine not available.
self.onmessage = function(e) {
  var cmd = (e.data || '').trim();
  if (cmd === 'uci') {
    self.postMessage('uciok');
  } else if (cmd === 'isready') {
    self.postMessage('readyok');
  } else if (cmd.startsWith('go ')) {
    self.postMessage('bestmove (none)');
  }
};
STUBEOF
  touch public/stockfish/stockfish.wasm
fi

echo "==> Build check…"
npx vite build 2>&1 | tail -5

echo ""
echo "Setup complete."
echo "Run: npm run dev"
echo "Then open http://localhost:5173"
