const path = require('path');

const dataDir = () => process.env.SEAL_DATA_DIR || path.join(__dirname, '..');

module.exports = { dataDir };