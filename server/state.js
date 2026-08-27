const path = require('path');
const fs = require('fs-extra');

const STATE_PATH = path.join(__dirname, 'state.json');
const STATE_TMP_PATH = STATE_PATH + '.tmp';

const serializeJob = (job) => {
  const info = job.info || {};
  return {
    id: job.id,
    url: job.url,
    args: job.args,
    downloadsDir: job.downloadsDir,
    filename: info.filename || '',
    playlistId: info.playlistId || undefined,
    playlistIndex: info.playlistIndex,
    playlistTotal: info.playlistTotal,
    startedAt: job.startedAt || Date.now(),
  };
};

const persist = (queuedJobs, activeJobs) => {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    queued: queuedJobs.map(serializeJob),
    active: activeJobs.map(serializeJob),
  };
  fs.writeJsonSync(STATE_TMP_PATH, payload, { spaces: 2 });
  fs.moveSync(STATE_TMP_PATH, STATE_PATH, { overwrite: true });
};

const load = () => {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const data = fs.readJsonSync(STATE_PATH);
      if (data && Array.isArray(data.queued) && Array.isArray(data.active)) {
        return { queued: data.queued, active: data.active };
      }
    }
  } catch (e) {}
  return { queued: [], active: [] };
};

const clear = () => {
  fs.removeSync(STATE_PATH);
  fs.removeSync(STATE_TMP_PATH);
};

module.exports = { persist, load, clear, STATE_PATH };
