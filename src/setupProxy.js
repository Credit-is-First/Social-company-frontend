// Dev server only (Create React App loads this file itself; it is not bundled).
//
// The "proxy" field in package.json forwards API calls to the backend, but not
// WebSocket upgrades: it only proxies requests whose Accept header rules out
// HTML, and an upgrade request has no Accept header. Without this, socket.io
// would still work but stay on HTTP long-polling instead of a WebSocket.
const proxy = require('http-proxy-middleware');
const { proxy: backend } = require('../package.json');

module.exports = function setupProxy(app) {
  app.use(proxy('/socket.io', { target: backend, ws: true, logLevel: 'warn' }));
};
