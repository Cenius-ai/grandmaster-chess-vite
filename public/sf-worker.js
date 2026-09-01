/**
 * sf-worker.js — Web Worker wrapper for Stockfish engine.
 * Loads stockfish.js via importScripts and bridges UCI communication
 * between the engine (stdout via console.log) and the main thread (postMessage).
 */

// Intercept console.log BEFORE stockfish loads so UCI output reaches main thread
(function () {
  var origLog = console.log;
  var origWarn = console.warn;

  console.log = function () {
    var line = Array.prototype.join.call(arguments, ' ');
    if (line) self.postMessage(line);
    origLog.apply(console, arguments);
  };

  console.warn = function () {
    var line = Array.prototype.join.call(arguments, ' ');
    if (line) self.postMessage(line);
    origWarn.apply(console, arguments);
  };
})();

// Load the stockfish engine (synchronous)
importScripts('stockfish.js');

// The engine is now initialized. It reads stdin via the emscripten worker
// message handler already set up by stockfish.js, and stdout via our
// overridden console.log above.
//
// Messages from the main thread (UCI commands) are handled by stockfish's
// built-in emscripten onmessage handler.
