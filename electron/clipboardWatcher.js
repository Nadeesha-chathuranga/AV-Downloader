const { clipboard } = require('electron');

// Lightweight URL-ish matcher used by the watcher. The renderer re-validates
// with its own looksLikeUrl before filling the field, so being loose here is
// intentional: scheme URLs, www URLs, and bare domains with a path.
const URL_RE =
  /\bhttps?:\/\/[^\s<>"']+|www\.[^\s<>"']+|\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\/[^\s<>"']*/gi;

const POLL_MS = 4000;

function extractUrl(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(URL_RE);
  return match ? match[match.length - 1].trim() : null;
}

// Polls the clipboard for newly copied links. While enabled, a fresh URL that
// differs from the last handled one is forwarded to the callback (main usually
// shows the window and pushes it to the renderer as a deep-link).
class ClipboardWatcher {
  constructor() {
    this.enabled = false;
    this.lastSeen = '';
    this.lastHandled = '';
    this.timer = null;
    this.handler = null;
  }

  setHandler(handler) {
    this.handler = handler;
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    if (this.enabled && !this.timer) {
      this.lastSeen = clipboard.readText();
      this.timer = setInterval(() => this.check(), POLL_MS);
    } else if (!this.enabled && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  check() {
    if (!this.enabled) return;
    const text = clipboard.readText();
    if (text === this.lastSeen || text === this.lastHandled) return;
    this.lastSeen = text;
    const url = extractUrl(text);
    if (url && url !== this.lastHandled && this.handler) {
      this.lastHandled = url;
      this.handler(url);
    }
  }

  stop() {
    this.setEnabled(false);
  }
}

module.exports = { ClipboardWatcher, extractUrl };