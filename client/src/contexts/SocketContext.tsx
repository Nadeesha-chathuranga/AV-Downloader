import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { apiUrl } from '../config';

export interface DownloadInfo {
  id: string;
  url: string;
  status: 'queued' | 'starting' | 'downloading' | 'resuming' | 'completed' | 'error' | 'cancelled';
  progress: number;
  filename: string;
  error: string | null;
  totalSize?: string;
  totalSizeEstimated?: boolean;
  downloadedSize?: string;
  speed?: string;
  eta?: string;
  playlistId?: string;
  playlistIndex?: number;
  playlistTotal?: number;
}

interface PlaylistInfo {
  id: string;
  total: number;
  completed: number;
  failed: number;
  status: 'active' | 'completed' | 'partial';
}

interface SocketContextType {
  downloads: DownloadInfo[];
  playlists: Record<string, PlaylistInfo>;
  cancelDownload: (id: string) => void;
  resumeDownload: (id: string) => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [downloads, setDownloads] = useState<DownloadInfo[]>([]);
  const [playlists, setPlaylists] = useState<Record<string, PlaylistInfo>>({});

  const cancelDownload = useCallback(async (id: string) => {
    try {
      await fetch(`${apiUrl}/download/cancel/${id}`, { method: 'DELETE' });
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, status: 'cancelled' as const, error: 'Cancelled by user' } : d
        )
      );
    } catch (err) {
      console.error('Failed to cancel download:', err);
    }
  }, [apiUrl]);

  const resumeDownload = useCallback(async (id: string) => {
    try {
      await fetch(`${apiUrl}/download/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error('Failed to resume download:', err);
    }
  }, [apiUrl]);

  useEffect(() => {
    const serverUrl =
      process.env.NODE_ENV === 'production'
        ? window.location.origin
        : process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

    const newSocket = io(serverUrl);

    // Remove an individual download entry after a short grace period so the UI
    // keeps the "completed/error" state visible for a moment, then frees it.
    // Without this, entries accumulate for the lifetime of the page (and the
    // whole `downloads` array is re-mapped on every socket event) — a slow,
    // unbounded memory leak on long sessions.
    const pendingRemovals = new Map<string, number>();

    const scheduleRemoval = (id: string, delayMs = 10000) => {
      if (pendingRemovals.has(id)) clearTimeout(pendingRemovals.get(id));
      pendingRemovals.set(
        id,
        window.setTimeout(() => {
          pendingRemovals.delete(id);
          setDownloads((prev) => prev.filter((d) => d.id !== id));
        }, delayMs)
      );
    };

    newSocket.on('download-start', (download: DownloadInfo) => {
      setDownloads((prev) => {
        const exists = prev.find((d) => d.id === download.id);
        if (exists) return prev.map((d) => (d.id === download.id ? { ...d, ...download } : d));
        return [...prev, download];
      });
    });

    newSocket.on('download-progress', (download: DownloadInfo) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === download.id ? { ...d, ...download } : d))
      );
    });

    newSocket.on('download-complete', (download: DownloadInfo) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === download.id ? { ...d, ...download } : d))
      );
      scheduleRemoval(download.id);
      if (download.playlistId) {
        setPlaylists((prev) => {
          const pl = prev[download.playlistId!];
          if (!pl) return prev;
          return {
            ...prev,
            [download.playlistId!]: {
              ...pl,
              completed: pl.completed + 1,
              status: pl.completed + 1 >= pl.total ? 'completed' : 'active',
            },
          };
        });
      }
    });

    newSocket.on('download-error', (download: DownloadInfo) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === download.id ? { ...d, ...download } : d))
      );
      scheduleRemoval(download.id);
      if (download.playlistId) {
        setPlaylists((prev) => {
          const pl = prev[download.playlistId!];
          if (!pl) return prev;
          return {
            ...prev,
            [download.playlistId!]: {
              ...pl,
              failed: pl.failed + 1,
              status: 'partial',
            },
          };
        });
      }
    });

    newSocket.on('download-cancelled', (data: { id: string }) => {
      setDownloads((prev) => prev.filter((d) => d.id !== data.id));
    });

    newSocket.on('playlist-start', (data: { playlistId: string; total: number }) => {
      setPlaylists((prev) => ({
        ...prev,
        [data.playlistId]: {
          id: data.playlistId,
          total: data.total,
          completed: 0,
          failed: 0,
          status: 'active',
        },
      }));
    });

    newSocket.on('state-restore', (data: { downloads?: Array<{
      type?: 'active' | 'queued' | 'resumable';
      id: string;
      url: string;
      playlistId?: string;
      filename?: string;
      status?: string;
    }> }) => {
      const items = data?.downloads || [];
      if (items.length === 0) return;
      setDownloads((prev) => {
        const next = [...prev];
        for (const item of items) {
          if (next.some((d) => d.id === item.id)) continue;
          let status: DownloadInfo['status'] = 'queued';
          if (item.type === 'active') status = 'resuming';
          else if (item.type === 'resumable') status = 'error';
          next.push({
            id: item.id,
            url: item.url,
            status,
            progress: 0,
            filename: item.filename || '',
            error: item.type === 'resumable' ? 'Interrupted download' : null,
            playlistId: item.playlistId,
          });
        }
        return next;
      });
    });

    return () => {
      for (const t of pendingRemovals.values()) clearTimeout(t);
      pendingRemovals.clear();
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ downloads, playlists, cancelDownload, resumeDownload }}>
      {children}
    </SocketContext.Provider>
  );
};
