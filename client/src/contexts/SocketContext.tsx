import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiUrl } from '../config';

export interface DownloadInfo {
  id: string;
  url: string;
  status: 'queued' | 'starting' | 'downloading' | 'completed' | 'error' | 'cancelled';
  progress: number;
  filename: string;
  error: string | null;
  totalSize?: string;
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

interface QueueState {
  maxConcurrent: number;
  activeCount: number;
  queueLength: number;
}

interface SocketContextType {
  socket: Socket | null;
  downloads: DownloadInfo[];
  playlists: Record<string, PlaylistInfo>;
  queue: QueueState;
  cancelDownload: (id: string) => void;
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [downloads, setDownloads] = useState<DownloadInfo[]>([]);
  const [playlists, setPlaylists] = useState<Record<string, PlaylistInfo>>({});
  const [queue] = useState<QueueState>({ maxConcurrent: 3, activeCount: 0, queueLength: 0 });

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

  useEffect(() => {
    const serverUrl =
      process.env.NODE_ENV === 'production'
        ? window.location.origin
        : process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

    const newSocket = io(serverUrl);
    setSocket(newSocket);

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
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === data.id ? { ...d, status: 'cancelled' as const, error: 'Cancelled by user' } : d
        )
      );
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

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, downloads, playlists, queue, cancelDownload }}>
      {children}
    </SocketContext.Provider>
  );
};
