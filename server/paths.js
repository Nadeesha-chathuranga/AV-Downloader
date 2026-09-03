const path = require('path');

const dataDir = () => process.env.SEAL_DATA_DIR || path.join(__dirname, '..');
const CONFIG_PATH = () => path.join(dataDir(), 'config.json');

module.exports = { dataDir, CONFIG_PATH };