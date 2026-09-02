/// <reference types="vite/client" />

interface Window {
  avDownloader?: {
    getClipboardText: () => Promise<string>;
  };
}
