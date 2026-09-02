const { app, BrowserWindow, shell, clipboard, ipcMain } = require('electron');
const path = require('path');
const net = require('net');
const http = require('http');
const fs = require('fs-extra');
const { createTray } = require('./tray');
const { ensureBinaries } = require('./binary-downloader');
const { initUpdater } = require('./updater');
const { installContextMenu } = require('./contextMenu');
const {
  findDeepLink,
  registerProtocol,
  installDeepLinkHandlers,
} = require('./deepLink');
const { ClipboardWatcher } = require('./clipboardWatcher');

let mainWindow = null;
let tray = null;
let appPort = null;
let quitting = false;
// Most recent media URL handed to the app via avdownloader:// link or the
// clipboard watcher. Served once to the renderer on mount (see IPC below).
let lastSharedUrl = null;

// Give the app its product name so userData resolves to
// %APPDATA%\AV Downloader (not the package.json `name`).
app.setName('AV Downloader');

// Register avdownloader:// so sharing a link opens the app (installed builds
// also register it via electron-builder's `protocols` in electron-builder.yml).
registerProtocol();

// Polls the clipboard for freshly copied links ("Share -> Copy link" path).
const clipboardWatcher = new ClipboardWatcher();

function pushDeepLink(url) {
  if (!url) return;
  lastSharedUrl = url;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('deep-link', url);
  }
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

// --- Single instance ------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  installDeepLinkHandlers({
    getWindow: () => mainWindow,
    onDeepLink: pushDeepLink,
  });

  app.on('before-quit', () => {
    quitting = true;
  });

  app.whenReady().then(() => {
    main();
  });
}

// --- Utilities ------------------------------------------------------
// Chromium refuses to load URLs on restricted "unsafe" ports (IRC, SMTP,
// echo, etc.). The embedded server must never bind one, or the app would
// fail to load with ERR_UNSAFE_PORT after the splash.
const UNSAFE_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69,
  77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119,
  123, 135, 137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515,
  526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990,
  993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 5061, 6000, 6566,
  6665, 6666, 6667, 6668, 6669, 6697, 10080,
]);

function findFreePort(attempts = 10) {
  return new Promise((resolve, reject) => {
    const tryBind = (remaining) => {
      const srv = net.createServer();
      srv.on('error', reject);
      srv.listen(0, '127.0.0.1', () => {
        const port = srv.address().port;
        srv.close(() => {
          if (UNSAFE_PORTS.has(port) || port < 1024) {
            if (remaining > 0) return tryBind(remaining - 1);
            return reject(new Error(`No safe port available after retries (last: ${port})`));
          }
          resolve(port);
        });
      });
    };
    tryBind(attempts);
  });
}

function waitForServer(port, tries = 100) {
  return new Promise((resolve) => {
    const attempt = (n) => {
      if (n >= tries) return resolve(false);
      const req = http.get(
        { host: '127.0.0.1', port, path: '/api/formats/quality-presets', timeout: 2000 },
        (res) => {
          res.resume();
          if (res.statusCode === 200) return resolve(true);
          setTimeout(() => attempt(n + 1), 150);
        }
      );
      req.on('error', () => setTimeout(() => attempt(n + 1), 150));
      req.on('timeout', () => {
        req.destroy();
        setTimeout(() => attempt(n + 1), 150);
      });
    };
    attempt(0);
  });
}

// --- Main flow ------------------------------------------------------
async function main() {
  app.setAppUserModelId(app.isPackaged ? 'com.avdownloader.app' : 'com.avdownloader.dev');

  appPort = await findFreePort();
  process.env.PORT = String(appPort);
  process.env.NODE_ENV = 'production';
  process.env.SEAL_DATA_DIR = app.getPath('userData');

  // A deep link may arrive on the command line when the app is launched
  // cold (e.g. a browser "Open AV Downloader?" prompt). Hand it to the
  // renderer once it mounts; the clipboard watcher stays active meanwhile.
  lastSharedUrl = findDeepLink(process.argv) || lastSharedUrl;
  clipboardWatcher.setHandler((url) => {
    showMainWindow();
    pushDeepLink(url);
  });
  clipboardWatcher.setEnabled(true);

  const builtApp = path.join(__dirname, '..', 'client', 'dist', 'index.html');
  if (!fs.existsSync(builtApp)) {
    showError('App build not found. Run "npm run build" before launching the desktop app.');
    return;
  }

  createWindow();
  await waitForSplash();

  // Prepare yt-dlp/ffmpeg/deno before the app loads so no download can start
  // without the binaries. Progress streams to the splash window.
  const binResult = await ensureBinaries(path.join(app.getPath('userData'), 'bin'), (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bin-status', status);
    }
  });
  if (!binResult.ok) {
    showError(`Could not prepare yt-dlp/ffmpeg — check your internet connection and restart.\n\n${binResult.error || ''}`);
    return;
  }
  process.env.YTDLP_PATH = binResult.ytdlpPath;
  process.env.FFMPEG_DIR = binResult.ffmpegDir;

  // Boot the embedded server (listens on appPort immediately on require).
  try {
    require('../server/index.js');
  } catch (err) {
    console.error('[MAIN] Failed to start embedded server:', err);
    showError('Failed to start the embedded server.');
    return;
  }

  const ready = await waitForServer(appPort);
  if (!ready) {
    showError('The embedded server did not start in time.');
    return;
  }

  loadApp();
  initUpdater(() => mainWindow);
}

function waitForSplash() {
  return new Promise((resolve) => {
    if (mainWindow && mainWindow.webContents) {
      if (mainWindow.webContents.isLoading()) {
        mainWindow.webContents.once('did-finish-load', () => setTimeout(resolve, 250));
      } else {
        setTimeout(resolve, 250);
      }
    } else {
      resolve();
    }
  });
}

function loadApp() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.loadURL(`http://127.0.0.1:${appPort}`);
  mainWindow.show();
}

function showError(message) {
  const win = mainWindow || createWindow();
  win.loadFile(path.join(__dirname, 'loading.html'));
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('bin-status', { status: 'error', message });
  });
  win.show();
}

// --- Window ---------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'AV Downloader',
    icon: path.join(__dirname, '..', 'buildResources', 'icon.ico'),
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  installContextMenu(mainWindow);

  // Close-to-tray behaviour.
  mainWindow.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// --- IPC ------------------------------------------------------------
ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('clipboard-read-text', () => clipboard.readText());
ipcMain.handle('get-pending-deep-link', () => {
  const url = lastSharedUrl;
  lastSharedUrl = null;
  return url;
});
ipcMain.handle('shell-open-external', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    return shell.openExternal(url);
  }
});

// Clipboard-watch toggle synced from Settings (renderer pushes on mount and
// on change). Defaults to enabled; the renderer applies the stored pref.
ipcMain.on('set-clipboard-watch', (_event, enabled) => {
  clipboardWatcher.setEnabled(Boolean(enabled));
});

// --- Tray -----------------------------------------------------------
app.whenReady().then(() => {
  tray = createTray({
    show: () => {
      if (!mainWindow) { loadApp(); return; }
      mainWindow.show();
      mainWindow.focus();
    },
    quit: () => {
      quitting = true;
      app.quit();
    },
  });
});