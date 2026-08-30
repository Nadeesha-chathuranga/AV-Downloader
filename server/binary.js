// Central resolution of the yt-dlp/ffmpeg binaries.
//
// In development the tools are expected on PATH (or pointed at by the
// environment). In the packaged desktop app the Electron main process
// downloads them into userData/bin and exposes the locations via
// YTDLP_PATH / FFMPEG_DIR; yt-dlp automatically picks ffmpeg/ffprobe up from
// PATH, so we prepend the ffmpeg directory to PATH rather than passing
// --ffmpeg-location to every invocation.

const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');

const resolveYtDlp = () => {
  if (process.env.YTDLP_PATH && fs.existsSync(process.env.YTDLP_PATH)) {
    return process.env.YTDLP_PATH;
  }
  return 'yt-dlp';
};

const resolveFfmpegDir = () => {
  if (process.env.FFMPEG_DIR && fs.existsSync(process.env.FFMPEG_DIR)) {
    return process.env.FFMPEG_DIR;
  }
  return null;
};

const buildEnv = () => {
  const env = { ...process.env };
  const ffmpegDir = resolveFfmpegDir();
  if (ffmpegDir) {
    env.PATH = `${ffmpegDir}${path.delimiter}${env.PATH || ''}`;
  }
  return env;
};

const spawnYtDlp = (args, opts = {}) =>
  spawn(resolveYtDlp(), args, {
    windowsHide: true,
    ...opts,
    env: buildEnv(),
  });

module.exports = { resolveYtDlp, resolveFfmpegDir, buildEnv, spawnYtDlp };