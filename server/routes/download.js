const express = require('express');
const { spawn, exec, execSync, spawnSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const router = express.Router();
const state = require('../state');

const DOWNLOAD_FOLDER = 'Seal downloads';
const VIDEO_SUBFOLDER = 'Video';
const AUDIO_SUBFOLDER = 'Audio';

const DANGEROUS_FLAGS = [
  '--rm', '--exec', '--run', '--power-shell',
  '--batch-file', '--delete',
];

const CONFIG_PATH = path.join(__dirname, '../config.json');

const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) return fs.readJsonSync(CONFIG_PATH);
  } catch (e) {}
  return { maxConcurrentDownloads: 3, downloadSpeedLimit: 0 };
};

const saveConfig = (config) => {
  fs.writeJsonSync(CONFIG_PATH, config, { spaces: 2 });
};

const getDownloadsDir = () => {
  const config = loadConfig();
  if (config.downloadsDir && config.downloadsDir.trim()) {
    return config.downloadsDir.trim();
  }
  return path.join(os.homedir(), 'Downloads', DOWNLOAD_FOLDER);
};

const getOutDir = (audioOnly) => {
  return path.join(getDownloadsDir(), audioOnly ? AUDIO_SUBFOLDER : VIDEO_SUBFOLDER);
};

const sizeToBytes = (s) => {
  const m = /^([\d.]+)\s*([KMG]i?B|B)$/i.exec((s || '').trim());
  if (!m) return null;
  const value = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  const mult = {
    B: 1,
    KB: 1024, KIB: 1024,
    MB: 1024 ** 2, MIB: 1024 ** 2,
    GB: 1024 ** 3, GIB: 1024 ** 3,
  }[unit];
  return mult ? Math.round(value * mult) : null;
};

const bytesToSize = (bytes) => {
  if (bytes == null || bytes < 0) return null;
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
  return `${v.toFixed(v >= 10 || u === 0 ? 0 : 2)} ${units[u]}`;
};

// Estimated bitrate (bps) used to predict the size of the final re-encoded
// audio file before we download it. yt-dlp only reports the size of the
// SOURCE stream while downloading, so for audio-only jobs we estimate the
// output size up front. It is corrected to the real file size on completion.
const AUDIO_FORMAT_BITRATE_BPS = {
  mp3: 192000,
  m4a: 192000,
  ogg: 192000,
  wav: 1411200, // ~44.1kHz / 16-bit / stereo
  flac: 900000,
};

// Estimate the size of the final re-encoded audio file before download.
// probedAbr is yt-dlp's average audio bitrate in kilobits per second (kbps).
const estimateAudioSize = (format, durationSeconds, probedAbrKbps) => {
  if (!durationSeconds || durationSeconds <= 0) return null;
  // Prefer the content's real average audio bitrate — the final file for both
  // lossy re-encodes and lossless/FLAC/WAV outputs tracks it closely. Falls
  // back to a per-format default only when the probe couldn't report a rate.
  let bps = probedAbrKbps && probedAbrKbps > 0 ? Math.round(probedAbrKbps * 1000) : undefined;
  if (!bps) {
    bps = AUDIO_FORMAT_BITRATE_BPS[format] || 160000;
  }
  return Math.round((bps * durationSeconds) / 8);
};

