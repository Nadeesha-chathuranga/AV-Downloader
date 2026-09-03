# AV Downloader — Distribution & Release Process

This documents how Windows installers are built, signed, and released, and how
automatic updates are delivered.

## Table of contents

- [Build artifacts](#build-artifacts)
- [Local release build](#local-release-build)
- [Code signing](#code-signing)
- [CI release pipeline](#ci-release-pipeline)
- [Automatic updates](#automatic-updates)
- [Runtime data locations](#runtime-data-locations)

---

## Build artifacts

`npm run dist` produces, in `dist/` (gitignored):

| Artifact | Purpose |
|---|---|
| `AV Downloader Setup <version>.exe` | NSIS installer (per-user, opt-in Start-menu + Desktop shortcuts) |
| `...exe.blockmap` | Delta-update map used by electron-updater |
| `latest.yml` | Update feed manifest (checksums used by electron-updater) |
| `win-unpacked/` | Unpacked app folder, used for testing before installing |

```bash
cd client && npm ci
cd ..
npm ci
npm run build    # client/dist production bundle
npm run gen:icon # regen icon.ico if buildResources/icon.svg changed
npm run dist     # electron-builder --win
```

Version is read from `package.json` (currently `1.0.2`). Bump `version` before
each release; tag the release `v<version>`. The installer's version and the
`latest.yml` update manifest are both derived from it, so the tag and
`package.json` must always agree (a mismatch would break the update diff).

## Code signing

Builds are currently **unsigned**. Consequences:

- SmartScreen shows **"Unknown publisher"** on first run of the installer and
  the unpacked `exe`. Suppress with **More info → Run anyway**.
- On machines with **Smart App Control** enabled (Windows Security → App &
  browser control), an unsigned app may be **blocked at launch entirely**
  ("An Application Control policy has blocked this file"). This is Windows'
  own safety feature, not an app defect — it relaxes once the file is
  reputation-known or signed. While testing unsigned builds you may need to
  temporarily flip Smart App Control to "Off" (it can't be turned back on
  without a Windows reinstall/Reset, so this is a user decision).
- Auto-update is unaffected (updates aren't verified by signature).

The signing pipeline is already wired: electron-builder auto-signs when these
environment variables are present (no code changes needed):

```bash
CSC_LINK=C:\path\to\certificate.p12
CSC_KEY_PASSWORD=<password>
export CSC_IDENTITY_AUTO_DISCOVERY=false   # ensures a specific cert is used
```

Use a certificate with a trust chain (e.g. DigiCert/GlobalSign OV) so the
"Publisher: AV Downloader" line shows correctly.

## CI release pipeline

`.github/workflows/release.yml` runs on any tag matching `v*` (and on manual
`workflow_dispatch`):

1. `windows-latest` runner, `actions/setup-node@v4` (Node 22, npm cache).
2. `npm ci` → `npm run gen:icon` → `npm run build`.
3. `npx electron-builder --win --publish always` with `GH_TOKEN` =
   `secrets.GITHUB_TOKEN`. When signing secrets (`CSC_LINK`,
   `CSC_KEY_PASSWORD`) are added to the repo, uncomment those env lines and the
   release is signed automatically.
4. Installer, `latest.yml`, and `.blockmap` uploaded as a workflow artifact.

To release (releases are cut from `main`, so first merge `dev01` into `main` via
a PR):

```bash
# 1. Bump package.json version, commit, and push
git tag v<version>            # e.g. v1.0.2 — on main, after the merge
git push origin v<version>
```

electron-builder then creates a GitHub Release from the tag and attaches the
installer + update metadata (this works on private repos; the client can't see
it, but tag-triggered publishing does).

## Automatic updates

Installed builds run a 30-minute update check (plus one on launch) via
`electron-bin-updater`/`electron-updater`, using the feed baked into
`app-update.yml` from the `publish: github` block. The `v*` GitHub Release
carries `latest.yml` so the client can diff versions.

**Important:** while the release repo (`Nadeesha-chathuranga/AV-Downloader`) is
**private**, an unauthenticated update check returns 401/404 and fails silently
— the app just skips updating. **Making the repo public activates automatic
updates with zero code changes.** Also note the updater never runs in
development (`app.isPackaged` guard).

## Runtime data locations

| Mode | Runtime data (`SEAL_DATA_DIR`) | Binaries |
|---|---|---|
| Desktop (packed) | `%APPDATA%\AV Downloader` | `%APPDATA%\AV Downloader\bin` |
| Desktop (dev, `electron .`) | `%APPDATA%\av-downloader` | `%APPDATA%\av-downloader\bin` |
| Web (`npm start`) | `server/` | `yt-dlp`/`ffmpeg` from PATH |

Runtime data is: `config.json`, `state.json`, `templates/templates.json`.
Binaries are cached and verified by SHA-256 (`bin/meta.json`); they are only
re-downloaded if missing or when the checksum source changes.

To force a fresh download in tests: delete the `bin` folder for the mode you're
testing.