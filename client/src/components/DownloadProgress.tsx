import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassEmptyIcon,
  QueueMusic as PlaylistIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import { useAppTheme } from '../theme/ThemeContext';

const DownloadProgress: React.FC = () => {
  const { downloads, playlists, cancelDownload } = useSocket();
  const { currentTheme } = useAppTheme();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'starting':
        return <HourglassEmptyIcon sx={{ color: currentTheme.colors.info, fontSize: 20 }} />;
      case 'downloading':
        return <DownloadIcon sx={{ color: currentTheme.colors.primary, fontSize: 20 }} />;
      case 'completed':
        return <CheckCircleIcon sx={{ color: currentTheme.colors.success, fontSize: 20 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: currentTheme.colors.error, fontSize: 20 }} />;
      default:
        return <HourglassEmptyIcon sx={{ fontSize: 20 }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'starting':
        return { bg: `${currentTheme.colors.info}22`, color: currentTheme.colors.info };
      case 'downloading':
        return { bg: `${currentTheme.colors.primary}22`, color: currentTheme.colors.primary };
      case 'completed':
        return { bg: `${currentTheme.colors.success}22`, color: currentTheme.colors.success };
      case 'error':
        return { bg: `${currentTheme.colors.error}22`, color: currentTheme.colors.error };
      default:
        return { bg: `${currentTheme.colors.textSecondary}22`, color: currentTheme.colors.textSecondary };
    }
  };

  const activeDownloads = downloads.filter((d) => d.status === 'starting' || d.status === 'downloading');
  const recentDownloads = downloads.filter((d) => d.status === 'completed' || d.status === 'error').slice(-5);
  const activePlaylistIds = Object.keys(playlists).filter((id) => playlists[id].status === 'active');

  if (downloads.length === 0) {
    return null;
  }

  return (
    <Card
      className="glass-card"
      sx={{
        mb: 3,
        animation: 'fadeIn 0.5s ease 0.1s both',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              background: `linear-gradient(135deg, ${currentTheme.colors.primary}33, ${currentTheme.colors.info}33)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DownloadIcon sx={{ color: currentTheme.colors.primary, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
              Progress
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {activeDownloads.length} active, {recentDownloads.length} recent
            </Typography>
          </Box>
        </Box>

        {activePlaylistIds.map((plId) => {
          const pl = playlists[plId];
          const pct = pl.total > 0 ? Math.round(((pl.completed + pl.failed) / pl.total) * 100) : 0;
          return (
            <Box
              key={plId}
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 1.5,
                background: `${currentTheme.colors.secondary}11`,
                border: `1px solid ${currentTheme.colors.secondary}33`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PlaylistIcon sx={{ color: currentTheme.colors.secondary, fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                  Playlist Download
                </Typography>
                <Chip
                  label={`${pl.completed + pl.failed}/${pl.total}`}
                  size="small"
                  sx={{
                    background: `${currentTheme.colors.secondary}22`,
                    color: currentTheme.colors.secondary,
                    fontWeight: 600,
                    borderRadius: 0.75,
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1.5 }}>
                  <LinearProgress variant="determinate" value={pct} />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: currentTheme.colors.secondary, minWidth: 40, textAlign: 'right' }}>
                  {pct}%
                </Typography>
              </Box>
              {pl.failed > 0 && (
                <Typography variant="caption" sx={{ color: currentTheme.colors.error, mt: 0.5, display: 'block' }}>
                  {pl.failed} failed
                </Typography>
              )}
            </Box>
          );
        })}

        {activeDownloads.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontSize: '0.7rem',
                mb: 1.5,
                display: 'block',
              }}
            >
              Active Downloads
            </Typography>

            {activeDownloads.map((download) => {
              const statusStyle = getStatusColor(download.status);
              return (
                <Box
                  key={download.id}
                  sx={{
                    mb: 2,
                    p: 2,
                    borderRadius: 1.5,
                    background: `${currentTheme.colors.surfaceAlt}44`,
                    border: `1px solid ${currentTheme.colors.border}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    {getStatusIcon(download.status)}
                    <Box sx={{ ml: 1.5, flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {download.filename || 'Preparing download...'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                        {download.url}
                      </Typography>
                    </Box>
                    <Chip
                      label={download.status}
                      size="small"
                      sx={{
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        fontWeight: 600,
                        borderRadius: 0.75,
                        fontSize: '0.7rem',
                      }}
                    />
                    {(download.status === 'starting' || download.status === 'downloading' || download.status === 'queued') && (
                      <Tooltip title="Cancel download">
                        <IconButton
                          size="small"
                          onClick={() => cancelDownload(download.id)}
                          sx={{
                            ml: 0.5,
                            color: currentTheme.colors.error,
                            '&:hover': { background: `${currentTheme.colors.error}22` },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>

                  {download.status === 'downloading' && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ width: '100%', mr: 1.5 }}>
                        <LinearProgress variant="determinate" value={download.progress} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: currentTheme.colors.primary, minWidth: 40, textAlign: 'right' }}>
                        {Math.round(download.progress)}%
                      </Typography>
                    </Box>
                  )}

                  {download.error && (
                    <Alert
                      severity="error"
                      sx={{
                        mt: 1,
                        borderRadius: 1,
                        background: `${currentTheme.colors.error}15`,
                        border: `1px solid ${currentTheme.colors.error}33`,
                        py: 0,
                      }}
                    >
                      {download.error}
                    </Alert>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {recentDownloads.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontSize: '0.7rem',
                mb: 1.5,
                display: 'block',
              }}
            >
              Recent
            </Typography>

            <List dense disablePadding>
              {recentDownloads.map((download) => {
                const statusStyle = getStatusColor(download.status);
                return (
                  <ListItem
                    key={download.id}
                    sx={{
                      mb: 1,
                      borderRadius: 1,
                      background: `${currentTheme.colors.surfaceAlt}33`,
                      border: `1px solid ${currentTheme.colors.border}`,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {getStatusIcon(download.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                          {download.filename || 'Unknown file'}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                          {download.error ? `Error: ${download.error}` : download.url}
                        </Typography>
                      }
                    />
                    <Chip
                      label={download.status}
                      size="small"
                      sx={{
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        fontWeight: 600,
                        borderRadius: 0.75,
                        fontSize: '0.7rem',
                      }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DownloadProgress;