// Probe a URL for the duration (seconds) and average audio bitrate (KILO-bits
// per second, as reported by yt-dlp's %(abr)s) WITHOUT downloading anything,
// so we can estimate the final audio file size. Uses the same cookies/headers
// as the real download so it succeeds for the same (age-restricted / login)
// content the user is actually trying to grab.
const probeAudioMetadata = (url) => {
  const args = [
    '--no-playlist', '--no-warnings', '--quiet',
    '--print', '%(duration)s',
    '--print', '%(abr)s',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    '--add-header', 'Accept-Language:en-US,en;q=0.9',
  ];
  const config = loadConfig();
  if (config.cookieFilePath) {
    args.push('--cookies', config.cookieFilePath);
  } else if (config.cookieBrowser) {
    args.push('--cookies-from-browser', config.cookieBrowser);
  }
  args.push(url);

  try {
    const result = spawnSync('yt-dlp', args, {
      encoding: 'utf8', timeout: 15000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const output = (result.stdout || '') + (result.stderr || '');
    const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const duration = parseInt(lines[0], 10);
    const abr = parseFloat(lines[1]);
    return { duration: Number.isNaN(duration) ? 0 : duration, abr: Number.isNaN(abr) ? 0 : abr };
  } catch {
    return { duration: 0, abr: 0 };
  }
};

const parseCustomArgs = (argString) => {
  if (!argString || !argString.trim()) return [];
  const tokens = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  for (let i = 0; i < argString.length; i++) {
    const ch = argString[i];
    if (inQuote) {
      if (ch === quoteChar) { inQuote = false; continue; }
      current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (current) { tokens.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
};

const validateCustomArgs = (argString) => {
  const flagged = argString.match(/--[a-zA-Z-]+/g) || [];
  for (const flag of flagged) {
    if (DANGEROUS_FLAGS.includes(flag.toLowerCase())) {
      return { valid: false, error: `Blocked dangerous flag: ${flag}` };
    }
  }
  if (/[;&|`$]/.test(argString)) {
    return { valid: false, error: 'Shell characters are not allowed' };
  }
  return { valid: true };
};

// --- Queue State ---
const activeProcesses = new Map();   // downloadId -> ChildProcess
const queue = [];                     // { id, url, args, downloadsDir, io, info }
const resumable = [];                 // failed/interrupted jobs that can be resumed
let activeCount = 0;

// Persist queue + active + resumable jobs to disk so they survive a server restart.
const saveState = () => {
  try {
    const activeJobs = [];
    for (const proc of activeProcesses.values()) {
      activeJobs.push({ ...proc.job, startedAt: proc.startedAt });
    }
    state.persist(queue, activeJobs, resumable);
  } catch (e) {
    console.error('[STATE] Failed to persist state:', e.message);
  }
};

const removeFromResumable = (id) => {
  const idx = resumable.findIndex((j) => j.id === id);
  if (idx !== -1) {
    resumable.splice(idx, 1);
    return true;
  }
  return false;
};

// Remove every partial/output file belonging to a cancelled job.
// For the job's outDir this deletes:
//   - the exact final filename (if known)
//   - any `<name>.part` / `<name>.ytdl` variants of that filename
//   - any fresh `.part`/`.ytdl` files created after the job started
//     (handles the case where the Destination filename was never parsed yet,
//      while never touching other concurrent downloads in the same folder)
const cleanupCancelledFiles = async (job) => {
  if (!job) return;
  const outDir = job.outDir || getOutDir(false);
  let entries;
  try {
    entries = await fs.readdir(outDir, { withFileTypes: true });
  } catch {
    return; // folder missing/removed — nothing to clean
  }

  const startedAt = job.startedAt || 0;
  const knownName = (job.info && job.info.filename) || '';
  const expected = knownName
    ? new Set([knownName, knownName + '.part', knownName + '.ytdl'])
    : null;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    const lower = name.toLowerCase();

    const isPartVariant = lower.endsWith('.part') || lower.endsWith('.ytdl');

    if (expected && expected.has(name)) {
      // Exact known filename or its .part/.ytdl variant — always safe to remove.
      try { await fs.remove(path.join(outDir, name)); } catch {}
      continue;
    }

    if (isPartVariant && startedAt) {
      // Fresh partial remnant for an unknown filename. Only remove if it was
      // created at/after this job started, and never the final output file.
      try {
        const stats = await fs.stat(path.join(outDir, name));
        if (!stats.isFile()) continue;
        if (stats.mtimeMs + 500 >= startedAt) {
          await fs.remove(path.join(outDir, name));
        }
      } catch {}
    }
  }
};

// Rehydrate on server boot: requeue pending jobs and resume interrupted downloads.
const rehydrate = (io) => {
  const { queued, active, resumable: persistedResumable } = state.load();
  const restored = [];

  queued.forEach((job) => {
    queue.push({ ...job, io });
    restored.push({ type: 'queued', id: job.id, url: job.url, playlistId: job.playlistId, filename: job.filename });
  });

  active.forEach((job) => {
    const info = {
      id: job.id, url: job.url, status: 'resuming', progress: 0, filename: job.filename || '',
      error: null, stderr: '', playlistId: job.playlistId, playlistIndex: job.playlistIndex,
      playlistTotal: job.playlistTotal, totalSize: '', speed: '', eta: '', downloadedSize: '',
    };
    restored.push({ type: 'active', id: job.id, url: job.url, playlistId: job.playlistId, filename: job.filename });
    const fullJob = { id: job.id, url: job.url, args: job.args, downloadsDir: job.downloadsDir, outDir: job.outDir, io, info, startedAt: job.startedAt };
    if (activeCount < loadConfig().maxConcurrentDownloads) {
      activeCount++;
      startDownload(fullJob);
    } else {
      queue.push(fullJob);
    }
  });

  // Failed/interrupted jobs are re-exposed to the UI (with Resume buttons) but not auto-restarted.
  persistedResumable.forEach((job) => {
    resumable.push({ ...job, io });
    restored.push({ type: 'resumable', id: job.id, url: job.url, playlistId: job.playlistId, filename: job.filename, status: job.status || 'failed' });
  });

  if (queued.length || active.length || persistedResumable.length) {
    console.log(`[STATE] Restored ${queued.length} queued + ${active.length} active + ${persistedResumable.length} resumable on boot`);
  }
  return restored;
};

const processQueue = () => {
  const config = loadConfig();
  while (queue.length > 0 && activeCount < config.maxConcurrentDownloads) {
    const job = queue.shift();
    activeCount++;
    startDownload(job);
  }
};

const startDownload = (job) => {
  const { id, url, args, downloadsDir, io, info } = job;
  job.startedAt = job.startedAt || Date.now();

  io.emit('download-start', { ...info, status: 'starting' });

  const ytdlp = spawn('yt-dlp', args);
  ytdlp.info = info;
  ytdlp.job = job;
  ytdlp.startedAt = job.startedAt;
  activeProcesses.set(id, ytdlp);
  saveState();

  let stdoutBuffer = '';
  let lastLoggedPercent = -1;
  const processLine = (output) => {
    const progressMatch = output.match(/(\d+\.?\d*)%/);
    if (progressMatch) {
      info.progress = parseFloat(progressMatch[1]);
      if (info.status !== 'cancelled') {
        info.status = 'downloading';
      }

      const sizeMatch = output.match(/of\s+~?\s*([\d.]+\s*[KMG]iB)/i);
      if (sizeMatch && !info.totalSizeFixed) {
        const bytes = sizeToBytes(sizeMatch[1]);
        if (bytes != null && bytes > (info.totalSizeBytes || 0)) {
          info.totalSizeBytes = bytes;
        }
        if (info.totalSizeBytes) info.totalSize = bytesToSize(info.totalSizeBytes);
      }

      const speedMatch = output.match(/at\s+([\d.]+\s*[KMG]iB\/s)/i);
      if (speedMatch) info.speed = speedMatch[1];

      const etaMatch = output.match(/ETA\s+(\S+)/i);
      if (etaMatch) info.eta = etaMatch[1];

      const downloadedMatch = output.match(/\[download\]\s+([\d.]+\s*[KMG]iB)/i);
      if (downloadedMatch) info.downloadedSize = downloadedMatch[1];

      io.emit('download-progress', { ...info });

      const wholePercent = Math.floor(info.progress);
      if (wholePercent !== lastLoggedPercent) {
        lastLoggedPercent = wholePercent;
        console.log(
          `[DOWNLOAD] ${info.filename || 'downloading...'} | ${info.progress.toFixed(1)}% | ${info.downloadedSize || '?'} / ${info.totalSize || '?'} | ${info.speed || '?'} | ETA ${info.eta || '?'}`
        );
      }
    }
    const filenameMatch = output.match(/\[download\] Destination: (.+)/);
    if (filenameMatch) {
      info.filename = path.basename(filenameMatch[1]);
    }
    // For audio-only jobs, yt-dlp prints the final extracted file here once
    // ffmpeg finishes. We remember its path so we can correct the estimated
    // size to the file's real size when the download completes.
    const extractAudioMatch = output.match(/\[ExtractAudio\] Destination: (.+)/);
    if (extractAudioMatch) {
      info.audioFilePath = extractAudioMatch[1].trim();
    }
  };

  ytdlp.stdout.on('data', (data) => {
    stdoutBuffer += data.toString();
    const lines = stdoutBuffer.split(/[\r\n]+/);
    stdoutBuffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) processLine(trimmed);
    }
  });

  ytdlp.stderr.on('data', (data) => {
    info.stderr = (info.stderr || '') + data.toString();
  });

  ytdlp.on('close', async (code) => {
    if (stdoutBuffer.trim()) processLine(stdoutBuffer.trim());
    activeProcesses.delete(id);
    activeCount--;
    if (code === 0) {
      info.status = 'completed';
      info.progress = 100;
      removeFromResumable(id);
      // Correct a (previously estimated) audio size to the real file size now
      // that the extracted audio file exists on disk.
      if (info.audioFilePath) {
        try {
          const stats = await fs.stat(info.audioFilePath);
          if (stats.isFile()) {
            info.totalSize = bytesToSize(stats.size);
            info.totalSizeEstimated = false;
          }
        } catch {}
      }
      io.emit('download-complete', info);
    } else if (info.status !== 'cancelled') {
      info.status = 'error';
      info.error = (info.stderr || '').trim() || `Process exited with code ${code}`;
      // Keep the job so the user can resume it from its .part later.
      resumable.push({
        ...ytdlp.job,
        status: 'failed',
        filename: info.filename || '',
      });
      io.emit('download-error', info);
    } else {
      removeFromResumable(id);
      // Process has fully exited — sweep any partial/output files for this job.
      cleanupCancelledFiles(ytdlp.job);
    }
    saveState();
    processQueue();
  });
};

// GET /api/download/browsers — detect installed browsers on Windows
router.get('/browsers', (req, res) => {
  const browsers = [];
  const registryKeys = {
    chrome: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe',
    edge: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe',
    firefox: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\firefox.exe',
    brave: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\brave.exe',
    opera: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\opera.exe',
    vivaldi: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\vivaldi.exe',
  };
  for (const [name, regKey] of Object.entries(registryKeys)) {
    try {
      const result = execSync(`reg query "${regKey}" /ve 2>nul`, { encoding: 'utf-8', timeout: 3000 });
      if (result.includes('REG_SZ')) browsers.push(name);
    } catch {}
  }
  res.json({ browsers });
});

// POST /api/download/cookie-test — test cookie configuration
router.post('/cookie-test', async (req, res) => {
  const { cookieBrowser, cookieFilePath } = req.body;
  const args = ['--flat-playlist', '--playlist-items', '1', '--print', '%(title)s', '--no-download', '--quiet'];
  if (cookieFilePath) {
    args.push('--cookies', cookieFilePath);
  } else if (cookieBrowser) {
    args.push('--cookies-from-browser', cookieBrowser);
  } else {
    return res.json({ success: false, error: 'No cookie source configured' });
  }
  args.push('https://www.youtube.com/@YouTube/videos');
  try {
    await new Promise((resolve, reject) => {
      const proc = spawn('yt-dlp', args);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr.trim() || `Exit code ${code}`));
      });
      proc.on('error', (err) => reject(err));
      setTimeout(() => { proc.kill(); reject(new Error('Test timed out — try again')); }, 20000);
    });
    res.json({ success: true, message: 'Cookies are working!' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/download
router.post('/', async (req, res) => {
  try {
    const { url, format, quality, audioOnly, outputPath, customArgs, formatId, formatSelector,
      embedMetadata, embedThumbnail, writeSubs, embedSubs, subLang, subFormat, expectedSize } = req.body;
    const io = req.app.get('socketio');

    if (!url) return res.status(400).json({ error: 'URL is required' });

    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(url)) return res.status(400).json({ error: 'Invalid URL format.' });

    if (customArgs) {
      const validation = validateCustomArgs(customArgs);
      if (!validation.valid) return res.status(400).json({ error: validation.error });
    }

    const downloadsDir = getDownloadsDir();
    const outDir = getOutDir(!!audioOnly);
    await fs.ensureDir(outDir);

    const args = [];
    args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    args.push('--add-header', 'Accept-Language:en-US,en;q=0.9');

    const config = loadConfig();
    if (config.cookieFilePath) {
      args.push('--cookies', config.cookieFilePath);
    } else if (config.cookieBrowser) {
      args.push('--cookies-from-browser', config.cookieBrowser);
    }

    if (customArgs) {
      args.push(...parseCustomArgs(customArgs));
    } else if (formatSelector) {
      args.push('-f', formatSelector);
      if (audioOnly) {
        args.push('--extract-audio');
        args.push('--audio-format', format || 'mp3');
      }
    } else if (formatId) {
      args.push('-f', formatId);
      if (audioOnly) {
        args.push('--extract-audio');
        args.push('--audio-format', format || 'mp3');
      }
    } else if (audioOnly) {
      args.push('-f', 'bestaudio/best');
      args.push('--extract-audio');
      args.push('--audio-format', format || 'mp3');
    } else {
      if (quality && quality !== 'best') {
        args.push('-f', `best[height<=${quality}]/best`);
      } else {
        args.push('-f', 'b');
      }
    }

    if (audioOnly && embedMetadata !== false) {
      args.push('--embed-metadata');
      args.push('--embed-thumbnail');
      args.push('--parse-metadata', '%(title)s:%(meta_title)s');
      args.push('--parse-metadata', '%(uploader)s:%(meta_artist)s');
    }

    if (embedMetadata && !audioOnly) {
      args.push('--embed-metadata');
    }
    if (embedThumbnail && !audioOnly) {
      args.push('--embed-thumbnail');
    }

    if (writeSubs) {
      args.push('--write-subs');
      if (embedSubs) args.push('--embed-subs');
      if (subLang) args.push('--sub-lang', subLang);
      if (subFormat) args.push('--sub-format', subFormat);
    }

    args.push('-o', path.join(outDir, '%(title)s.%(ext)s'));
    args.push('--no-playlist');
    args.push('--progress');

    const downloadId = Date.now().toString();
    const info = { id: downloadId, url, status: 'queued', progress: 0, filename: '', error: null, stderr: '', totalSize: '', totalSizeEstimated: false, audioFilePath: '', speed: '', eta: '', downloadedSize: '' };

    // When the user picked a specific format in the Get Info panel, seed the
    // displayed total with that format's True size so HLS fragment estimates
    // never inflate/overshoot it. Frozen for the whole download.
    // NOTE: For audio-only jobs this is intentionally skipped — a user may have
    // a VIDEO format selected from Get Info, and using its size here would show
    // the video's size instead of the audio file we actually produce.
    if (!audioOnly && expectedSize && expectedSize > 0) {
      info.totalSizeBytes = expectedSize;
      info.totalSize = bytesToSize(expectedSize);
      info.totalSizeFixed = true;
    }

    // For audio-only jobs estimate the size of the FINAL re-encoded audio file
    // (e.g. the MP3/FLAC we'll produce). yt-dlp only reports the source stream
    // size while downloading, so seed the total with an estimate based on
    // duration + bitrate. It is corrected to the real file size in
    // startDownload when extraction completes.
    if (audioOnly) {
      // Never display the SOURCE stream / selected-video size for an audio
      // download — that's not the size of the audio file we produce. Freeze
      // the total so the progress lines can't overwrite it, and show nothing
      // (or an estimate) instead.
      info.totalSizeFixed = true;
      const probe = probeAudioMetadata(url);
      const estimated = estimateAudioSize(format, probe.duration, probe.abr);
      console.log(`[AUDIO-EST] url=${url} format=${format} probe=${JSON.stringify(probe)} estimated=${estimated} -> ${estimated ? bytesToSize(estimated) : null}`);
      if (estimated && estimated > 0) {
        info.totalSizeBytes = estimated;
        info.totalSize = bytesToSize(estimated);
        info.totalSizeEstimated = true;
      }
      console.log(`[AUDIO-EST] resulting totalSize="${info.totalSize}" est=${info.totalSizeEstimated} fixed=${info.totalSizeFixed}`);
    }

    if (config.downloadSpeedLimit && config.downloadSpeedLimit > 0) {
      args.push('--limit-rate', `${config.downloadSpeedLimit}`);
    }
    args.push(url);

    if (activeCount < config.maxConcurrentDownloads) {
      activeCount++;
      io.emit('download-start', { ...info, status: 'starting' });
      startDownload({ id: downloadId, url, args, downloadsDir, outDir, io, info });
    } else {
      queue.push({ id: downloadId, url, args, downloadsDir, outDir, io, info });
      saveState();
    }

    res.json({ success: true, downloadId, queued: info.status === 'queued', message: 'Download started' });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed', details: error.message });
  }
});

// POST /api/download/playlist
router.post('/playlist', async (req, res) => {
  try {
    const { urls, format, quality, audioOnly, embedMetadata, embedThumbnail, writeSubs, embedSubs, subLang, subFormat } = req.body;
    const io = req.app.get('socketio');

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'urls array is required' });
    }

    const urlPattern = /^https?:\/\/.+/i;
    for (const u of urls) {
      if (!urlPattern.test(u)) return res.status(400).json({ error: `Invalid URL: ${u}` });
    }

    const downloadsDir = getDownloadsDir();
    const outDir = getOutDir(!!audioOnly);
    await fs.ensureDir(outDir);

    const playlistId = `pl-${Date.now()}`;
    io.emit('playlist-start', { playlistId, total: urls.length });

    urls.forEach((url, index) => {
      const args = [];
      args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      args.push('--add-header', 'Accept-Language:en-US,en;q=0.9');

      const config = loadConfig();
      if (config.cookieFilePath) {
        args.push('--cookies', config.cookieFilePath);
      } else if (config.cookieBrowser) {
        args.push('--cookies-from-browser', config.cookieBrowser);
      }

      if (audioOnly) {
        args.push('-f', 'bestaudio/best');
        args.push('--extract-audio');
        args.push('--audio-format', format || 'mp3');
      } else {
        if (quality && quality !== 'best') {
          args.push('-f', `best[height<=${quality}]/best`);
        } else {
          args.push('-f', 'b');
        }
      }

      if (audioOnly && embedMetadata !== false) {
        args.push('--embed-metadata');
        args.push('--embed-thumbnail');
        args.push('--parse-metadata', '%(title)s:%(meta_title)s');
        args.push('--parse-metadata', '%(uploader)s:%(meta_artist)s');
      }
      if (embedMetadata && !audioOnly) args.push('--embed-metadata');
      if (embedThumbnail && !audioOnly) args.push('--embed-thumbnail');
      if (writeSubs) {
        args.push('--write-subs');
        if (embedSubs) args.push('--embed-subs');
        if (subLang) args.push('--sub-lang', subLang);
        if (subFormat) args.push('--sub-format', subFormat);
      }

      args.push('-o', path.join(outDir, '%(title)s.%(ext)s'));
      args.push('--no-playlist');
      args.push('--progress');

      if (config.downloadSpeedLimit && config.downloadSpeedLimit > 0) {
        args.push('--limit-rate', `${config.downloadSpeedLimit}`);
      }
      args.push(url);

      const downloadId = `${playlistId}-${index}`;
      const info = {
        id: downloadId, url, status: 'queued', progress: 0, filename: '',
        error: null, stderr: '', playlistId, playlistIndex: index, playlistTotal: urls.length,
        totalSize: '', totalSizeEstimated: false, totalSizeFixed: !!audioOnly, audioFilePath: '',
        speed: '', eta: '', downloadedSize: '',
      };

      if (activeCount < config.maxConcurrentDownloads) {
        activeCount++;
        startDownload({ id: downloadId, url, args, downloadsDir, outDir, io, info });
      } else {
        queue.push({ id: downloadId, url, args, downloadsDir, outDir, io, info });
        saveState();
      }
    });
    saveState();

    res.json({ success: true, playlistId, total: urls.length, message: `Playlist download started: ${urls.length} videos queued` });

  } catch (error) {
    console.error('Playlist download error:', error);
    res.status(500).json({ error: 'Playlist download failed', details: error.message });
  }
});

// DELETE /api/download/cancel/:id
router.delete('/cancel/:id', (req, res) => {
  const { id } = req.params;
  const io = req.app.get('socketio');
  console.log(`[CANCEL] Cancel request received for download: ${id}`);

  const proc = activeProcesses.get(id);
  if (proc) {
    console.log(`[CANCEL] Killing active process ${id} (pid: ${proc.pid}, filename: ${proc.info.filename || 'unknown'})`);
    proc.info.status = 'cancelled';
    // For the active process we kill the tree, then the `close` handler sweeps
    // all its .part/output files (safer — nothing is mid-write once the
    // process has actually exited).
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
    } else {
      try { proc.kill('SIGTERM'); } catch {}
    }
    io.emit('download-cancelled', { id });
    removeFromResumable(id);
    saveState();
    return res.json({ success: true, message: 'Download cancelled' });
  }

  const qIndex = queue.findIndex((j) => j.id === id);
  if (qIndex !== -1) {
    const job = queue.splice(qIndex, 1)[0];
    console.log(`[CANCEL] Removing queued job ${id} (url: ${job.url})`);
    io.emit('download-cancelled', { id });
    io.emit('download-error', { id: job.id, status: 'error', error: 'Cancelled by user', progress: 0, filename: '', url: job.url });
    removeFromResumable(id);
    saveState();
    return res.json({ success: true, message: 'Download removed from queue' });
  }

  const rIndex = resumable.findIndex((j) => j.id === id);
  if (rIndex !== -1) {
    const job = resumable.splice(rIndex, 1)[0];
    console.log(`[CANCEL] Removing resumable job ${id} (url: ${job.url})`);
    io.emit('download-cancelled', { id });
    saveState();
    return res.json({ success: true, message: 'Download removed' });
  }

  console.warn(`[CANCEL] Download ${id} not found (already finished or invalid id)`);
  res.status(404).json({ error: 'Download not found' });
});

// GET /api/download/queue
router.get('/queue', (req, res) => {
  const config = loadConfig();
  res.json({
    maxConcurrent: config.maxConcurrentDownloads,
    downloadSpeedLimit: config.downloadSpeedLimit || 0,
    cookieBrowser: config.cookieBrowser || '',
    cookieFilePath: config.cookieFilePath || '',
    downloadsDir: getDownloadsDir(),
    activeCount,
    queueLength: queue.length,
    queued: queue.map((j) => ({ id: j.id, url: j.url, info: j.info })),
    active: Array.from(activeProcesses.keys()),
    resumable: resumable.map((j) => ({ id: j.id, url: j.url, filename: j.filename, status: j.status, playlistId: j.playlistId })),
  });
});

// POST /api/download/resume — re-issue a failed/interrupted download from its .part file
router.post('/resume', (req, res) => {
  const { id } = req.body || {};
  const io = req.app.get('socketio');
  if (!id) return res.status(400).json({ error: 'id is required' });

  const rIndex = resumable.findIndex((j) => j.id === id);
  if (rIndex === -1) {
    console.warn(`[RESUME] ${id} not found in resumable`);
    return res.status(404).json({ error: 'Download not found or cannot be resumed' });
  }

  const job = resumable.splice(rIndex, 1)[0];
  console.log(`[RESUME] Re-issuing ${id} (url: ${job.url})`);

  // If a process for this id is somehow still running, kill it before re-issuing.
  const running = activeProcesses.get(id);
  if (running) {
    try {
      running.kill('SIGTERM');
      activeProcesses.delete(id);
      activeCount = Math.max(0, activeCount - 1);
    } catch (e) { /* ignore */ }
  }

  const info = {
    id, url: job.url, status: 'resuming', progress: 0, filename: job.filename || '',
    error: null, stderr: '', playlistId: job.playlistId, playlistIndex: job.playlistIndex,
    playlistTotal: job.playlistTotal, totalSize: '', speed: '', eta: '', downloadedSize: '',
  };

  const config = loadConfig();
  let queued = false;
  if (activeCount < config.maxConcurrentDownloads) {
    activeCount++;
    startDownload({ id, url: job.url, args: job.args, downloadsDir: job.downloadsDir, outDir: job.outDir, io, info });
  } else {
    queued = true;
    queue.push({ id, url: job.url, args: job.args, downloadsDir: job.downloadsDir, outDir: job.outDir, io, info });
  }

  saveState();
  res.json({ success: true, downloadId: id, queued, message: queued ? 'Download queued for resume' : 'Download resumed' });
});

// PUT /api/download/queue/settings
router.put('/queue/settings', (req, res) => {
  const { maxConcurrentDownloads, downloadSpeedLimit, cookieBrowser, cookieFilePath, downloadsDir } = req.body;
  if (!maxConcurrentDownloads || maxConcurrentDownloads < 1 || maxConcurrentDownloads > 10) {
    return res.status(400).json({ error: 'maxConcurrentDownloads must be between 1 and 10' });
  }
  if (downloadSpeedLimit !== undefined && (downloadSpeedLimit < 0 || downloadSpeedLimit > 104857600)) {
    return res.status(400).json({ error: 'downloadSpeedLimit must be between 0 and 104857600 (100 MB/s)' });
  }
  const validBrowsers = ['', 'chrome', 'edge', 'firefox', 'brave', 'opera', 'vivaldi'];
  if (cookieBrowser !== undefined && !validBrowsers.includes(cookieBrowser)) {
    return res.status(400).json({ error: `cookieBrowser must be one of: ${validBrowsers.filter(b => b).join(', ')}` });
  }
  if (downloadsDir !== undefined && (typeof downloadsDir !== 'string' || downloadsDir.length > 1000)) {
    return res.status(400).json({ error: 'downloadsDir must be a valid path string' });
  }
  const config = loadConfig();
  config.maxConcurrentDownloads = maxConcurrentDownloads;
  config.downloadSpeedLimit = downloadSpeedLimit ?? config.downloadSpeedLimit ?? 0;
  if (cookieBrowser !== undefined) config.cookieBrowser = cookieBrowser;
  if (cookieFilePath !== undefined) config.cookieFilePath = cookieFilePath;
  if (downloadsDir !== undefined) config.downloadsDir = downloadsDir.trim();
  saveConfig(config);
  processQueue();
  res.json({ success: true, maxConcurrentDownloads, downloadSpeedLimit: config.downloadSpeedLimit, cookieBrowser: config.cookieBrowser, cookieFilePath: config.cookieFilePath, downloadsDir: getDownloadsDir() });
});

// GET /api/download/list
router.get('/list', async (req, res) => {
  try {
    const downloadsDir = getDownloadsDir();
    const fileList = [];
    for (const folder of [VIDEO_SUBFOLDER, AUDIO_SUBFOLDER]) {
      const folderPath = path.join(downloadsDir, folder);
      await fs.ensureDir(folderPath);
      const entries = await fs.readdir(folderPath);
      for (const file of entries) {
        const filePath = path.join(folderPath, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          fileList.push({ name: file, folder, size: stats.size, createdAt: stats.birthtime, modifiedAt: stats.mtime });
        }
      }
    }
    // Newest items first (then by name for a stable tie-break)
    fileList.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      if (tb !== ta) return tb - ta;
      return String(a.name).localeCompare(String(b.name));
    });
    res.json(fileList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// DELETE /api/download/:filename?folder=Video|Audio
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const folder = req.query.folder === AUDIO_SUBFOLDER ? AUDIO_SUBFOLDER : VIDEO_SUBFOLDER;
    const downloadsDir = getDownloadsDir();
    const folderPath = path.join(downloadsDir, folder);
    const filePath = path.join(folderPath, filename);
    if (!filePath.startsWith(folderPath + path.sep)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    await fs.remove(filePath);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

router.getDownloadsDir = getDownloadsDir;
router.rehydrate = rehydrate;

module.exports = router;
