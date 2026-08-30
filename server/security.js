// Shared concurrency helpers for the downloader routes.
//
// The app shells out to yt-dlp for user-supplied URLs. URL validation was
// removed (it caused false positives that blocked legitimate public downloads);
// this module now only provides a bounded, timeout-safe metadata probe.

const { exec } = require('child_process');
const { spawnYtDlp } = require('./binary');

// Shared concurrency limit for metadata probes (/info, /playlist, /formats).
// Each request spawns a fresh yt-dlp; without a cap a flurry of requests could
// fork hundreds of processes and exhaust memory.
const PROBE_SEMAPHORE_MAX = 2;
let probeActive = 0;
const probeWaiters = [];
const acquireProbeSlot = () =>
  new Promise((resolve) => {
    if (probeActive < PROBE_SEMAPHORE_MAX) {
      probeActive++;
      resolve();
    } else {
      probeWaiters.push(resolve);
    }
  });
const releaseProbeSlot = () => {
  probeActive--;
  const next = probeWaiters.shift();
  if (next) {
    probeActive++;
    next();
  }
};

// Run a yt-dlp metadata probe: spawn child, capture stdout/stderr, enforce a
// hard timeout, kill the child on timeout, and never leave it running when the
// HTTP request is abandoned. Returns { code, stdout, stderr, timedOut }.
async function runProbe(args, opts = {}) {
  const timeoutMs = opts.timeoutMs || 30000;
  await acquireProbeSlot();
  try {
    return await new Promise((resolve) => {
      let proc;
      try {
        proc = spawnYtDlp(args, { windowsHide: true });
      } catch (err) {
        return resolve({ code: -1, stdout: '', stderr: String(err && err.message || err), timedOut: false });
      }
      let stdout = '';
      let stderr = '';
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        // Kill the whole tree so yt-dlp's children don't linger.
        if (process.platform === 'win32') {
          // exec is delayed-required to avoid a circular import concern; use
          // the child's kill and a taskkill for the tree.
          const { exec } = require('child_process');
          exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
        } else {
          try { proc.kill('SIGKILL'); } catch {}
        }
        resolve({ code: -1, stdout, stderr: stderr || 'Probe timed out', timedOut: true });
      }, timeoutMs);

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve({ code: -1, stdout, stderr: String(err.message || err), timedOut: false });
      });
      proc.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve({ code, stdout, stderr, timedOut: false });
      });
    });
  } finally {
    releaseProbeSlot();
  }
}

module.exports = { runProbe };
