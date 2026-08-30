# AV Downloader

A web-based video/audio downloader powered by **yt-dlp** and **ffmpeg**. Download media from thousands of sites through a modern, themeable React interface, with a queue, download persistence/resume, cookie support, and real-time progress over Socket.io.

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
- **Security hardening** — path-traversal protection, strict command-argument validation

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) v22+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed and in your PATH
- [ffmpeg](https://ffmpeg.org) installed and in your PATH

### Install & Run

```bash
git clone https://github.com/Nadeesha-chathuranga/Seal-Web-App.git
cd Seal-Web-App
npm run install:all
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start backend + frontend together |
| `npm run server:dev` | Start backend only (port 5000, nodemon) |
| `npm run client:dev` | Start frontend only (port 3000, Vite) |
| `npm run build` | Build frontend for production |
| `npm start` | Run the production server |

> **Note:** `npm start` is intended to serve the built client, but currently `vite build` outputs to `client/dist` while the server serves `client/build` — a known gap. Development mode (`npm run dev`) is unaffected.

---

## Project Structure

```
Seal-Web-App/
├── server/                 Express backend
│   ├── index.js            Entry point, Socket.io, graceful shutdown
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
├── downloads/              Downloaded files (Video/, Audio/)
├── .env                    Server configuration (gitignored)
└── package.json
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

Runtime settings are stored in `server/config.json` (gitignored) and editable from the Settings UI: max concurrent downloads, download speed limit, cookie browser/path, and the downloads directory.

---

## Security

The server hardens yt-dlp usage, which is an attack surface since it fetches arbitrary user URLs:

- **Path traversal protection** — `DELETE /api/download/:filename` normalizes the path and only deletes regular files inside the downloads directory.
- **Command-argument validation** — custom arguments are tokenized and reject dangerous flags (`--exec`, `--rm`, `--output`/`-o`, `--paths`/`-P`, `--path`, `--write-config`, etc.) to prevent file-overwrite and shell-injection vectors.
- **Bounded child processes** — metadata probes run under a shared concurrency semaphore with hard timeouts so request bursts can't fork unbounded processes.
- **Graceful shutdown** — on `SIGINT`/`SIGTERM` the server terminates in-flight yt-dlp/ffmpeg child processes before exiting, so no orphaned downloads keep writing files.
- **Dependency middleware** — helmet (secure headers), morgan (request logging), and restricted CORS origins.

> **Note:** No URL/SSRF blocking is applied to download URLs. The app is a local/personal downloader and intentionally accepts any URL, so it can download from any site without false positives.

**Hygiene:** `.env`, `client/.env`, `server/config.json`, and `server/state.json` are gitignored — do not commit them. Cookie exports (`*_cookies.txt`, `cookies.txt`) are also gitignored because they can contain login/session credentials.

---

## Queue & Download Persistence

The download queue and any interrupted (active) downloads are persisted to `server/state.json` (gitignored) so they survive backend restarts — including development restarts, which previously lost everything (e.g. saving settings mid-download).

- **Queue:** pending jobs are restored and re-issued.
- **Active downloads:** interrupted jobs are re-issued with the same `-o` args, so yt-dlp resumes from the existing `.part` file.
- **Failed/interrupted downloads:** recorded in a capped `resumable` list (max 50) and shown in the UI; they are *not* auto-restarted on boot, but each shows a **Resume** button.
- **Cancel** deletes the `.part` file, so a cancelled download is not resumable.
- `server/state.json` and `server/config.json` are runtime data and gitignored.

In development, `nodemon` watches `server/**/*.js` and ignores config/state changes, so saving settings no longer triggers a server restart.

---

## Remaining Work

Highlights still on the table:

- Windows one-click installer
- macOS/Linux installer scripts
- Batch download support (beyond Queue)
- Download history advanced filtering/cleanup
- Fix the production build-serving path mismatch (`dist/` vs `build/`)

---

## Credits

Fork of [Seal Web App](https://github.com/sh13y/Seal-Web-App) by [sh13y](https://github.com/sh13y). Concept inspired by [JunkFood02/Seal](https://github.com/JunkFood02/Seal).

## License

GPL-3.0
