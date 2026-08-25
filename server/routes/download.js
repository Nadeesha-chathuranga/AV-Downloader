const express = require('express');
const { spawn } = require('child_process');
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
  return { maxConcurrentDownloads: 3 };
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

  io.emit('download-start', info);

  const ytdlp = spawn('yt-dlp', args);
  activeProcesses.set(id, ytdlp);

  ytdlp.stdout.on('data', (data) => {
    const output = data.toString();
    const progressMatch = output.match(/(\d+\.\d+)%/);
    if (progressMatch) {
      info.progress = parseFloat(progressMatch[1]);
      info.status = 'downloading';
      io.emit('download-progress', info);
    }
    const filenameMatch = output.match(/\[download\] Destination: (.+)/);
    if (filenameMatch) {
      info.filename = path.basename(filenameMatch[1]);
    }
  });

  ytdlp.stderr.on('data', (data) => {
    const error = data.toString();
    info.error = error;
    info.status = 'error';
    io.emit('download-error', info);
  });

  ytdlp.on('close', (code) => {
    activeProcesses.delete(id);
    activeCount--;
    if (code === 0) {
      info.status = 'completed';
      info.progress = 100;
      io.emit('download-complete', info);
    } else if (info.status !== 'cancelled') {
      info.status = 'error';
      info.error = `Process exited with code ${code}`;
      io.emit('download-error', info);
    }
    processQueue();
  });
};

const buildArgs = (options) => {
  const { customArgs, audioOnly, format, quality } = options;
  const args = [];
  args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  args.push('--add-header', 'Accept-Language:en-US,en;q=0.9');

  if (customArgs) {
    args.push(...parseCustomArgs(customArgs));
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
  return args;
};

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
    args.push(url);

    const downloadId = Date.now().toString();
    const info = { id: downloadId, url, status: 'queued', progress: 0, filename: '', error: null };

    const config = loadConfig();
    if (activeCount < config.maxConcurrentDownloads) {
      activeCount++;
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
      args.push(url);

      const downloadId = `${playlistId}-${index}`;
      const info = {
        id: downloadId, url, status: 'queued', progress: 0, filename: '',
        error: null, playlistId, playlistIndex: index, playlistTotal: urls.length,
      };

      const config = loadConfig();
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

  const proc = activeProcesses.get(id);
  if (proc) {
    proc.kill('SIGTERM');
    activeProcesses.delete(id);
    activeCount--;
    io.emit('download-cancelled', { id });
    io.emit('download-error', { id, status: 'error', error: 'Cancelled by user', progress: 0, filename: '', url: '' });
    processQueue();
    return res.json({ success: true, message: 'Download cancelled' });
  }

  const qIndex = queue.findIndex((j) => j.id === id);
  if (qIndex !== -1) {
    const job = queue.splice(qIndex, 1)[0];
    io.emit('download-cancelled', { id });
    io.emit('download-error', { id: job.id, status: 'error', error: 'Cancelled by user', progress: 0, filename: '', url: job.url });
    return res.json({ success: true, message: 'Download removed from queue' });
  }

  res.status(404).json({ error: 'Download not found' });
});

// GET /api/download/queue
router.get('/queue', (req, res) => {
  const config = loadConfig();
  res.json({
    maxConcurrent: config.maxConcurrentDownloads,
    activeCount,
    queueLength: queue.length,
    queued: queue.map((j) => ({ id: j.id, url: j.url, info: j.info })),
    active: Array.from(activeProcesses.keys()),
  });
});

// PUT /api/download/queue/settings
router.put('/queue/settings', (req, res) => {
  const { maxConcurrentDownloads } = req.body;
  if (!maxConcurrentDownloads || maxConcurrentDownloads < 1 || maxConcurrentDownloads > 10) {
    return res.status(400).json({ error: 'maxConcurrentDownloads must be between 1 and 10' });
  }
  const config = loadConfig();
  config.maxConcurrentDownloads = maxConcurrentDownloads;
  saveConfig(config);
  processQueue();
  res.json({ success: true, maxConcurrentDownloads });
});

// GET /api/download/list
router.get('/list', async (req, res) => {
  try {
    const downloadsDir = path.join(__dirname, '../../downloads');
    const files = await fs.readdir(downloadsDir);
    const fileList = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(downloadsDir, file);
        const stats = await fs.stat(filePath);
        return { name: file, size: stats.size, createdAt: stats.birthtime, modifiedAt: stats.mtime };
      })
    );
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
