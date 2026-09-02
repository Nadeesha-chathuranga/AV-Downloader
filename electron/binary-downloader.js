// Ensures yt-dlp and ffmpeg binaries exist in the per-user bin dir.
//
// Runs inside the Electron main process (first launch only). Binaries are
// downloaded over HTTPS from the official/community sources below, verified by
// running `--version`, and cached by SHA-256 so later launches reuse them
// without re-downloading. Progress is reported through the `emit` callback
// which forwards IPC updates to the loading window.
//
// NOTE on authenticity: downloads are HTTPS (TLS-authenticated source) plus a
// runtime version self-check; the SHA-256 is a cache-integrity check, not a
// supply-chain signature. The files could be cross-signed later via
// CSC_LINK/SmartScreen once a signing cert is available.

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { execFile } = require('child_process');
const AdmZip = require('adm-zip');

const YTDLP_URLS = [
  'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
];

const FFMPEG_ZIPS = [
  'https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip',
  'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
];

const DENO_ZIP_URLS = [
  'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip',
];

const META_FILE = 'meta.json';

const sha256File = (file) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('error', reject);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
  });

const downloadFile = (url, dest, onProgress) =>
  new Promise((resolve, reject) => {
    const tmp = dest + '.part';
    fs.ensureDirSync(path.dirname(dest));
    let redirects = 0;

    const finish = (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (redirects >= 5) return reject(new Error('Too many redirects'));
        redirects += 1;
        return request(res.headers.location);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Download failed (HTTP ${res.statusCode}): ${url}`));
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let received = 0;
      let lastPercent = -1;
      const out = fs.createWriteStream(tmp);
      res.on('data', (chunk) => {
        received += chunk.length;
        if (total > 0 && onProgress) {
          const pct = Math.round((received / total) * 100);
          if (pct !== lastPercent) {
            lastPercent = pct;
            onProgress(pct);
          }
        }
      });
      res.pipe(out);
      out.on('error', reject);
      res.on('error', reject);
      out.on('finish', () => {
        out.close(async () => {
          try {
            const sha256 = await sha256File(tmp);
            fs.moveSync(tmp, dest, { overwrite: true });
            resolve({ size: received, sha256 });
          } catch (e) {
            reject(e);
          }
        });
      });
    };

    const request = (reqUrl) => {
      const mod = reqUrl.startsWith('https:') ? https : http;
      const req = mod.get(
        reqUrl,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          },
        },
        finish
      );
      req.on('error', reject);
    };

    request(url);
  });

// ffmpeg prints its version banner to stderr (and returns a non-standard exit
// code for -version), so we validate by recognizable version output rather
// than exit status. Retries once to ride out transient AV scanner locks on
// freshly written executables.
const runVersion = (tool, exe) =>
  new Promise((resolve) => {
    const flag = tool === 'ffmpeg' ? '-version' : '--version';
    const check = (attempt) => {
      execFile(exe, [flag], { timeout: 30000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) => {
        const out = `${stdout || ''}\n${stderr || ''}`;
        let ok;
        if (tool === 'ffmpeg') {
          ok = /ffmpeg version/i.test(out);
        } else if (tool === 'deno') {
          ok = /^deno\s+\d+\.\d+/m.test(out);
        } else {
          ok = /20\d{2}\.\d{1,2}\.\d{1,2}/.test(out);
        }
        if (!ok && attempt < 1) return setTimeout(() => check(attempt + 1), 1200);
        resolve(ok);
      });
    };
    check(0);
  });

const extractZip = (zipFile, outDir) => {
  const zip = new AdmZip(zipFile);
  const entries = zip.getEntries();
  for (const bin of ['ffmpeg.exe', 'ffprobe.exe']) {
    const entry = entries.find((e) => {
      if (e.isDirectory) return false;
      const n = e.entryName.replace(/\\/g, '/');
      return n.toLowerCase().endsWith(`/bin/${bin.toLowerCase()}`);
    });
    if (!entry) throw new Error(`Missing ${bin} in ${path.basename(zipFile)}`);
    fs.writeFileSync(path.join(outDir, bin), entry.getData());
  }
};

const extractDenoZip = (zipFile, outDir) => {
  const zip = new AdmZip(zipFile);
  const entries = zip.getEntries();
  const entry = entries.find((e) => {
    if (e.isDirectory) return false;
    const n = e.entryName.replace(/\\/g, '/');
    return n.toLowerCase() === 'deno.exe' || n.toLowerCase().endsWith('/deno.exe');
  });
  if (!entry) throw new Error('Missing deno.exe in deno zip');
  fs.writeFileSync(path.join(outDir, 'deno.exe'), entry.getData());
};

const ensureBinaries = async (binDir, emit = () => {}) => {
  try {
    fs.ensureDirSync(binDir);
    const metaPath = path.join(binDir, META_FILE);
    const meta = fs.existsSync(metaPath) ? fs.readJsonSync(metaPath) : {};

    // --- yt-dlp -------------------------------------------------------
    const ytdlpPath = path.join(binDir, 'yt-dlp.exe');
    emit({ status: 'preparing', message: 'Checking yt-dlp…' });
    let ytDlpValid = false;
    if (fs.existsSync(ytdlpPath) && meta.ytdlp && (await sha256File(ytdlpPath)) === meta.ytdlp) {
      ytDlpValid = await runVersion('yt-dlp', ytdlpPath);
    }
    if (!ytDlpValid) {
      emit({ status: 'downloading', item: 'yt-dlp', message: 'Downloading yt-dlp…', percent: 0 });
      let lastError = null;
      for (const url of YTDLP_URLS) {
        try {
          const dl = await downloadFile(url, ytdlpPath, (p) =>
            emit({ status: 'downloading', item: 'yt-dlp', message: 'Downloading yt-dlp…', percent: p })
          );
          meta.ytdlp = dl.sha256;
          ytDlpValid = await runVersion('yt-dlp', ytdlpPath);
          if (ytDlpValid) break;
          lastError = new Error('yt-dlp binary does not run');
        } catch (e) {
          lastError = e;
        }
      }
      if (!ytDlpValid) throw lastError || new Error('Failed to obtain yt-dlp');
    }

    // --- ffmpeg -------------------------------------------------------
    const ffmpegPath = path.join(binDir, 'ffmpeg.exe');
    const ffprobePath = path.join(binDir, 'ffprobe.exe');
    emit({ status: 'preparing', message: 'Checking ffmpeg…' });
    let ffmpegValid = false;
    const ffmpegHashOk = meta.ffmpeg && fs.existsSync(ffmpegPath) && (await sha256File(ffmpegPath)) === meta.ffmpeg;
    const ffprobeHashOk = meta.ffprobe && fs.existsSync(ffprobePath) && (await sha256File(ffprobePath)) === meta.ffprobe;
    if (ffmpegHashOk && ffprobeHashOk) {
      ffmpegValid = await runVersion('ffmpeg', ffmpegPath);
    }
    if (!ffmpegValid) {
      const zipTmp = path.join(binDir, '.ffmpeg-download.zip');
      let lastError = null;
      for (const url of FFMPEG_ZIPS) {
        try {
          emit({ status: 'downloading', item: 'ffmpeg', message: 'Downloading ffmpeg…', percent: 0 });
          await downloadFile(url, zipTmp, (p) =>
            emit({ status: 'downloading', item: 'ffmpeg', message: 'Downloading ffmpeg…', percent: p })
          );
          emit({ status: 'preparing', message: 'Extracting ffmpeg…' });
          extractZip(zipTmp, binDir);
          fs.removeSync(zipTmp);
          fs.removeSync(zipTmp + '.part');
          meta.ffmpeg = await sha256File(ffmpegPath);
          meta.ffprobe = await sha256File(ffprobePath);
          ffmpegValid = await runVersion('ffmpeg', ffmpegPath);
          if (ffmpegValid) break;
          lastError = new Error('ffmpeg binary does not run');
        } catch (e) {
          lastError = e;
          fs.removeSync(zipTmp);
          fs.removeSync(zipTmp + '.part');
        }
      }
      if (!ffmpegValid) throw lastError || new Error('Failed to obtain ffmpeg');
    }

    // --- deno (JS runtime for YouTube challenges) -----------------------
    const denoPath = path.join(binDir, 'deno.exe');
    emit({ status: 'preparing', message: 'Checking deno…' });
    let denoValid = false;
    if (fs.existsSync(denoPath) && meta.deno && (await sha256File(denoPath)) === meta.deno) {
      denoValid = await runVersion('deno', denoPath);
    }
    if (!denoValid) {
      emit({ status: 'downloading', item: 'deno', message: 'Downloading deno…', percent: 0 });
      let lastError = null;
      for (const url of DENO_ZIP_URLS) {
        try {
          const zipTmp = path.join(binDir, '.deno-download.zip');
          const dl = await downloadFile(url, zipTmp, (p) =>
            emit({ status: 'downloading', item: 'deno', message: 'Downloading deno…', percent: p })
          );
          emit({ status: 'preparing', message: 'Extracting deno…' });
          extractDenoZip(zipTmp, binDir);
          fs.removeSync(zipTmp);
          fs.removeSync(zipTmp + '.part');
          meta.deno = await sha256File(denoPath);
          denoValid = await runVersion('deno', denoPath);
          if (denoValid) break;
          lastError = new Error('deno binary does not run');
        } catch (e) {
          lastError = e;
        }
      }
      if (!denoValid) {
        // Deno is non-fatal — YouTube downloads will degrade but other sites
        // still work. Emit a warning instead of blocking startup.
        emit({ status: 'warning', message: 'Could not obtain deno — YouTube downloads may be limited.' });
      }
    }

    meta.installedAt = new Date().toISOString();
    fs.writeJsonSync(metaPath, meta, { spaces: 2 });
    emit({ status: 'done', message: 'Ready.' });

    return { ok: true, ytdlpPath, ffmpegDir: binDir };
  } catch (err) {
    emit({ status: 'error', message: String((err && err.message) || err) });
    return { ok: false, error: String((err && err.message) || err) };
  }
};

module.exports = { ensureBinaries, downloadFile, sha256File };