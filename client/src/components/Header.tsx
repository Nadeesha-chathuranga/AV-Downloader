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
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  MenuBook as MenuBookIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';
import SettingsDialog from './SettingsDialog';
import UserGuideDialog from './UserGuideDialog';
import { apiUrl } from '../config';
import { useAppTheme } from '../theme/ThemeContext';

const Header: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const { currentTheme } = useAppTheme();

  useEffect(() => {
    const checkBackend = async () => {
      try {
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
        position="sticky"
        elevation={0}
        sx={{
          background: `linear-gradient(180deg, ${currentTheme.colors.background}f0, ${currentTheme.colors.background}dd)`,
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid',
          borderColor: `${currentTheme.colors.border}`,
          zIndex: 1200,
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${currentTheme.colors.primary}66, ${currentTheme.colors.secondary}66, transparent)`,
          },
        }}
      >
        <Toolbar sx={{ py: 0.5, px: { xs: 2, md: 4 } }}>
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
                width: 38,
                height: 38,
                borderRadius: 1,
                background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 16px ${currentTheme.colors.primary}44`,
                flexShrink: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="16" y="24" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="22" fill="currentColor">AV</text>
              </svg>
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  fontSize: '1.05rem',
                  color: 'text.primary',
                }}
              >
                AV Downloader
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.65rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Audio & Video Downloader
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
                borderRadius: 0.75,
                fontSize: '0.75rem',
                height: 28,
                '& .MuiChip-icon': {
                  fontSize: 14,
                },
              }}
            />
            <Tooltip title="User Guide">
              <IconButton
                onClick={() => setHelpOpen(true)}
                sx={{
                  width: 36,
                  height: 36,
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 0.75,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: currentTheme.colors.primary,
                    borderColor: `${currentTheme.colors.primary}66`,
                    background: `${currentTheme.colors.primary}11`,
                    boxShadow: `0 0 12px ${currentTheme.colors.primary}22`,
                  },
                }}
              >
                <MenuBookIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reload App">
              <IconButton
                disabled={reloading}
                onClick={() => {
                  setReloading(true);
                  setTimeout(() => setReloading(false), 3000);
                  window.location.reload();
                }}
                sx={{
                  width: 36,
                  height: 36,
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 0.75,
                  transition: 'all 0.2s ease',
                  opacity: reloading ? 0.4 : 1,
                  '&:hover': {
                    color: currentTheme.colors.primary,
                    borderColor: `${currentTheme.colors.primary}66`,
                    background: `${currentTheme.colors.primary}11`,
                    boxShadow: `0 0 12px ${currentTheme.colors.primary}22`,
                  },
                }}
              >
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton
                onClick={() => setSettingsOpen(true)}
                sx={{
                  width: 36,
                  height: 36,
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 0.75,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: currentTheme.colors.primary,
                    borderColor: `${currentTheme.colors.primary}66`,
                    background: `${currentTheme.colors.primary}11`,
                    boxShadow: `0 0 12px ${currentTheme.colors.primary}22`,
                  },
                }}
              >
                <SettingsIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UserGuideDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      {backendStatus === 'disconnected' && (
        <Alert
          severity="warning"
          sx={{
            borderRadius: 0,
            fontWeight: 500,
            background: `${currentTheme.colors.warning}15`,
            border: 'none',
            borderBottom: `1px solid ${currentTheme.colors.warning}33`,
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
