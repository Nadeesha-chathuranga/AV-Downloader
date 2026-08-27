const path = require('path');
const fs = require('fs-extra');

const CONFIG_PATH = path.join(__dirname, 'config.json');

const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) return fs.readJsonSync(CONFIG_PATH);
  } catch (e) {}
  return {};
};

const getCookieArgs = () => {
  const config = loadConfig();
  if (config.cookieFilePath) {
    return ['--cookies', config.cookieFilePath];
  } else if (config.cookieBrowser) {
    return ['--cookies-from-browser', config.cookieBrowser];
  }
  return [];
};

module.exports = { loadConfig, getCookieArgs };
