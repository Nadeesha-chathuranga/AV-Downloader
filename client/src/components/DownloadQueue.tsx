import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Collapse,
  Slider,
  Chip,
} from '@mui/material';
import {
  Queue as QueueIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAppTheme } from '../theme/ThemeContext';

interface QueueJob {
  id: string;
  url: string;
  info: {
    id: string;
    url: string;
    status: string;
    progress: number;
    filename: string;
    error: string | null;
  };
}

interface QueueState {
  maxConcurrent: number;
  activeCount: number;
  queueLength: number;
  queued: QueueJob[];
  active: string[];
}

interface DownloadQueueProps {
  downloads: Array<{ id: string; url: string; status: string; progress: number; filename: string }>;
  onCancel: (id: string) => void;
}

const DownloadQueue: React.FC<DownloadQueueProps> = ({ downloads, onCancel }) => {
  const { currentTheme } = useAppTheme();
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const apiUrl =
    process.env.NODE_ENV === 'production'
      ? '/api'
      : `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api`;

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

  const updateMaxConcurrent = async (val: number) => {
    try {
      await axios.put(`${apiUrl}/download/queue/settings`, { maxConcurrentDownloads: val });
      fetchQueue();
    } catch {}
  };

  const activeDownloads = downloads.filter(
    (d) => d.status === 'starting' || d.status === 'downloading'
  );
  const queuedCount = queueState?.queueLength ?? 0;
  const maxConcurrent = queueState?.maxConcurrent ?? 3;

  if (downloads.length === 0 && queuedCount === 0) return null;

  return (
    <Card
      className="glass-card"
      sx={{
        mb: 3,
        animation: 'fadeIn 0.5s ease 0.2s both',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: expanded ? 2 : 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${currentTheme.colors.warning}33, ${currentTheme.colors.error}33)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QueueIcon sx={{ color: currentTheme.colors.warning, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                Queue
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {activeDownloads.length} active, {queuedCount} queued
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={showSettings ? 'Hide settings' : 'Queue settings'}>
              <IconButton
                size="small"
                onClick={() => setShowSettings(!showSettings)}
                sx={{
                  color: showSettings ? currentTheme.colors.warning : 'text.secondary',
                  '&:hover': { color: currentTheme.colors.warning },
                }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{ color: 'text.secondary' }}
              >
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Collapse in={showSettings}>
          <Box
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 3,
              background: `${currentTheme.colors.surfaceAlt}66`,
              border: `1px solid ${currentTheme.colors.border}`,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Max Concurrent Downloads: {maxConcurrent}
            </Typography>
            <Slider
              value={maxConcurrent}
              onChange={(_, v) => updateMaxConcurrent(v as number)}
              min={1}
              max={10}
              step={1}
              marks
              sx={{
                color: currentTheme.colors.warning,
                '& .MuiSlider-markLabel': { color: 'text.secondary', fontSize: '0.7rem' },
              }}
            />
          </Box>
        </Collapse>

        <Collapse in={expanded}>
          <Box>
            {activeDownloads.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontSize: '0.7rem',
                    mb: 1,
                    display: 'block',
                  }}
                >
                  Active
                </Typography>
                {activeDownloads.map((d) => (
                  <Box
                    key={d.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      mb: 1,
                      p: 1.5,
                      borderRadius: 2,
                      background: `${currentTheme.colors.primary}11`,
                      border: `1px solid ${currentTheme.colors.primary}33`,
                    }}
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {d.filename || d.url}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {Math.round(d.progress)}%
                      </Typography>
                    </Box>
                    <Tooltip title="Cancel">
                      <IconButton
                        size="small"
                        onClick={() => onCancel(d.id)}
                        sx={{ color: currentTheme.colors.error }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            )}

            {queuedCount > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontSize: '0.7rem',
                    mb: 1,
                    display: 'block',
                  }}
                >
                  Queued ({queuedCount})
                </Typography>
                {(queueState?.queued ?? []).slice(0, 10).map((job, i) => (
                  <Box
                    key={job.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      mb: 1,
                      p: 1.5,
                      borderRadius: 2,
                      background: `${currentTheme.colors.surfaceAlt}44`,
                      border: `1px solid ${currentTheme.colors.border}`,
                    }}
                  >
                    <Chip
                      label={`#${i + 1}`}
                      size="small"
                      sx={{
                        background: `${currentTheme.colors.secondary}22`,
                        color: currentTheme.colors.secondary,
                        fontWeight: 700,
                        minWidth: 36,
                        borderRadius: 1.5,
                      }}
                    />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                        {job.url}
                      </Typography>
                    </Box>
                    <Tooltip title="Cancel">
                      <IconButton
                        size="small"
                        onClick={() => onCancel(job.id)}
                        sx={{ color: currentTheme.colors.error }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
                {queuedCount > 10 && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block', mt: 1 }}>
                    +{queuedCount - 10} more in queue
                  </Typography>
                )}
              </Box>
            )}

            {activeDownloads.length === 0 && queuedCount === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                No downloads in queue
              </Typography>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default DownloadQueue;
