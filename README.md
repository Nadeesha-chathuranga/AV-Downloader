# AV Downloader

A video/audio downloader powered by **yt-dlp** and **ffmpeg**, available two ways:

- **Windows desktop app** (recommended) — an Electron-based installer that bundles everything and downloads `yt-dlp`/`ffmpeg`/`deno` automatically on first run. No prerequisites needed.
- **Web app** — run the backend + React frontend locally for development or self-hosting.

Download media from thousands of sites through a modern, themeable React interface, with a queue, download persistence/resume, cookie support, and real-time progress over Socket.io.

---

## Tech Stack

| Layer | Tools |
|---|---|
| Backend | Express 4, Socket.io, helmet, morgan, yt-dlp, ffmpeg |
| Frontend | React 19, Vite 6, MUI 7, TypeScript 5 |
| Themes | 20 themes: 10 neon dark (Cyberpunk, Aurora, Ember, Frost, Void, Ocean, Sunset, Forest, Royal, Matrix) + 10 light (Daylight, Paper, Sky, Mint, Blossom, Ivory, Lavender, Sage, Peach, Ocean Light) |

---

## Features

- **Multi-site downloads** via yt-dlp (video, audio-only, playlists)
- **Format selection** — Get Info lists available video/audio formats; pick a specific one or use quick quality presets
- **Download queue** with configurable max-concurrent downloads (server-side, persisted)
- **Persistence & resume** — queue + interrupted downloads survive restarts; interrupted `.part` files resume in place
- **Playlist support** — select individual videos from a playlist and download them together
- **Custom yt-dlp arguments** — full command preview, with dangerous-flag validation
- **Template system** — built-in and user-defined argument templates, editable in the UI
- **Audio metadata** — auto-embeds title/artist/thumbnail for audio-only downloads; estimated final audio file size shown while downloading
- **Browser cookies** — pull login cookies from your browser or a `cookies.txt` file to bypass restrictions (403s, age-gated content)
- **20 themes** — 10 neon dark + 10 light, with glassmorphism styling
- **Self-hosted typography** — bundles the Inter (UI) and JetBrains Mono (code/args) fonts locally, so the UI renders correctly and works fully offline with no external font requests
- **Security hardening** — path-traversal protection, strict command-argument validation
- **Share / deep-link integration (desktop)** — `avdownloader://` links and an optional clipboard watcher: copy a video URL and it auto-fills the field and fetches its info (toggle in Settings)
- **Reload App button** — refresh the entire app from the top toolbar; disabled for a few seconds to prevent rapid repeated presses

---

## Desktop App (Windows)

The recommended way to use AV Downloader is the packaged desktop app.

