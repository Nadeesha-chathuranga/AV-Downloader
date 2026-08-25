# Seal Web App — Full Windows Setup Guide

This guide covers installing **yt-dlp**, **ffmpeg**, **Node.js**, and then setting up **Seal Web App** on Windows using Git Bash.

---

## Part 1: Install yt-dlp

### Option 1: winget (recommended)

```bash
winget install yt-dlp
```

This installs it system-wide and adds it to PATH automatically.

### Option 2: Direct executable download

1. Go to the [yt-dlp releases page](https://github.com/yt-dlp/yt-dlp/releases)
2. Download `yt-dlp.exe`
3. Move it to a folder on your PATH — e.g. `C:\Windows\System32`, or create `C:\tools` and add it to PATH manually:
   - System Properties → Environment Variables → Path → New → add the folder path

### Option 3: pip (if Python is already installed)

```bash
pip install -U yt-dlp
```

### Verify installation

```bash
yt-dlp --version
```

---

## Part 2: Install ffmpeg

yt-dlp needs ffmpeg to merge separate audio/video streams and convert formats.

```bash
winget install ffmpeg
```

Or download a build from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) and add it to PATH the same way as above.

Verify:

```bash
ffmpeg -version
```

---

## Part 3: Install Node.js

Seal Web App needs Node.js (v16+) to run its Express backend and React frontend.

```bash
winget install OpenJS.NodeJS.LTS
```

Or download from [nodejs.org](https://nodejs.org/).

Verify:

```bash
node -v
npm -v
```

> Tip: if you manage Node versions with nvm, use Node **v22 LTS** rather than v24 — v24 has caused ESM/dependency compatibility issues in other projects.

---

## Part 4: Clone Seal Web App

In Git Bash, navigate to where you want the project:

```bash
git clone https://github.com/Nadeesha-chathuranga/Seal-Web-App.git
cd Seal-Web-App
```

---

## Part 5: Install dependencies

Install both the root/server dependencies and the client (React) dependencies:

```bash
npm install
npm run install:all
```

This pulls in Express, Socket.IO, React, MUI, and related packages.

---

## Part 6: (Optional) Configure environment variables

Create a `.env` file in the project root:

```
PORT=5000
NODE_ENV=development
```

If skipped, it defaults to port 5000.

---

## Part 7: Start the app

### Development mode (recommended for first run)

```bash
npm run dev
```

This starts:
- Backend on `http://localhost:5000`
- Frontend on `http://localhost:3000`

### Or start servers individually

```bash
npm run server:dev   # backend only
npm run client:dev   # frontend only
```

Open `http://localhost:3000` in your browser, paste a video URL, and test a download. Files save to `./downloads/`.

---

## Part 8: (Optional) Production build

```bash
npm run build
npm start
```

This serves the built React app and API together on port 5000.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `yt-dlp not found` | Confirm it's on PATH: `yt-dlp --version` |
| Permission errors | Check write permissions on the `downloads` folder |
| Download failures | Check URL support, internet connection, and whether the site needs authentication |
| Debug logging | Run `DEBUG=seal-web-app:* npm run dev` |

---

## Reference

- yt-dlp: https://github.com/yt-dlp/yt-dlp
- Seal Web App: https://github.com/Nadeesha-chathuranga/Seal-Web-App
