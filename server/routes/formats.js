// Format listing endpoint (/api/formats). Uses the shared bounded probe from
// security.js (like info.js) so metadata requests can't spawn unbounded
// processes.

const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const { runProbe } = require('../security');
const { CONFIG_PATH } = require('../paths');

const loadConfig = () => {
  try { if (fs.existsSync(CONFIG_PATH())) return fs.readJsonSync(CONFIG_PATH()); }
  catch {} return {};
};

const getCookieArgs = (config) => {
  if (config.cookieFilePath) return ['--cookies', config.cookieFilePath];
  if (config.cookieBrowser) return ['--cookies-from-browser', config.cookieBrowser];
  return [];
};

// GET /api/formats?url=<video_url> - Get available formats for a video
router.get('/', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  const config = loadConfig();
  const args = [
    '--dump-json',
    '--no-playlist',
    ...getCookieArgs(config),
    url,
  ];

  const { code, stdout, stderr, timedOut } = await runProbe(args);
  if (timedOut) {
    return res.status(504).json({ error: 'Format request timed out' });
  }
  if (code !== 0) {
    console.error('yt-dlp formats error:', stderr);
    return res.status(500).json({ error: 'Failed to get format information', details: stderr });
  }

  try {
    const info = JSON.parse(stdout);
    const formats = (info.formats || []).map(f => {
      const hasVideo = f.vcodec && f.vcodec !== 'none';
      const hasAudio = f.acodec && f.acodec !== 'none';
      let type = 'unknown';
      if (hasVideo && hasAudio) type = 'video';
      else if (hasVideo) type = 'video-only';
      else if (hasAudio) type = 'audio';

      return {
        format_id: f.format_id,
        ext: f.ext,
        resolution: f.height ? `${f.height}p` : (f.resolution || 'audio'),
        height: f.height || null,
        fps: f.fps || null,
        vcodec: f.vcodec || null,
        acodec: f.acodec || null,
        filesize: f.filesize || f.filesize_approx || null,
        tbr: f.tbr || null,
        vbr: f.vbr || null,
        abr: f.abr || null,
        note: f.format_note || '',
        type,
      };
    });

    const videoFormats = formats.filter(f => f.type === 'video' || f.type === 'video-only');
    const audioFormats = formats.filter(f => f.type === 'audio');

    const bestVideo = videoFormats.reduce((best, f) => {
      if (!best || (f.height && (!best.height || f.height > best.height))) return f;
      if (f.tbr && (!best.tbr || f.tbr > best.tbr)) return f;
      return best;
    }, null);

    const bestAudio = audioFormats.reduce((best, f) => {
      if (!best || (f.abr && (!best.abr || f.abr > best.abr))) return f;
      if (f.tbr && (!best.tbr || f.tbr > best.tbr)) return f;
      return best;
    }, null);

    res.json({
      video_formats: videoFormats,
      audio_formats: audioFormats,
      all_formats: formats,
      recommended_video: bestVideo ? bestVideo.format_id : null,
      recommended_audio: bestAudio ? bestAudio.format_id : null,
    });

  } catch (parseError) {
    console.error('Error parsing format JSON:', parseError);
    res.status(500).json({ error: 'Failed to parse format information', details: parseError.message });
  }
});

// GET /api/formats/quality-presets - Get common quality presets
router.get('/quality-presets', (req, res) => {
  const presets = {
    video: [
      { value: '2160', label: '4K (2160p)', description: 'Ultra High Definition' },
      { value: '1440', label: '2K (1440p)', description: 'Quad HD' },
      { value: '1080', label: 'Full HD (1080p)', description: 'High Definition' },
      { value: '720', label: 'HD (720p)', description: 'High Definition' },
      { value: '480', label: 'SD (480p)', description: 'Standard Definition' },
      { value: '360', label: 'Low (360p)', description: 'Low Quality' },
      { value: 'best', label: 'Best Available', description: 'Highest quality available' },
      { value: 'worst', label: 'Worst Available', description: 'Lowest quality available' }
    ],
    audio: [
      { value: 'mp3', label: 'MP3', description: 'Standard audio format' },
      { value: 'm4a', label: 'M4A', description: 'High quality audio' },
      { value: 'wav', label: 'WAV', description: 'Uncompressed audio' },
      { value: 'flac', label: 'FLAC', description: 'Lossless audio' },
      { value: 'ogg', label: 'OGG', description: 'Open source audio' },
      { value: 'best', label: 'Best Available', description: 'Highest quality available' }
    ]
  };

  res.json(presets);
});

module.exports = router;
