const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

function resolveTrayIcon() {
  // electron/tray.png ships inside the asar, so it works on installed builds.
  const candidates = [
    path.join(__dirname, 'tray.png'),
    path.join(__dirname, '..', 'buildResources', 'icon.ico'),
  ];
  for (const src of candidates) {
    if (fs.existsSync(src)) {
      const img = nativeImage.createFromPath(src);
      if (!img.isEmpty()) {
        return process.platform === 'win32'
          ? img.resize({ width: 16, height: 16 })
          : img;
      }
    }
  }
  return nativeImage.createEmpty();
}

function createTray({ show, quit }) {
  let tray;
  try {
    tray = new Tray(resolveTrayIcon());
  } catch (e) {
    console.error('[TRAY] Unable to create tray icon:', e.message);
    return null;
  }

  tray.setToolTip('AV Downloader');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show AV Downloader', click: () => show() },
      { type: 'separator' },
      { label: 'Quit', click: () => quit() },
    ])
  );
  tray.on('double-click', () => show());
  return tray;
}

module.exports = { createTray, resolveTrayIcon };