/// <reference types="vite/client" />

interface Window {
  avDownloader?: {
    getClipboardText: () => Promise<string>;
    getPendingDeepLink: () => Promise<string | null>;
    setClipboardWatch: (enabled: boolean) => void;
    onDeepLink: (cb: (url: string) => void) => () => void;
  };
}
