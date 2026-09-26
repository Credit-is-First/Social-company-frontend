/**
 * Fixes "Uncaught ReferenceError: process is not defined" in the dev server's
 * error overlay.
 *
 * react-error-overlay 6.0.10+ (installed: 6.1.0) runs part of its bundle inside
 * an iframe that has no `process` global, and its bundled colour-support check
 * reads `process.platform` unguarded. CRA 4 expects 6.0.9, where this does not
 * happen, but the project is offline and cannot install it, so this guards the
 * one unguarded read instead.
 *
 * Idempotent: safe to run on every install. Runs from `postinstall`.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../node_modules/react-error-overlay/lib/index.js');
const UNGUARDED = '"win32"===process.platform';
const GUARDED = '"win32"===("undefined"!==typeof process&&process.platform)';

if (!fs.existsSync(file)) {
  console.log('react-error-overlay not installed; nothing to fix');
  process.exit(0);
}

const source = fs.readFileSync(file, 'utf8');

if (source.indexOf(GUARDED) !== -1) {
  console.log('react-error-overlay already fixed');
} else if (source.indexOf(UNGUARDED) === -1) {
  // A different version without this code: nothing to patch, but say so.
  console.warn('react-error-overlay: expected code not found; left unchanged');
} else {
  fs.writeFileSync(file, source.split(UNGUARDED).join(GUARDED));
  console.log('Fixed react-error-overlay "process is not defined"');
}
