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
            borderRadius: 2,
            width: 40,
            height: 40,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: `0 0 12px ${currentTheme.colors.primary}33`,
              transform: 'scale(1.05)',
            },
          }}
        >
          <PaletteIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(20px)',
            background: `${currentTheme.colors.surface}ee`,
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
              borderRadius: 2,
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
