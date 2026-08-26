import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { Palette as PaletteIcon, Check as CheckIcon } from '@mui/icons-material';
import { useAppTheme } from './ThemeContext';

const ThemeSwitcher: React.FC = () => {
  const { currentTheme, setTheme, allThemes } = useAppTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeSelect = (id: string) => {
    setTheme(id);
    handleClose();
  };

  return (
    <>
      <Tooltip title="Change theme">
        <IconButton
          onClick={handleClick}
          sx={{
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0.75,
            width: 36,
            height: 36,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: `${currentTheme.colors.primary}88`,
              boxShadow: `0 0 16px ${currentTheme.colors.primary}33`,
              background: `${currentTheme.colors.primary}11`,
            },
          }}
        >
          <PaletteIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 220,
            borderRadius: 0.75,
            border: '1px solid',
            borderColor: `${currentTheme.colors.border}`,
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            background: `linear-gradient(135deg, ${currentTheme.colors.surface}ee, ${currentTheme.colors.surfaceAlt}dd)`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${currentTheme.colors.border}44`,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Theme
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'divider' }} />
        {allThemes.map((theme) => (
          <MenuItem
            key={theme.id}
            onClick={() => handleThemeSelect(theme.id)}
            selected={currentTheme.id === theme.id}
            sx={{
              mx: 1,
              my: 0.5,
              borderRadius: 0.75,
              gap: 1.5,
              transition: 'all 0.15s ease',
              '&:hover': {
                background: `${theme.colors.primary}15`,
              },
            }}
          >
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: theme.colors.primary,
                  border: '2px solid',
                  borderColor: theme.colors.surfaceAlt,
                }}
              />
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: theme.colors.secondary,
                  border: '2px solid',
                  borderColor: theme.colors.surfaceAlt,
                  ml: -1,
                }}
              />
            </Box>
            <ListItemText
              primary={theme.name}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: currentTheme.id === theme.id ? 600 : 400,
              }}
            />
            {currentTheme.id === theme.id && (
              <ListItemIcon sx={{ minWidth: 24 }}>
                <CheckIcon fontSize="small" sx={{ color: theme.colors.primary }} />
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ThemeSwitcher;
