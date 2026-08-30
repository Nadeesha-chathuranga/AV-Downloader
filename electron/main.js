const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const net = require('net');
const http = require('http');
const fs = require('fs-extra');
const { createTray } = require('./tray');
const { ensureBinaries } = require('./binary-downloader');
const { initUpdater } = require('./updater');

let mainWindow = null;
let tray = null;
let appPort = null;
let quitting = false;

// Give the app its product name so userData resolves to
// %APPDATA%\AV Downloader (not the package.json `name`).
app.setName('AV Downloader');

// --- Single instance ------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('before-quit', () => {
    quitting = true;
  });

  app.whenReady().then(() => {
    main();
  });
}

// --- Utilities ------------------------------------------------------
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
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
  app.setAppUserModelId('com.avdownloader.app');

  appPort = await findFreePort();
  process.env.PORT = String(appPort);
  process.env.NODE_ENV = 'production';
  process.env.SEAL_DATA_DIR = app.getPath('userData');

  const builtApp = path.join(__dirname, '..', 'client', 'dist', 'index.html');
  if (!fs.existsSync(builtApp)) {
    showError('App build not found. Run "npm run build" before launching the desktop app.');
    return;
  }

  createWindow();
  await waitForSplash();

  // Prepare yt-dlp/ffmpeg before the app loads so no download can start
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
ipcMain.handle('shell-open-external', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    return shell.openExternal(url);
  }
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