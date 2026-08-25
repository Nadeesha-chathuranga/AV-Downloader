# Seal Web App — Windows Setup

One-click installer and launcher for [Seal Web App](https://github.com/Nadeesha-chathuranga/Seal-Web-App) on Windows.

Seal Web App is a web-based video downloader powered by yt-dlp and ffmpeg. This tool automates the entire setup process so you can start downloading videos in seconds.

---

## Quick Start

### Fresh Install (Easiest)

1. Double-click `install.bat`
2. Done — everything is installed automatically
3. Run `start.bat` to launch the app

### Fresh Install (Interactive)

1. Run `install.ps1` (right-click -> "Run with PowerShell")
2. Follow the prompts to choose location and options
3. Run `start.bat` to launch the app

### Fresh Install (Power User)

```powershell
# Fully automated with defaults
.\install.ps1 -Auto

# Custom location
.\install.ps1 -Auto -Path "C:\MyApps\Seal-Web-App"

# Custom location, no desktop shortcut
.\install.ps1 -Auto -Path "C:\MyApps\Seal-Web-App" -NoShortcut
```

### Already Installed

Just double-click `start.bat`.

### Update to Latest Version

Double-click `update.bat` to pull the latest code and update yt-dlp/ffmpeg.

---

## Files

| File | Description |
|---|---|
| `install.bat` | One-click installer. Double-click to install everything automatically. |
| `install.ps1` | Full installer with options. Supports `-Auto`, `-Path`, `-NoShortcut` parameters. |
| `start.bat` | Launches the app. Checks ports, starts servers, opens browser automatically. |
| `update.bat` | Updates everything — pulls latest code, reinstalls npm deps, upgrades yt-dlp and ffmpeg. |
| `uninstall.bat` | Removes the app and optionally uninstalls tools. |

---

## What Gets Installed

| Tool | Purpose | Installed By |
|---|---|---|
| [Git](https://git-scm.com) | Clone and update the repository | `winget install Git.Git` |
| [Node.js](https://nodejs.org) (v22 LTS) | Run the Express backend and React frontend | `winget install OpenJS.NodeJS.LTS` |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Download videos from thousands of sites | `winget install yt-dlp` |
| [ffmpeg](https://ffmpeg.org) | Merge audio/video streams and convert formats | `winget install Gyan.FFmpeg` |

All tools are optional — if you already have them, the installer skips them automatically.

---

## Requirements

- Windows 10 or 11
- Internet connection (for initial install and video downloads)
- [winget](https://github.com/microsoft/winget-cli) package manager (comes pre-installed on Windows 11)

---

## Installation Details

### Default Install Location

```
%USERPROFILE%\Documents\GitHub\Seal-Web-App
```

During installation, you can choose a custom location or use the default.

### Desktop Shortcut

The installer offers to create a `Seal Web App.bat` shortcut on your Desktop for easy access.

### Install Log

After installation, a log file is saved to `install.log` in the project folder. Share this if you need help troubleshooting.

### Installer Parameters

| Parameter | Description | Example |
|---|---|---|
| `-Auto` | Skip all prompts, use defaults | `.\install.ps1 -Auto` |
| `-Path "C:\..."` | Custom install location | `.\install.ps1 -Path "C:\MyDir"` |
| `-NoShortcut` | Skip desktop shortcut creation | `.\install.ps1 -NoShortcut` |

Parameters can be combined: `.\install.ps1 -Auto -Path "C:\Apps" -NoShortcut`

---

## Updating

Run `update.bat` at any time to:

- Pull the latest code from GitHub
- Reinstall npm dependencies (in case new ones were added)
- Upgrade yt-dlp (frequently updated for site compatibility)
- Upgrade ffmpeg

---

## Uninstalling

Run `uninstall.bat` to remove:

- The Seal Web App project folder
- The Desktop shortcut (if created)
- Optionally: yt-dlp, ffmpeg, Node.js, Git

---

## Troubleshooting

| Issue | Solution |
|---|---|
| PowerShell blocks `install.ps1` | Use `install.bat` instead (no PowerShell restrictions), or right-click -> "Run with PowerShell" |
| `yt-dlp not found` after install | Close and reopen your terminal, or run: `refreshenv` |
| Port 3000 or 5000 already in use | Close the other application using that port, or the script will warn you before starting |
| Downloads failing | Check the URL is supported by yt-dlp: `yt-dlp --list-extractors` |
| Node.js version error | Install Node.js v22 LTS: `winget install OpenJS.NodeJS.LTS` |
| Debug mode | Run: `set DEBUG=seal-web-app:* && npm run dev` |
| Still stuck? | Check the [Seal Web App issues](https://github.com/Nadeesha-chathuranga/Seal-Web-App/issues) or share your `install.log` |

---

## Credits

A web-based video downloader powered by yt-dlp and ffmpeg.

### Dependencies

| Tool | Repository |
|---|---|
| **yt-dlp** | https://github.com/yt-dlp/yt-dlp |
| **ffmpeg** | https://ffmpeg.org |
| **Node.js** | https://nodejs.org |
| **Git** | https://git-scm.com |

---

## License

See the repository for license information.
