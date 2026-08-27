import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Movie as MovieIcon,
  AudioFile as AudioFileIcon,
  InsertDriveFile as FileIcon,
  FolderOpen as FolderIcon,
} from '@mui/icons-material';
import { Button, ButtonGroup } from '@mui/material';
import axios from 'axios';
import { useAppTheme } from '../theme/ThemeContext';
import { apiUrl } from '../config';

interface DownloadedFile {
  name: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

const DownloadHistory: React.FC = () => {
  const [files, setFiles] = useState<DownloadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'video' | 'audio'>('video');
  const { currentTheme } = useAppTheme();

  const videos = files.filter((f) => getFileType(f.name) === 'video');
  const audios = files.filter((f) => getFileType(f.name) === 'audio');
  const visibleFiles = tab === 'video' ? videos : audios;

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${apiUrl}/download/list`);
      setFiles(response.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load download history');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const deleteFile = async (filename: string) => {
    try {
      await axios.delete(`${apiUrl}/download/${encodeURIComponent(filename)}`);
      setFiles(files.filter((file) => file.name !== filename));
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileType = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '')) return 'video';
    if (['mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac'].includes(extension || '')) return 'audio';
    return 'unknown';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <MovieIcon sx={{ fontSize: 20 }} />;
      case 'audio':
        return <AudioFileIcon sx={{ fontSize: 20 }} />;
      default:
        return <FileIcon sx={{ fontSize: 20 }} />;
    }
  };

  const getFileTypeStyle = (type: string) => {
    switch (type) {
      case 'video':
        return { bg: `${currentTheme.colors.primary}22`, color: currentTheme.colors.primary };
      case 'audio':
        return { bg: `${currentTheme.colors.secondary}22`, color: currentTheme.colors.secondary };
      default:
        return { bg: `${currentTheme.colors.textSecondary}22`, color: currentTheme.colors.textSecondary };
    }
  };

  return (
    <Card
      className="glass-card"
      sx={{
        animation: 'fadeIn 0.5s ease 0.2s both',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                background: `linear-gradient(135deg, ${currentTheme.colors.success}33, ${currentTheme.colors.secondary}33)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderIcon sx={{ color: currentTheme.colors.success, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                Download History
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {videos.length} videos, {audios.length} audio files
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ButtonGroup
              variant="outlined"
              size="small"
              sx={{
                borderColor: currentTheme.colors.border,
                borderRadius: 0.75,
                '& .MuiButtonGroup-grouped': { borderColor: currentTheme.colors.border },
              }}
            >
              <Button
                startIcon={<MovieIcon sx={{ fontSize: 15 }} />}
                onClick={() => setTab('video')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  background: tab === 'video' ? currentTheme.colors.primary : 'transparent',
                  borderColor: currentTheme.colors.border,
                  color: tab === 'video' ? '#fff' : 'text.secondary',
                  '&:hover': {
                    borderColor: currentTheme.colors.primary,
                    background: tab === 'video' ? currentTheme.colors.primary : `${currentTheme.colors.primary}22`,
                  },
                }}
              >
                Video ({videos.length})
              </Button>
              <Button
                startIcon={<AudioFileIcon sx={{ fontSize: 15 }} />}
                onClick={() => setTab('audio')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  background: tab === 'audio' ? currentTheme.colors.secondary : 'transparent',
                  borderColor: currentTheme.colors.border,
                  color: tab === 'audio' ? '#fff' : 'text.secondary',
                  '&:hover': {
                    borderColor: currentTheme.colors.secondary,
                    background: tab === 'audio' ? currentTheme.colors.secondary : `${currentTheme.colors.secondary}22`,
                  },
                }}
              >
                Audio ({audios.length})
              </Button>
            </ButtonGroup>
            <Tooltip title="Refresh">
              <IconButton
                onClick={fetchFiles}
                disabled={loading}
                sx={{
                  color: 'text.secondary',
                  transition: 'all 0.2s ease',
                  '&:hover': { color: currentTheme.colors.primary },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: 1.5,
              background: `${currentTheme.colors.error}15`,
              border: `1px solid ${currentTheme.colors.error}33`,
            }}
          >
            {error}
          </Alert>
        )}

        {visibleFiles.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 6,
              color: 'text.secondary',
            }}
          >
            {tab === 'video' ? <MovieIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} /> : <AudioFileIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />}
            <Typography variant="body2">
              {tab === 'video' ? 'No videos downloaded yet' : 'No audio files yet'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {visibleFiles.map((file, index) => {
              const fileType = getFileType(file.name);
              const typeStyle = getFileTypeStyle(fileType);
              return (
                <ListItem
                  key={index}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    background: `${currentTheme.colors.surfaceAlt}33`,
                    border: `1px solid ${currentTheme.colors.border}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: `${currentTheme.colors.surfaceAlt}66`,
                      borderColor: `${currentTheme.colors.primary}44`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      background: typeStyle.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1.5,
                      color: typeStyle.color,
                      flexShrink: 0,
                    }}
                  >
                    {getFileIcon(fileType)}
                  </Box>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {file.name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatFileSize(file.size)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatDate(file.createdAt)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Delete">
                      <IconButton
                        edge="end"
                        onClick={() => deleteFile(file.name)}
                        sx={{
                          color: 'text.secondary',
                          transition: 'all 0.2s ease',
                          '&:hover': { color: currentTheme.colors.error },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default DownloadHistory;
