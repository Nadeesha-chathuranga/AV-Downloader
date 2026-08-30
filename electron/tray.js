const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

function resolveTrayIcon() {
  const ico = path.join(__dirname, '..', 'buildResources', 'icon.ico');
  if (fs.existsSync(ico)) {
    const img = nativeImage.createFromPath(ico);
    if (!img.isEmpty()) {
      return process.platform === 'win32' ? img.resize({ width: 16, height: 16 }) : img;
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