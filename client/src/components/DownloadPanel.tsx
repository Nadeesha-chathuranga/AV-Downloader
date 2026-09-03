import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  LinearProgress,
  Box,
  IconButton,
  Tooltip,
  Collapse,
  Slider,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassEmptyIcon,
  QueueMusic as PlaylistIcon,
  Close as CloseIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Queue as QueueIcon,
  RestartAlt as ResumeIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useSocket, DownloadInfo } from '../contexts/SocketContext';
import { apiUrl } from '../config';
import { useAppTheme } from '../theme/ThemeContext';
import { useSmoothedMetrics } from '../hooks/useSmoothedMetrics';

interface QueueState {
  maxConcurrent: number;
  activeCount: number;
  queueLength: number;
  queued: Array<{ id: string; url: string; info: DownloadInfo }>;
  active: string[];
}

const DownloadItem: React.FC<{
  download: DownloadInfo;
  resumeDownload: (id: string) => void;
  onCancel: (id: string, name: string) => void;
}> = ({ download, resumeDownload, onCancel }) => {
  const { currentTheme } = useAppTheme();
  const smooth = useSmoothedMetrics(download);

  const getStatusIcon = (status: string, size: number = 20) => {
    switch (status) {
      case 'starting':
        return <HourglassEmptyIcon sx={{ color: currentTheme.colors.info, fontSize: size }} />;
      case 'downloading':
        return <DownloadIcon sx={{ color: currentTheme.colors.primary, fontSize: size }} />;
      default:
        return <HourglassEmptyIcon sx={{ fontSize: size }} />;
    }
  };

  return (
    <Box
      className="downloading-indicator"
      sx={{
        mb: 2,
        p: 2,
        borderRadius: 1,
        background: `${currentTheme.colors.background}66`,
        border: `1px solid ${currentTheme.colors.border}`,
        transition: 'all 0.3s ease',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        {getStatusIcon(download.status, 18)}
        <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1, minWidth: 0 }} noWrap>
          {download.filename || 'Preparing...'}
        </Typography>
        {download.status === 'resuming' && (
          <>
            <Tooltip title="Resume download">
              <IconButton
                onClick={() => resumeDownload(download.id)}
                sx={{
                  p: 1,
                  width: 34,
                  height: 34,
                  color: currentTheme.colors.success,
                  '&:hover': { background: `${currentTheme.colors.success}22` },
                }}
              >
                <ResumeIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Dismiss">
              <IconButton
                onClick={() => onCancel(download.id, download.filename || 'this download')}
                sx={{
                  p: 1,
                  width: 34,
                  height: 34,
                  color: currentTheme.colors.error,
                  '&:hover': { background: `${currentTheme.colors.error}22` },
                }}
              >
                <CloseIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
        {download.status !== 'resuming' && (
          <Tooltip title="Cancel">
            <IconButton
              onClick={() => onCancel(download.id, download.filename || 'this download')}
              sx={{
                p: 1,
                width: 34,
                height: 34,
                color: currentTheme.colors.error,
                '&:hover': { background: `${currentTheme.colors.error}22` },
              }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: currentTheme.colors.primary, fontSize: '0.8rem' }}>
            {Math.round(download.progress)}%
          </Typography>
          {smooth.eta && smooth.eta !== 'Unknown' && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              ETA {smooth.eta}
            </Typography>
          )}
        </Box>
        <Box className="progress-glow">
          <LinearProgress
            variant="determinate"
            value={download.progress}
            sx={{
              height: 6,
              borderRadius: 0.75,
              '& .MuiLinearProgress-bar': {
                borderRadius: 0.75,
                background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                transition: 'transform 0.3s ease',
              },
            }}
          />
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          p: 1,
          borderRadius: 0.75,
          background: `${currentTheme.colors.background}88`,
        }}
      >
        {download.totalSize && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <StorageIcon sx={{ fontSize: 12, color: currentTheme.colors.info }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 500 }}>
              {download.totalSizeEstimated ? `~${download.totalSize}` : download.totalSize}
            </Typography>
          </Box>
        )}
        {smooth.speed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SpeedIcon sx={{ fontSize: 12, color: currentTheme.colors.success }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 500 }}>
              {smooth.speed}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// Memoized so that when the shared downloads array changes (a progress packet
