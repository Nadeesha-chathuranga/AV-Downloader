import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import axios from 'axios';
import ThemeSwitcher from '../theme/ThemeSwitcher';
import SettingsDialog from './SettingsDialog';
import { useAppTheme } from '../theme/ThemeContext';

const Header: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { currentTheme } = useAppTheme();

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const apiUrl =
          process.env.NODE_ENV === 'production'
            ? '/api'
            : `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api`;
        await axios.get(`${apiUrl}/formats/quality-presets`);
        setBackendStatus('connected');
      } catch (error) {
        setBackendStatus('disconnected');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: `${currentTheme.colors.surface}cc`,
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ py: 0.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexGrow: 1,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2.5,
                background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${currentTheme.colors.primary}44`,
              }}
            >
              <DownloadIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  fontSize: '1.1rem',
                  color: 'text.primary',
                }}
              >
                Universal Downloader
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                  letterSpacing: '0.05em',
                }}
              >
                Video & Audio Downloader
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={backendStatus === 'connected' ? 'Online' : backendStatus === 'disconnected' ? 'Offline' : 'Checking...'}
              color={backendStatus === 'connected' ? 'success' : backendStatus === 'disconnected' ? 'error' : 'default'}
              size="small"
              icon={
                backendStatus === 'connected' ? (
                  <CheckCircleIcon />
                ) : backendStatus === 'disconnected' ? (
                  <WarningIcon />
                ) : undefined
              }
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                '& .MuiChip-icon': {
                  fontSize: 16,
                },
              }}
            />
            <Tooltip title="Settings">
              <IconButton
                onClick={() => setSettingsOpen(true)}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: currentTheme.colors.primary, background: `${currentTheme.colors.primary}11` },
                }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <ThemeSwitcher />
          </Box>
        </Toolbar>
      </AppBar>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {backendStatus === 'disconnected' && (
        <Alert
          severity="warning"
          sx={{
            borderRadius: 0,
            fontWeight: 500,
          }}
        >
          <strong>Backend Offline:</strong> Server not responding. Please ensure the backend server is running.
          <br />
          <strong>Setup:</strong> Run <code>npm run dev</code> in the root directory.
        </Alert>
      )}
    </>
  );
};

export default Header;
