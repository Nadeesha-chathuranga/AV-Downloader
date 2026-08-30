# AV Downloader — Frontend

React 19 + Vite 6 frontend for the AV Downloader, a web-based video/audio downloader. Concepts inspired by the [Seal Android app](https://github.com/JunkFood02/Seal).

## Stack

- React 19, TypeScript 5
- Vite 6 (build tooling and dev server)
- MUI 7 (UI components)
- socket.io-client (real-time download progress)
- 20 themes (10 neon dark + 10 light) via a React context + `localStorage`

## Structure

```
client/src/
├── components/
│   ├── DownloadForm.tsx      URL input, Get Info, formats, templates, custom args
│   ├── DownloadPanel.tsx     Active downloads with live progress + cancel
│   ├── DownloadHistory.tsx   Saved downloads, newest first, grouped Video/Audio
│   ├── PlaylistPanel.tsx     Playlist entry selection + bulk download
│   ├── FormatSelector.tsx    Pick a specific video/audio format
│   ├── TemplateEditor.tsx    Create/edit yt-dlp argument templates
│   ├── SettingsDialog.tsx    Queue/concurrency, speed limit, cookies, directory
│   ├── Header.tsx            App bar, theme switcher, connection status
│   └── UserGuideDialog.tsx   In-app usage guide
├── contexts/SocketContext.tsx  Live download/queue state over Socket.io
├── hooks/useSmoothedMetrics.ts Terminal-style smoothed speed readout
├── theme/                   Theme definitions + ThemeContext
└── config.ts                API base URL (REACT_APP_SERVER_URL)
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server (port 3000) |
| `npm run build` | `tsc -b && vite build` — type-check and build for production into `dist/` |
| `npm run preview` | Local preview of the production build |

A Vite dev-server proxy forwards `/api` and `/socket.io` to the backend (port 5000 by default), so frontend code can use relative URLs during development.

> **Known deployment gap:** `server/index.js` serves the built client from `client/build`, but `vite build` outputs to `client/dist`. A `npm run build` + `npm start` combination will therefore not serve the fresh build unless the output is copied/renamed to `build/` or the server path is updated.

The backend serves this build in production (see the root `README.md`). In development the backend runs separately on port 5000 and the client is configured via `REACT_APP_SERVER_URL` (see `client/.env`).

## Credits

This project is based on the ideas and core functionality from [JunkFood02/Seal](https://github.com/JunkFood02/Seal), adapting the Android downloader concepts to a web environment.
