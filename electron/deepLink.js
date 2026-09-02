const { app } = require('electron');
const path = require('path');

const SCHEME = 'avdownloader';

// Extracts the target media URL from a raw command-line argument such as
// avdownloader://add?url=<encoded>. Returns null when the link is unknown,
// malformed, or carries no `url` query value.
function parseDeepLink(arg) {
  if (typeof arg !== 'string' || !arg.startsWith(`${SCHEME}://`)) return null;
  try {
    const u = new URL(arg);
    if (u.hostname && u.hostname !== 'add') return null;
    const target = u.searchParams.get('url');
    return target && target.trim() ? target.trim() : null;
  } catch {
    return null;
  }
}

// Builds an avdownloader://add?url=... link for a given media URL.
function createDeepLinkUrl(target) {
  return `${SCHEME}://add?url=${encodeURIComponent(target)}`;
}

// Registers the scheme. In development the app runs via electron.exe so the
// entry script must be passed explicitly; packaged builds register the exe.
function registerProtocol() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(SCHEME, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(SCHEME);
  }
}

// Finds the first deep-link arg in a command-line array (used for both the
// cold-start process.argv and the second-instance commandLine).
function findDeepLink(argv) {
  if (!Array.isArray(argv)) return null;
  for (const arg of argv) {
    const target = parseDeepLink(arg);
    if (target) return target;
  }
  return null;
}

// Routes warm-start deep links to the running app: brings the window back
// (restoring from tray/minimize) and forwards the media URL to the renderer.
function installDeepLinkHandlers({ getWindow, onDeepLink }) {
  app.on('second-instance', (_event, commandLine) => {
    const target = findDeepLink(commandLine);
    const win = getWindow();
    if (target && win) {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.focus();
      onDeepLink(target);
    } else if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
}

module.exports = {
  SCHEME,
  parseDeepLink,
  createDeepLinkUrl,
  registerProtocol,
  findDeepLink,
  installDeepLinkHandlers,
};