- **No prerequisites** — on first launch it downloads `yt-dlp`, `ffmpeg`, and `deno` (the JavaScript runtime yt-dlp needs to solve YouTube's JS challenges) into `%APPDATA%\AV Downloader\bin` (verified and cached; only fetched once), then opens the app.
- **Installer** — `npm run dist` produces an NSIS `Setup` in `dist/` that installs per-user with a Start-menu/desktop shortcut.
- **Runtime data** (`config`, `state`, user templates) lives under `%APPDATA%\AV Downloader`, separate from the installed program files.
- **Updates** — installed builds check GitHub Releases via `electron-updater`. While the release repo is private the check is a silent no-op; making the repo public activates automatic updates with no code change.
- **Signing / SmartScreen** — builds are currently **unsigned**. Windows SmartScreen may show "Unknown publisher" on first run; click **More info → Run anyway**. When a code-signing certificate is available, set `CSC_LINK` / `CSC_KEY_PASSWORD` and rebuild — no code changes needed.
- See [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) for the full release process.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) v22+
- For the web mode only: [yt-dlp](https://github.com/yt-dlp/yt-dlp) and [ffmpeg](https://ffmpeg.org) in your PATH. For full YouTube support (JS challenges) yt-dlp also needs a supported JavaScript runtime (e.g. [deno](https://deno.com)) in your PATH.

### Install & Run

```bash
git clone https://github.com/Nadeesha-chathuranga/AV-Downloader.git
cd AV-Downloader
npm run install:all
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start backend + frontend together (web mode) |
| `npm run server:dev` | Start backend only (port 5000, nodemon) |
| `npm run client:dev` | Start frontend only (port 3000, Vite) |
| `npm run build` | Build frontend for production |
| `npm start` | Run the production server serving the built client |
| `npm run desktop` | Build client + launch the app in Electron (dev-friendly) |
| `npm run gen:icon` | Regenerate `buildResources/icon.ico` from `icon.svg` |
| `npm run dist` | Build the Windows installer into `dist/` |
| `npm run dist:dir` | Build an unpacked `dist/win-unpacked/` folder for testing |

---

## Project Structure

```
Seal-Web-App/
├── electron/               Desktop app (Windows)
│   ├── main.js             Electron entry: embedded server, window, tray
│   ├── binary-downloader.js First-run yt-dlp/ffmpeg/deno download + cache
│   ├── updater.js          Auto-update wiring (silent while repo is private)
│   ├── tray.js             System-tray integration
│   ├── preload.js          Safe renderer bridge (avDownloader.*)
│   ├── loading.html/js     Branded splash while the server boots
│   └── scripts/gen-icon.js Icon pipeline (sharp + png-to-ico)
├── buildResources/         electron-builder assets (icon.ico, tray.png)
├── electron-builder.yml    NSIS packaging config
├── .github/workflows/      CI: build + publish on version tags
├── server/                 Express backend
│   ├── index.js            Entry point, Socket.io, graceful shutdown
│   ├── paths.js            Runtime data directory (all platforms)
│   ├── binary.js           Resolves spawned yt-dlp / ffmpeg
│   ├── state.js            Queue/download state persistence
│   ├── security.js         Arg validation, probe concurrency
│   ├── config.json         Runtime config (gitignored)
│   ├── templates/
│   │   └── defaults.json   Built-in argument templates
│   └── routes/
│       ├── download.js     Downloads, queue, cancel, resume, history
│       ├── info.js         Video/playlist info fetching
│       ├── formats.js      Available formats + quality presets
│       └── templates.js    Template CRUD + validation
├── client/                 Vite + React frontend
│   └── src/
│       ├── components/     DownloadForm, DownloadPanel, DownloadHistory,
│       │                   PlaylistPanel, FormatSelector, TemplateEditor,
│       │                   SettingsDialog, Header, UserGuideDialog
│       ├── contexts/       SocketContext (live progress/queue state)
│       ├── hooks/          useSmoothedMetrics (terminal-style rate smoothing)
│       ├── theme/          20 themes (10 dark + 10 light)
│       └── config.ts       API configuration
└── dist/                   electron-builder output (gitignored)
```

---

## API Endpoints

All endpoints are under `/api` and accept/return JSON. Download-related endpoints live on the Socket.io-connected router.

### Downloads — `server/routes/download.js`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/download` | Start a video/audio download |
| POST | `/api/download/playlist` | Start downloading multiple playlist-selected URLs |
| GET | `/api/download/list` | List saved downloads, newest first |
| DELETE | `/api/download/:filename` | Delete a saved download (path-traversal protected) |
| DELETE | `/api/download/cancel/:id` | Cancel an active/queued download |
| POST | `/api/download/resume` | Resume an interrupted download from its `.part` file |
| GET | `/api/download/queue` | Get queue status + settings |
| PUT | `/api/download/queue/settings` | Update max-concurrent / speed limit / cookies / download dir |
| GET | `/api/download/browsers` | Detect installed browsers for cookie extraction |
| POST | `/api/download/cookie-test` | Test whether the configured cookie source works |

### Info — `server/routes/info.js`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/info` | Get video/audio info (formats, duration, metadata) |
| GET | `/api/info/playlist` | List entries of a playlist |

### Formats — `server/routes/formats.js`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/formats` | Get available formats for a video |
| GET | `/api/formats/quality-presets` | Get the quality presets |

### Templates — `server/routes/templates.js`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/templates` | List built-in + user templates |
| POST | `/api/templates` | Create a template |
| PUT | `/api/templates/:id` | Update a template |
| DELETE | `/api/templates/:id` | Delete a template |
| GET | `/api/templates/validate` | Validate a yt-dlp argument string |

---

## Configuration

Environment variables in `.env` (gitignored):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Backend server port |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `NODE_ENV` | `development` | `production` serves the built client and disables CORS |
| `REACT_APP_SERVER_URL` | `http://localhost:5000` | Frontend → backend URL (also in `client/.env`) |
| `SEAL_DATA_DIR` | `server/` | Override where runtime data (config/state/templates) is stored; the Electron app sets this to `%APPDATA%\AV Downloader` |

Runtime settings are stored in `runtime config.json` (gitignored) and editable from the Settings UI: max concurrent downloads, download speed limit, cookie browser/path, and the downloads directory.

---

## Security

The server hardens yt-dlp usage, which is an attack surface since it fetches arbitrary user URLs:

- **Path traversal protection** — `DELETE /api/download/:filename` normalizes the path and only deletes regular files inside the downloads directory.
- **Command-argument validation** — custom arguments are tokenized and reject dangerous flags (`--exec`, `--rm`, `--output`/`-o`, `--paths`/`-P`, `--path`, `--write-config`, etc.) to prevent file-overwrite and shell-injection vectors.
- **Bounded child processes** — metadata probes run under a shared concurrency semaphore with hard timeouts so request bursts can't fork unbounded processes.
- **Graceful shutdown** — on `SIGINT`/`SIGTERM` (and on app quit in the desktop build) the server terminates in-flight yt-dlp/ffmpeg child processes before exiting, so no orphaned downloads keep writing files.
- **Loopback-only binding in production** — the packaged/server build listens on `127.0.0.1`, not `0.0.0.0`, so the local downloader is never exposed to the LAN.
- **Request limits & strict API 404s** — JSON/URL-encoded bodies are size-limited (`1mb`) and unknown `/api` routes return a JSON 404 instead of falling through to the app shell.
- **Dependency middleware** — helmet (secure headers), morgan (request logging), and restricted CORS origins.

> **Note:** No URL/SSRF blocking is applied to download URLs. The app is a local/personal downloader and intentionally accepts any URL, so it can download from any site without false positives.

**Hygiene:** `.env`, `client/.env`, `server/config.json`, and `server/state.json` are gitignored — do not commit them. Cookie exports (`*_cookies.txt`, `cookies.txt`) are also gitignored because they can contain login/session credentials.

---

## Queue & Download Persistence

The download queue and any interrupted (active) downloads are persisted to the runtime data directory — `server/state.json` in web mode, `%APPDATA%\AV Downloader\state.json` in the desktop app — so they survive backend restarts, including development restarts, which previously lost everything (e.g. saving settings mid-download).

- **Queue:** pending jobs are restored and re-issued.
- **Active downloads:** interrupted jobs are re-issued with the same `-o` args, so yt-dlp resumes from the existing `.part` file.
- **Failed/interrupted downloads:** recorded in a capped `resumable` list (max 50) and shown in the UI; they are *not* auto-restarted on boot, but each shows a **Resume** button.
- **Cancel** deletes the `.part` file, so a cancelled download is not resumable.
- `server/state.json` and `server/config.json` are runtime data and gitignored.

In development, `nodemon` watches `server/**/*.js` and ignores config/state changes, so saving settings no longer triggers a server restart.

---

## Remaining Work

Highlights still on the table:

- macOS/Linux launchers
- Batch download support (beyond Queue)
- Download history advanced filtering/cleanup
- Code signing for the Windows installer (env-wired, waiting for a certificate)

---

## Credits

Fork of [Seal Web App](https://github.com/sh13y/Seal-Web-App) by [sh13y](https://github.com/sh13y). Concept inspired by [JunkFood02/Seal](https://github.com/JunkFood02/Seal).

## License

GPL-3.0
