const { Menu } = require('electron');

function installContextMenu(win) {
  win.webContents.on('context-menu', (_event, params) => {
    const can = params.editFlags || {};
    const template = [];

    if (params.isEditable) {
      if (can.canCut) template.push({ role: 'cut' });
      if (can.canCopy) template.push({ role: 'copy' });
      if (can.canPaste) template.push({ role: 'paste' });
      if (can.canDelete) template.push({ role: 'delete' });
      if (template.length > 0 && can.canSelectAll) template.push({ type: 'separator' });
      if (can.canSelectAll) template.push({ role: 'selectAll' });
    } else if (params.selectionText && params.selectionText.trim().length > 0) {
      template.push({ role: 'copy' });
    }

    if (template.length === 0) return;

    Menu.buildFromTemplate(template).popup({ window: win });
  });
}

module.exports = { installContextMenu };