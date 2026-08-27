const express = require('express');
const { spawn, exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

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
let activeCount = 0;

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

  io.emit('download-start', { ...info, status: 'starting' });

  const ytdlp = spawn('yt-dlp', args);
  ytdlp.info = info;
  activeProcesses.set(id, ytdlp);

  let stdoutBuffer = '';
  let lastLoggedPercent = -1;
  const processLine = (output) => {
    const progressMatch = output.match(/(\d+\.?\d*)%/);
    if (progressMatch) {
      info.progress = parseFloat(progressMatch[1]);
      if (info.status !== 'cancelled') {
        info.status = 'downloading';
      }

      const sizeMatch = output.match(/of\s+~?([\d.]+\s*[KMG]iB)/i);
      if (sizeMatch) info.totalSize = sizeMatch[1];

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

  ytdlp.on('close', (code) => {
    if (stdoutBuffer.trim()) processLine(stdoutBuffer.trim());
    activeProcesses.delete(id);
    activeCount--;
    if (code === 0) {
      info.status = 'completed';
      info.progress = 100;
      io.emit('download-complete', info);
    } else if (info.status !== 'cancelled') {
      info.status = 'error';
      info.error = (info.stderr || '').trim() || `Process exited with code ${code}`;
      io.emit('download-error', info);
    }
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
    const { url, format, quality, audioOnly, outputPath, customArgs, formatId,
      embedMetadata, embedThumbnail, writeSubs, embedSubs, subLang, subFormat } = req.body;
    const io = req.app.get('socketio');

    if (!url) return res.status(400).json({ error: 'URL is required' });

    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(url)) return res.status(400).json({ error: 'Invalid URL format.' });

    if (customArgs) {
      const validation = validateCustomArgs(customArgs);
      if (!validation.valid) return res.status(400).json({ error: validation.error });
    }

    const downloadsDir = path.join(__dirname, '../../downloads');
    await fs.ensureDir(downloadsDir);

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

    args.push('-o', path.join(downloadsDir, '%(title)s.%(ext)s'));
    args.push('--no-playlist');
    args.push('--progress');

    const downloadId = Date.now().toString();
    const info = { id: downloadId, url, status: 'queued', progress: 0, filename: '', error: null, stderr: '', totalSize: '', speed: '', eta: '', downloadedSize: '' };

    if (config.downloadSpeedLimit && config.downloadSpeedLimit > 0) {
      args.push('--limit-rate', `${config.downloadSpeedLimit}`);
    }
    args.push(url);

    if (activeCount < config.maxConcurrentDownloads) {
      activeCount++;
      io.emit('download-start', { ...info, status: 'starting' });
      startDownload({ id: downloadId, url, args, downloadsDir, io, info });
    } else {
      queue.push({ id: downloadId, url, args, downloadsDir, io, info });
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

    const downloadsDir = path.join(__dirname, '../../downloads');
    await fs.ensureDir(downloadsDir);

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

      args.push('-o', path.join(downloadsDir, '%(title)s.%(ext)s'));
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
        totalSize: '', speed: '', eta: '', downloadedSize: '',
      };

      if (activeCount < config.maxConcurrentDownloads) {
        activeCount++;
        startDownload({ id: downloadId, url, args, downloadsDir, io, info });
      } else {
        queue.push({ id: downloadId, url, args, downloadsDir, io, info });
      }
    });

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
    const downloadsDir = path.join(__dirname, '../../downloads');
    if (proc.info.filename) {
      fs.remove(path.join(downloadsDir, proc.info.filename)).catch(() => {});
      fs.remove(path.join(downloadsDir, proc.info.filename + '.part')).catch(() => {});
    }
    // Kill the whole process tree (yt-dlp + any orphaned ffmpeg helpers it spawned)
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
    } else {
      try { proc.kill('SIGTERM'); } catch {}
    }
    io.emit('download-cancelled', { id });
    return res.json({ success: true, message: 'Download cancelled' });
  }

  const qIndex = queue.findIndex((j) => j.id === id);
  if (qIndex !== -1) {
    const job = queue.splice(qIndex, 1)[0];
    console.log(`[CANCEL] Removing queued job ${id} (url: ${job.url})`);
    io.emit('download-cancelled', { id });
    io.emit('download-error', { id: job.id, status: 'error', error: 'Cancelled by user', progress: 0, filename: '', url: job.url });
    return res.json({ success: true, message: 'Download removed from queue' });
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
    activeCount,
    queueLength: queue.length,
    queued: queue.map((j) => ({ id: j.id, url: j.url, info: j.info })),
    active: Array.from(activeProcesses.keys()),
  });
});

// PUT /api/download/queue/settings
router.put('/queue/settings', (req, res) => {
  const { maxConcurrentDownloads, downloadSpeedLimit, cookieBrowser, cookieFilePath } = req.body;
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
  const config = loadConfig();
  config.maxConcurrentDownloads = maxConcurrentDownloads;
  config.downloadSpeedLimit = downloadSpeedLimit ?? config.downloadSpeedLimit ?? 0;
  if (cookieBrowser !== undefined) config.cookieBrowser = cookieBrowser;
  if (cookieFilePath !== undefined) config.cookieFilePath = cookieFilePath;
  saveConfig(config);
  processQueue();
  res.json({ success: true, maxConcurrentDownloads, downloadSpeedLimit: config.downloadSpeedLimit, cookieBrowser: config.cookieBrowser, cookieFilePath: config.cookieFilePath });
});

// GET /api/download/list
router.get('/list', async (req, res) => {
  try {
    const downloadsDir = path.join(__dirname, '../../downloads');
    const entries = await fs.readdir(downloadsDir);
    const fileList = [];
    for (const file of entries) {
      const filePath = path.join(downloadsDir, file);
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        fileList.push({ name: file, size: stats.size, createdAt: stats.birthtime, modifiedAt: stats.mtime });
      }
    }
    res.json(fileList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// DELETE /api/download/:filename
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../downloads', filename);
    if (!filePath.startsWith(path.join(__dirname, '../../downloads'))) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    await fs.remove(filePath);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
