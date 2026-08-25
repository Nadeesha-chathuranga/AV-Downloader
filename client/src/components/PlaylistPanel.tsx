import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  SelectAll as SelectAllIcon,
  Deselect as DeselectAllIcon,
  Download as DownloadIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { useAppTheme } from '../theme/ThemeContext';

interface PlaylistEntry {
  id: string;
  title: string;
  url: string;
  duration: number;
  uploader: string;
}

interface PlaylistPanelProps {
  entries: PlaylistEntry[];
  onDownload: (selected: PlaylistEntry[]) => void;
  loading: boolean;
}

const PlaylistPanel: React.FC<PlaylistPanelProps> = ({ entries, onDownload, loading }) => {
  const [selected, setSelected] = useState<Set<number>>(new Set(entries.map((_, i) => i)));
  const { currentTheme } = useAppTheme();

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(entries.map((_, i) => i)));
  const deselectAll = () => setSelected(new Set());

  const totalDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  return (
    <Card
      sx={{
        mt: 2,
        background: `${currentTheme.colors.surfaceAlt}44`,
        border: `1px solid ${currentTheme.colors.border}`,
        borderRadius: 3,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                background: `linear-gradient(135deg, ${currentTheme.colors.secondary}, ${currentTheme.colors.primary})`,
              }}
            >
              <PlayIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Playlist
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {entries.length} videos &middot; {formatDuration(totalDuration)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Select all">
              <Button
                size="small"
                startIcon={<SelectAllIcon sx={{ fontSize: 16 }} />}
                onClick={selectAll}
                disabled={selected.size === entries.length}
                sx={{
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  '&:hover': { color: currentTheme.colors.primary },
                }}
              >
                All
              </Button>
            </Tooltip>
            <Tooltip title="Deselect all">
              <Button
                size="small"
                startIcon={<DeselectAllIcon sx={{ fontSize: 16 }} />}
                onClick={deselectAll}
                disabled={selected.size === 0}
                sx={{
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  '&:hover': { color: currentTheme.colors.error },
                }}
              >
                None
              </Button>
            </Tooltip>
          </Box>
        </Box>

        <Box
          sx={{
            maxHeight: 320,
            overflowY: 'auto',
            borderRadius: 2,
            background: `${currentTheme.colors.surface}44`,
            border: `1px solid ${currentTheme.colors.border}`,
            '&::-webkit-scrollbar': {
              width: 6,
            },
            '&::-webkit-scrollbar-thumb': {
              background: `${currentTheme.colors.border}`,
              borderRadius: 3,
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
          }}
        >
          <List dense disablePadding>
            {entries.map((entry, index) => (
              <React.Fragment key={entry.id || index}>
                <ListItem
                  disablePadding
                  secondaryAction={
                    <Typography variant="caption" sx={{ color: 'text.secondary', pr: 1, minWidth: 40, textAlign: 'right' }}>
                      {formatDuration(entry.duration)}
                    </Typography>
                  }
                >
                  <ListItemButton
                    onClick={() => toggleSelect(index)}
                    sx={{
                      py: 1,
                      px: 1,
                      '&:hover': {
                        background: `${currentTheme.colors.primary}11`,
                      },
                    }}
                  >
                    <Checkbox
                      checked={selected.has(index)}
                      size="small"
                      sx={{
                        color: `${currentTheme.colors.border}`,
                        '&.Mui-checked': {
                          color: currentTheme.colors.primary,
                        },
                        mr: 0.5,
                      }}
                    />
                    <ListItemAvatar sx={{ minWidth: 56 }}>
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 48,
                          height: 28,
                          background: `${currentTheme.colors.surfaceAlt}`,
                          fontSize: '0.6rem',
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: selected.has(index) ? 600 : 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: selected.has(index) ? 'text.primary' : 'text.secondary',
                          }}
                        >
                          {entry.title || 'Untitled'}
                        </Typography>
                      }
                      secondary={
                        entry.uploader && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                            {entry.uploader}
                          </Typography>
                        )
                      }
                    />
                  </ListItemButton>
                </ListItem>
                {index < entries.length - 1 && (
                  <Divider component="li" sx={{ opacity: 0.5 }} />
                )}
              </React.Fragment>
            ))}
          </List>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2.5 }}>
          <Chip
            label={`${selected.size} of ${entries.length} selected`}
            size="small"
            sx={{
              background: selected.size > 0 ? `${currentTheme.colors.primary}22` : `${currentTheme.colors.textSecondary}22`,
              color: selected.size > 0 ? currentTheme.colors.primary : currentTheme.colors.textSecondary,
              fontWeight: 600,
              borderRadius: 2,
            }}
          />

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              const selectedEntries = entries.filter((_, i) => selected.has(i));
              onDownload(selectedEntries);
            }}
            disabled={loading || selected.size === 0}
            sx={{ px: 3 }}
          >
            Download Selected
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PlaylistPanel;
