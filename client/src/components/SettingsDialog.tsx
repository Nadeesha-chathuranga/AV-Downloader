import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Slider,
  Divider,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Close as CloseIcon,
  Settings as SettingsIcon,
  Queue as QueueIcon,
  VideoFile as VideoIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAppTheme } from '../theme/ThemeContext';
import { themes } from '../theme/themes';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface AppSettings {
  maxConcurrentDownloads: number;
  downloadPath: string;
  defaultAudioFormat: string;
  defaultVideoQuality: string;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const { currentTheme, setTheme } = useAppTheme();
  const [settings, setSettings] = useState<AppSettings>({
    maxConcurrentDownloads: 3,
    downloadPath: './downloads',
    defaultAudioFormat: 'mp3',
    defaultVideoQuality: 'best',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const apiUrl =
    process.env.NODE_ENV === 'production'
      ? '/api'
      : `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api`;

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${apiUrl}/download/queue`);
      setSettings((prev) => ({
        ...prev,
        maxConcurrentDownloads: res.data.maxConcurrent || 3,
      }));
    } catch {}
  }, [apiUrl]);

  useEffect(() => {
    if (open) {
      fetchSettings();
      setSaved(false);
    }
  }, [open, fetchSettings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put(`${apiUrl}/download/queue/settings`, {
        maxConcurrentDownloads: settings.maxConcurrentDownloads,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setLoading(false);
  };

  const audioFormats = ['mp3', 'm4a', 'flac', 'wav', 'ogg', 'aac'];
  const videoQualities = [
    { value: 'best', label: 'Best Available' },
    { value: '2160', label: '4K (2160p)' },
    { value: '1440', label: '2K (1440p)' },
    { value: '1080', label: '1080p' },
    { value: '720', label: '720p' },
    { value: '480', label: '480p' },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: `${currentTheme.colors.surface}ee`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${currentTheme.colors.border}`,
          borderRadius: 4,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${currentTheme.colors.primary}33, ${currentTheme.colors.secondary}33)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SettingsIcon sx={{ color: currentTheme.colors.primary, fontSize: 20 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            Settings
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Theme Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <PaletteIcon sx={{ fontSize: 18, color: currentTheme.colors.secondary }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Appearance
            </Typography>
          </Box>
          <FormControl fullWidth size="small">
            <InputLabel>Theme</InputLabel>
            <Select
              value={currentTheme.id}
              label="Theme"
              onChange={(e) => setTheme(e.target.value as string)}
            >
              {themes.map((t) => (
                <MenuItem key={t.name} value={t.name}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: t.colors.primary }} />
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: t.colors.secondary }} />
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: t.colors.background }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.name}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ borderColor: currentTheme.colors.border, mb: 3 }} />

        {/* Queue Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <QueueIcon sx={{ fontSize: 18, color: currentTheme.colors.warning }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Download Queue
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
            Max concurrent downloads: <strong>{settings.maxConcurrentDownloads}</strong>
          </Typography>
          <Slider
            value={settings.maxConcurrentDownloads}
            onChange={(_, v) => setSettings((prev) => ({ ...prev, maxConcurrentDownloads: v as number }))}
            min={1}
            max={10}
            step={1}
            marks
            sx={{
              color: currentTheme.colors.warning,
              '& .MuiSlider-markLabel': { color: 'text.secondary', fontSize: '0.65rem' },
            }}
          />
        </Box>

        <Divider sx={{ borderColor: currentTheme.colors.border, mb: 3 }} />

        {/* Defaults Section */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <VideoIcon sx={{ fontSize: 18, color: currentTheme.colors.info }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Defaults
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Audio Format</InputLabel>
              <Select
                value={settings.defaultAudioFormat}
                label="Audio Format"
                onChange={(e) => setSettings((prev) => ({ ...prev, defaultAudioFormat: e.target.value }))}
              >
                {audioFormats.map((fmt) => (
                  <MenuItem key={fmt} value={fmt}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500, textTransform: 'uppercase' }}>{fmt}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Video Quality</InputLabel>
              <Select
                value={settings.defaultVideoQuality}
                label="Video Quality"
                onChange={(e) => setSettings((prev) => ({ ...prev, defaultVideoQuality: e.target.value }))}
              >
                {videoQualities.map((q) => (
                  <MenuItem key={q.value} value={q.value}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{q.label}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Divider sx={{ borderColor: currentTheme.colors.border, mb: 3 }} />

        {/* Info Section */}
        <Box sx={{ p: 2, borderRadius: 3, background: `${currentTheme.colors.surfaceAlt}66`, border: `1px solid ${currentTheme.colors.border}` }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Universal Downloader
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
            A modern web-based video and audio downloader powered by yt-dlp.
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
            <Chip label="React 19" size="small" sx={{ fontSize: '0.65rem', height: 22, borderRadius: 1.5 }} />
            <Chip label="MUI v7" size="small" sx={{ fontSize: '0.65rem', height: 22, borderRadius: 1.5 }} />
            <Chip label="yt-dlp" size="small" sx={{ fontSize: '0.65rem', height: 22, borderRadius: 1.5 }} />
            <Chip label="Socket.io" size="small" sx={{ fontSize: '0.65rem', height: 22, borderRadius: 1.5 }} />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          sx={{
            background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
            fontWeight: 600,
            px: 3,
          }}
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
