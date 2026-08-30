// Auto-update wiring. Installed builds check the GitHub Releases feed via
// electron-updater (feed config is baked into app-update.yml from the
// `publish` block in electron-builder.yml). While the AV-Downloader repo is
// PRIVATE the update check cannot authenticate anonymously, so it fails
// silently and no update is offered; the code activates automatically the
// moment the repo is made public. Never runs in development.

const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

function initUpdater(getWindow) {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  let informed = false;
  autoUpdater.on('update-downloaded', (info) => {
    if (informed) return;
    informed = true;
    const win = getWindow();
    const options = {
      type: 'info',
      title: 'Update ready',
      message: `AV Downloader ${info ? info.version : ''} has been downloaded.`,
      detail: 'Restart the app now to install the update.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    };
    const show = win
      ? dialog.showMessageBox(win, options)
      : dialog.showMessageBox(options);
    show.then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(
    () => autoUpdater.checkForUpdates().catch(() => {}),
    30 * 60 * 1000
  );
}

module.exports = { initUpdater };