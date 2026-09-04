// Metadata endpoints (/api/info, /api/playlist-info, /api/formats).
//
// These all shell out to yt-dlp probe/JSON dumps. The probe runs under the
// shared concurrency semaphore in security.js, with a hard timeout so slow
// targets don't wedge the server.

const express = require('express');
const fs = require('fs-extra');
const router = express.Router();
const { runProbe } = require('../security');
const { CONFIG_PATH } = require('../paths');

const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_PATH())) return fs.readJsonSync(CONFIG_PATH());
  } catch (e) {}
  return {};
};

// Pick a reliable JPG thumbnail from yt-dlp's thumbnails array, avoiding
// WebP URLs (which can silently fail to decode in Electron) and storyboard
// entries. Falls back to the raw `thumbnail` field, then to a constructed
// hqdefault.jpg URL for known YouTube IDs.
function pickBestThumbnail(videoInfo) {
  const thumbs = videoInfo.thumbnails || [];
  const jpg = thumbs
    .filter((t) => t.url && /\.jpg(\?|$)/i.test(t.url) && !/storyboard/i.test(t.url))
    .sort((a, b) => (b.preference || 0) - (a.preference || 0));
  if (jpg.length > 0) return jpg[0].url;
  if (videoInfo.thumbnail && !/\.webp(\?|$)/i.test(videoInfo.thumbnail)) return videoInfo.thumbnail;
  if (videoInfo.thumbnail) return videoInfo.thumbnail;
  if (videoInfo.id) return `https://i.ytimg.com/vi/${videoInfo.id}/hqdefault.jpg`;
  return null;
}

const getCookieArgs = () => {
  const config = loadConfig();
  if (config.cookieFilePath) {
    return ['--cookies', config.cookieFilePath];
  } else if (config.cookieBrowser) {
    return ['--cookies-from-browser', config.cookieBrowser];
  }
  return [];
};

// GET /api/info?url=<video_url> - Get video information
router.get('/', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  const args = [
    '--dump-json',
    '--no-playlist',
    ...getCookieArgs(),
    url
  ];

  const { code, stdout, stderr, timedOut } = await runProbe(args);
  if (timedOut) {
    return res.status(504).json({ error: 'Video information request timed out' });
  }
  if (code !== 0) {
    console.error('yt-dlp info error:', stderr);
    return res.status(500).json({ error: 'Failed to get video information', details: stderr });
  }

  try {
    const videoInfo = JSON.parse(stdout);
    const info = {
      id: videoInfo.id,
      title: videoInfo.title,
      description: videoInfo.description,
      duration: videoInfo.duration,
      uploader: videoInfo.uploader,
      upload_date: videoInfo.upload_date,
      view_count: videoInfo.view_count,
      thumbnail: pickBestThumbnail(videoInfo),
      webpage_url: videoInfo.webpage_url,
      extractor: videoInfo.extractor,
      formats: videoInfo.formats ? videoInfo.formats.map(format => ({
        format_id: format.format_id,
        ext: format.ext,
        quality: format.quality,
        filesize: format.filesize,
        width: format.width,
        height: format.height,
        fps: format.fps,
        vcodec: format.vcodec,
        acodec: format.acodec,
        format_note: format.format_note
      })) : []
    };
    res.json(info);
  } catch (parseError) {
    console.error('Error parsing JSON:', parseError);
    res.status(500).json({ error: 'Failed to parse video information', details: parseError.message });
  }
});

// GET /api/info/playlist?url=<playlist_url> - Get playlist information
router.get('/playlist', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  const args = [
    '--flat-playlist',
    '--dump-json',
    ...getCookieArgs(),
    url
  ];

  const { code, stdout, stderr, timedOut } = await runProbe(args);
  if (timedOut) {
    return res.status(504).json({ error: 'Playlist request timed out' });
  }
  if (code !== 0) {
    console.error('yt-dlp playlist error:', stderr);
    return res.status(500).json({ error: 'Failed to get playlist information', details: stderr });
  }

  try {
    const lines = stdout.trim().split('\n').filter(line => line.trim());
    const playlist = lines.map(line => JSON.parse(line));
    res.json({
      entries: playlist.map(entry => ({
        id: entry.id,
        title: entry.title,
        url: entry.url,
        duration: entry.duration,
        uploader: entry.uploader
      }))
    });
  } catch (parseError) {
    console.error('Error parsing playlist JSON:', parseError);
    res.status(500).json({ error: 'Failed to parse playlist information', details: parseError.message });
  }
});

module.exports = router;
