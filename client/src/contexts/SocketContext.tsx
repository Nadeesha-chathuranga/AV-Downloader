import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface DownloadInfo {
  id: string;
  url: string;
  status: 'starting' | 'downloading' | 'completed' | 'error';
  progress: number;
  filename: string;
  error: string | null;
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
  socket: Socket | null;
  downloads: DownloadInfo[];
  playlists: Record<string, PlaylistInfo>;
  addDownload: (download: DownloadInfo) => void;
  updateDownload: (id: string, updates: Partial<DownloadInfo>) => void;
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

  useEffect(() => {
    const serverUrl = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

    const newSocket = io(serverUrl);
    setSocket(newSocket);

    newSocket.on('download-start', (download: DownloadInfo) => {
      setDownloads(prev => [...prev, download]);
    });

    newSocket.on('download-progress', (download: DownloadInfo) => {
      setDownloads(prev =>
        prev.map(d => d.id === download.id ? { ...d, ...download } : d)
      );
    });

    newSocket.on('download-complete', (download: DownloadInfo) => {
      setDownloads(prev =>
        prev.map(d => d.id === download.id ? { ...d, ...download } : d)
      );
      if (download.playlistId) {
        setPlaylists(prev => {
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
      setDownloads(prev =>
        prev.map(d => d.id === download.id ? { ...d, ...download } : d)
      );
      if (download.playlistId) {
        setPlaylists(prev => {
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

    newSocket.on('playlist-start', (data: { playlistId: string; total: number }) => {
      setPlaylists(prev => ({
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

  const addDownload = (download: DownloadInfo) => {
    setDownloads(prev => [...prev, download]);
  };

  const updateDownload = (id: string, updates: Partial<DownloadInfo>) => {
    setDownloads(prev =>
      prev.map(d => d.id === id ? { ...d, ...updates } : d)
    );
  };

  return (
    <SocketContext.Provider value={{ socket, downloads, playlists, addDownload, updateDownload }}>
      {children}
    </SocketContext.Provider>
  );
};
