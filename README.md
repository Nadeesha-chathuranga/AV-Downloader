# Seal Web Downloader

A web-based video/audio downloader powered by yt-dlp and ffmpeg. Download media from thousands of sites with a modern, themeable interface.

---

## Tech Stack

| Layer | Tools |
|---|---|
| Backend | Express 4, Socket.io, yt-dlp, ffmpeg |
| Frontend | React 19, Vite 6, MUI 7, TypeScript 5 |
| Themes | 10 neon themes: Cyberpunk, Aurora, Ember, Frost, Void, Ocean, Sunset, Forest, Royal, Matrix |

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
| `npm run server:dev` | Start backend only (port 5000) |
| `npm run client:dev` | Start frontend only (port 3000) |
| `npm run build` | Build frontend for production |
| `npm start` | Run production server |

---

## Project Structure

```
Seal-Web-App/
├── server/              Express backend
│   ├── index.js         Entry point, Socket.io setup
│   └── routes/
│       ├── download.js  yt-dlp download handling
│       ├── info.js      Video info fetching
│       ├── formats.js   Quality presets
│       └── templates.js yt-dlp argument templates
├── client/              Vite + React frontend
│   ├── src/
│   │   ├── components/  UI components
│   │   ├── contexts/    Socket.io context
│   │   ├── theme/       10 neon themes
│   │   └── config.ts    API configuration
│   └── vite.config.ts
├── downloads/           Downloaded files
├── templates/           yt-dlp template configs
├── .env                 Server configuration
└── package.json
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/info` | Get video/audio info from URL |
| GET | `/api/download/list` | List all downloads |
| GET | `/api/download/queue` | Get current queue status |
| POST | `/api/download` | Start a download |
| DELETE | `/api/download/:id` | Cancel a download |
| GET | `/api/download/browsers` | Detect installed browsers |
| POST | `/api/download/cookie-test` | Test cookie file access |
| GET | `/api/formats/quality-presets` | Get quality presets |
| GET | `/api/templates` | List templates |
| POST | `/api/templates` | Create template |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |

---

## Configuration

Environment variables in `.env`:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Backend server port |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Frontend URL for CORS |
| `NODE_ENV` | `development` | Environment mode |

---

## Queue & Download Persistence

The download queue and any interrupted (active) downloads are persisted to `server/state.json` so they survive backend restarts — including development restarts, which previously lost everything (e.g. saving settings mid-download restarted the backend via nodemon).

- **Queue:** pending jobs are restored and re-issued.
- **Active downloads:** interrupted jobs are re-issued with the same `-o` args, so yt-dlp resumes from the existing `.part` file.
- **Failed/interrupted downloads:** recorded in a `resumable` list and shown in the UI; they are *not* auto-restarted on boot, but each shows a **Resume** button that re-issues the original yt-dlp args so the `.part` file is continued.
- **Cancel** deletes the `.part` file, so a cancelled download is not resumable.
- `server/state.json` is runtime data and is gitignored.

In development, `nodemon.json` restricts watching to `server/**/*.js` and ignores `config.json` and `downloads/`, so changing settings no longer triggers a server restart.

---

## Roadmap

- [ ] Windows one-click installer
- [ ] macOS/Linux installer scripts
- [ ] Download history persistence
- [ ] Batch download support

---

## Credits

Fork of [Seal Web App](https://github.com/sh13y/Seal-Web-App) by [sh13y](https://github.com/sh13y).

## License

GPL-3.0
