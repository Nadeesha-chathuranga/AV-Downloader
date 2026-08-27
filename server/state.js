const path = require('path');
const fs = require('fs-extra');

const STATE_PATH = path.join(__dirname, 'state.json');
const STATE_TMP_PATH = STATE_PATH + '.tmp';

const serializeJob = (job) => {
  const info = job.info || {};
  const serialized = {
    id: job.id,
    url: job.url,
    args: job.args,
    downloadsDir: job.downloadsDir,
    filename: info.filename || job.filename || '',
    playlistId: info.playlistId || job.playlistId || undefined,
    playlistIndex: info.playlistIndex ?? job.playlistIndex,
    playlistTotal: info.playlistTotal ?? job.playlistTotal,
    startedAt: job.startedAt || Date.now(),
  };
  if (job.status) serialized.status = job.status;
  return serialized;
};

const persist = (queuedJobs, activeJobs, resumableJobs = []) => {
  const payload = {
    version: 2,
    updatedAt: new Date().toISOString(),
    queued: queuedJobs.map(serializeJob),
    active: activeJobs.map(serializeJob),
    resumable: resumableJobs.map(serializeJob),
  };
  fs.writeJsonSync(STATE_TMP_PATH, payload, { spaces: 2 });
  fs.moveSync(STATE_TMP_PATH, STATE_PATH, { overwrite: true });
};

const load = () => {
  const empty = { queued: [], active: [], resumable: [] };
  try {
    if (fs.existsSync(STATE_PATH)) {
      const data = fs.readJsonSync(STATE_PATH);
      if (data) {
        return {
          queued: Array.isArray(data.queued) ? data.queued : [],
          active: Array.isArray(data.active) ? data.active : [],
          resumable: Array.isArray(data.resumable) ? data.resumable : [],
        };
      }
    }
  } catch (e) {}
  return empty;
};

const clear = () => {
  fs.removeSync(STATE_PATH);
  fs.removeSync(STATE_TMP_PATH);
};

module.exports = { persist, load, clear, STATE_PATH };