// for ONE item arrives ~4x/sec), unaffected items don't re-render. Only items
// whose own `download` object identity changed will re-render.
const MemoizedDownloadItem = React.memo(DownloadItem);

const DownloadPanel: React.FC = () => {
  const { downloads, playlists, cancelDownload, resumeDownload } = useSocket();
  const { currentTheme } = useAppTheme();
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [queueExpanded, setQueueExpanded] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; name: string } | null>(null);
  // Local mirror of the server's max concurrent value. Kept in state so the
  // slider responds instantly while dragging, and only pushed to the server on
  // release (see onChangeCommitted) — instead of a network PUT per drag tick.
  const [localMaxConcurrent, setLocalMaxConcurrent] = useState(3);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await axios.get(`${apiUrl}/download/queue`);
      setQueueState(res.data);
    } catch {}
  }, [apiUrl]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const updateMaxConcurrent = useCallback(async (val: number) => {
    try {
      await axios.put(`${apiUrl}/download/queue/settings`, { maxConcurrentDownloads: val });
      fetchQueue();
    } catch {}
  }, [apiUrl, fetchQueue]);

  // Stable so React.memo can skip re-rendering unaffected DownloadItems.
  const handleCancelItem = useCallback((id: string, name: string) => {
    setCancelTarget({ id, name });
  }, []);

  const activeDownloads = downloads.filter(
    (d) => d.status === 'starting' || d.status === 'downloading' || d.status === 'resuming'
  );
  const failedDownloads = downloads.filter((d) => d.status === 'error');
  const queuedCount = queueState?.queueLength ?? 0;
  const maxConcurrent = queueState?.maxConcurrent ?? 3;
  const activePlaylistIds = Object.keys(playlists).filter(
    (id) => playlists[id].status === 'active'
  );

  // Keep the local slider value in sync when the server value changes (e.g. on
  // initial load / external change), but don't fight the user mid-drag.
  useEffect(() => {
    setLocalMaxConcurrent((prev) => (prev !== maxConcurrent ? maxConcurrent : prev));
  }, [maxConcurrent]);

  const hasContent =
    activeDownloads.length > 0 ||
    queuedCount > 0 ||
    failedDownloads.length > 0 ||
    activePlaylistIds.length > 0;

  const dividerSx = { borderColor: `${currentTheme.colors.border}`, opacity: 0.5 };

  return (
    <Box
      sx={{
        borderRadius: 1.5,
        backdropFilter: 'blur(20px) saturate(180%)',
        background: `linear-gradient(135deg, ${currentTheme.colors.surface}dd, ${currentTheme.colors.surface}aa)`,
        border: `1px solid ${currentTheme.colors.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 16px ${currentTheme.colors.primary}33`,
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <text x="16" y="24" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="22" fill="currentColor">AV</text>
            </svg>
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            Active Downloads
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
          {activeDownloads.length} active &middot; {queuedCount} queued
        </Typography>
      </Box>

      {!hasContent ? (
        <Box sx={{ px: 2.5, pb: 2.5 }}>
          <Box
            sx={{
              p: 4,
              borderRadius: 1,
              background: `${currentTheme.colors.background}44`,
              border: `1px solid ${currentTheme.colors.border}`,
              textAlign: 'center',
            }}
          >
            <DownloadIcon sx={{ fontSize: 40, color: `${currentTheme.colors.primary}44`, mb: 1.5 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.85rem' }}>
              No active downloads
            </Typography>
            <Typography variant="caption" sx={{ color: `${currentTheme.colors.textSecondary}88`, fontSize: '0.75rem' }}>
              Paste a URL and click Download
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ px: 2.5, pb: 2.5 }}>
          {/* Active Playlist Downloads */}
          {activePlaylistIds.map((plId) => {
            const pl = playlists[plId];
            const pct = pl.total > 0 ? Math.round(((pl.completed + pl.failed) / pl.total) * 100) : 0;
            return (
              <Box key={plId} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PlaylistIcon sx={{ color: currentTheme.colors.secondary, fontSize: 18 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }} noWrap>
                    Playlist Download
                  </Typography>
                  <Chip
                    label={`${pl.completed + pl.failed}/${pl.total}`}
                    size="small"
                    sx={{
                      background: `${currentTheme.colors.secondary}22`,
                      color: currentTheme.colors.secondary,
                      fontWeight: 700,
                      borderRadius: 0.75,
                      fontSize: '0.65rem',
                      height: 22,
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '100%', mr: 1.5 }}>
                    <LinearProgress variant="determinate" value={pct} />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: currentTheme.colors.secondary, minWidth: 36, textAlign: 'right', fontSize: '0.75rem' }}
                  >
                    {pct}%
                  </Typography>
                </Box>
                {pl.failed > 0 && (
                  <Typography variant="caption" sx={{ color: currentTheme.colors.error, mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
                    {pl.failed} failed
                  </Typography>
                )}
              </Box>
            );
          })}

          {/* Active Downloads */}
          {activeDownloads.map((download) => (
            <MemoizedDownloadItem
              key={download.id}
              download={download}
              resumeDownload={resumeDownload}
              onCancel={handleCancelItem}
            />
          ))}

          {/* Queue Section */}
          {queuedCount > 0 && (
            <>
              <Divider sx={{ ...dividerSx, mb: 2 }} />
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8 },
                    transition: 'opacity 0.2s ease',
                  }}
                  onClick={() => setQueueExpanded(!queueExpanded)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <QueueIcon sx={{ fontSize: 18, color: currentTheme.colors.warning }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Queue
                    </Typography>
                    <Chip
                      label={queuedCount}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        background: `${currentTheme.colors.warning}22`,
                        color: currentTheme.colors.warning,
                        borderRadius: 0.75,
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="Queue settings">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSettings(!showSettings);
                        }}
                        sx={{
                          width: 28,
                          height: 28,
                          color: showSettings ? currentTheme.colors.warning : 'text.secondary',
                        }}
                      >
                        <SettingsIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    {queueExpanded ? (
                      <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    )}
                  </Box>
                </Box>

                <Collapse in={showSettings}>
                  <Box
                    sx={{
                      mb: 1.5,
                      p: 1.5,
                      borderRadius: 0.75,
                      background: `${currentTheme.colors.background}88`,
                      border: `1px solid ${currentTheme.colors.border}`,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.7rem' }}>
                      Max Concurrent: {maxConcurrent}
                    </Typography>
                    <Slider
                      value={localMaxConcurrent}
                      // Update local state on every tick so the UI is instant,
                      // but only persist to the server once the drag is released.
                      onChange={(_, v) => setLocalMaxConcurrent(v as number)}
                      onChangeCommitted={(_, v) => updateMaxConcurrent(v as number)}
                      min={1}
                      max={10}
                      step={1}
                      marks
                      size="small"
                      sx={{
                        color: currentTheme.colors.warning,
                        mt: 0.5,
                        '& .MuiSlider-markLabel': { color: 'text.secondary', fontSize: '0.65rem' },
                        '& .MuiSlider-thumb': {
                          width: 14,
                          height: 14,
                          '&:hover': { boxShadow: `0 0 0 6px ${currentTheme.colors.warning}18` },
                        },
                      }}
                    />
                  </Box>
                </Collapse>

                <Collapse in={queueExpanded}>
                  {(queueState?.queued ?? []).slice(0, 15).map((job, i) => (
                    <Box
                      key={job.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 0.75,
                        p: 1,
                        borderRadius: 0.75,
                        background: `${currentTheme.colors.background}44`,
                        border: `1px solid ${currentTheme.colors.border}`,
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: `${currentTheme.colors.primary}33`,
                          background: `${currentTheme.colors.primary}08`,
                        },
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: currentTheme.colors.textSecondary, fontWeight: 700, fontSize: '0.65rem', minWidth: 20, textAlign: 'center' }}
                      >
                        {i + 1}
                      </Typography>
                      <Typography variant="caption" sx={{ flexGrow: 1, color: 'text.secondary', fontSize: '0.75rem' }} noWrap>
                        {job.info?.filename || job.url}
                      </Typography>
                      <Tooltip title="Cancel">
                        <IconButton
                          size="small"
                          onClick={() => setCancelTarget({ id: job.id, name: job.info?.filename || job.url || 'this download' })}
                          sx={{
                            width: 22,
                            height: 22,
                            color: currentTheme.colors.error,
                            opacity: 0.6,
                            '&:hover': { opacity: 1, background: `${currentTheme.colors.error}22` },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                  {queuedCount > 15 && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block', mt: 0.5, fontSize: '0.7rem' }}>
                      +{queuedCount - 15} more
                    </Typography>
                  )}
                </Collapse>
              </Box>
            </>
          )}

          {/* Failed Downloads */}
          {failedDownloads.length > 0 && (
            <>
              <Divider sx={{ ...dividerSx, mb: 2 }} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ErrorIcon sx={{ fontSize: 18, color: currentTheme.colors.error }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Failed
                  </Typography>
                  <Chip
                    label={failedDownloads.length}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      background: `${currentTheme.colors.error}22`,
                      color: currentTheme.colors.error,
                      borderRadius: 0.75,
                    }}
                  />
                </Box>
                {failedDownloads.slice(-5).map((d) => (
                  <Box
                    key={d.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 0.75,
                      p: 1,
                      borderRadius: 0.75,
                      background: `${currentTheme.colors.error}08`,
                      border: `1px solid ${currentTheme.colors.error}18`,
                    }}
                  >
                    <ErrorIcon sx={{ fontSize: 14, color: currentTheme.colors.error, flexShrink: 0 }} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }} noWrap display="block">
                        {d.filename || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: `${currentTheme.colors.error}aa`, fontSize: '0.65rem' }} noWrap display="block">
                        {d.error || 'Unknown error'}
                      </Typography>
                    </Box>
                    <Tooltip title="Resume download">
                      <IconButton
                        onClick={() => resumeDownload(d.id)}
                        sx={{
                          p: 0.75,
                          width: 30,
                          height: 30,
                          color: currentTheme.colors.success,
                          '&:hover': { background: `${currentTheme.colors.success}22` },
                        }}
                      >
                        <ResumeIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Dismiss">
                      <IconButton
                        onClick={() => cancelDownload(d.id)}
                        sx={{
                          p: 0.5,
                          width: 26,
                          height: 26,
                          color: 'text.secondary',
                          opacity: 0.5,
                          '&:hover': { opacity: 1, background: `${currentTheme.colors.error}22` },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        PaperProps={{
          sx: {
            background: `linear-gradient(135deg, ${currentTheme.colors.surface}ee, ${currentTheme.colors.surface}cc)`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${currentTheme.colors.border}`,
            borderRadius: 1.5,
            minWidth: 360,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Cancel Download?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary' }}>
            Are you sure you want to cancel{" "}
            <strong style={{ color: 'var(--mui-palette-text-primary)' }}>{cancelTarget?.name}</strong>?
          </DialogContentText>
          <DialogContentText sx={{ color: 'text.secondary', mt: 1 }}>
            The partially downloaded file will be deleted from disk and{" "}
            <strong style={{ color: 'var(--mui-palette-text-primary)' }}>cannot be resumed</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setCancelTarget(null)}
            sx={{
              borderColor: currentTheme.colors.border,
              color: 'text.primary',
              '&:hover': { borderColor: currentTheme.colors.primary, background: `${currentTheme.colors.primary}11` },
            }}
          >
            Keep Downloading
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (cancelTarget) {
                cancelDownload(cancelTarget.id);
                setCancelTarget(null);
              }
            }}
            sx={{ fontWeight: 700 }}
          >
            Cancel Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DownloadPanel;
