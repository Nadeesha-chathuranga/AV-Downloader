import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AppTheme, themes, getThemeById, DEFAULT_THEME_ID } from './themes';

interface ThemeContextType {
  currentTheme: AppTheme;
  setTheme: (id: string) => void;
  allThemes: AppTheme[];
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: getThemeById(DEFAULT_THEME_ID),
  setTheme: () => {},
  allThemes: themes,
});

export const useAppTheme = () => useContext(ThemeContext);

const STORAGE_KEY = 'av-downloader-theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || DEFAULT_THEME_ID;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeId);
  }, [themeId]);

  const currentTheme = useMemo(() => getThemeById(themeId), [themeId]);

  const isLight = currentTheme.mode === 'light';
  // Text color inside gradient "contained" buttons: dark text reads well on the
  // vivid dark-theme gradients, but light themes need white text for contrast.
  const buttonText = isLight ? '#fff' : '#000';

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isLight ? 'light' : 'dark',
          primary: { main: currentTheme.colors.primary },
          secondary: { main: currentTheme.colors.secondary },
          background: {
            default: currentTheme.colors.background,
            paper: currentTheme.colors.surface,
          },
          error: { main: currentTheme.colors.error },
          success: { main: currentTheme.colors.success },
          warning: { main: currentTheme.colors.warning },
          info: { main: currentTheme.colors.info },
          text: {
            primary: currentTheme.colors.text,
            secondary: currentTheme.colors.textSecondary,
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h4: { fontWeight: 700 },
          h5: { fontWeight: 600 },
          h6: { fontWeight: 600 },
        },
        shape: { borderRadius: 12 },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: currentTheme.colors.background,
                // Theme-driven CSS variables so app stylesheets can use
                // adaptive translucent colors on both light and dark themes.
                '--theme-border': currentTheme.colors.border,
                '--theme-scrollbar': isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.12)',
                '--theme-scrollbar-hover': isLight ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.24)',
                '--theme-card-border': isLight ? 'rgba(0, 0, 0, 0.10)' : 'rgba(255, 255, 255, 0.08)',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                background: `linear-gradient(135deg, ${currentTheme.colors.surface}dd, ${currentTheme.colors.surface}aa)`,
                border: `1px solid ${currentTheme.colors.border}`,
                borderRadius: 12,
                transition: 'all 0.3s ease',
                boxShadow: `0 4px 24px rgba(0, 0, 0, 0.2)`,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 6,
                textTransform: 'none',
                fontWeight: 600,
                padding: '10px 24px',
                transition: 'all 0.2s ease',
                fontSize: '0.9rem',
              },
              containedPrimary: {
                background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                color: buttonText,
                boxShadow: `0 4px 20px ${currentTheme.colors.primary}33`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${currentTheme.colors.primary}ee, ${currentTheme.colors.secondary}ee)`,
                  boxShadow: `0 6px 28px ${currentTheme.colors.primary}55`,
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
              },
              outlinedPrimary: {
                borderColor: `${currentTheme.colors.primary}66`,
                color: currentTheme.colors.primary,
                '&:hover': {
                  borderColor: currentTheme.colors.primary,
                  background: `${currentTheme.colors.primary}11`,
                  boxShadow: `0 0 20px ${currentTheme.colors.primary}22`,
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 6,
                fontWeight: 500,
                transition: 'all 0.15s ease',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 6,
                  transition: 'all 0.2s ease',
                  '&:hover fieldset': {
                    borderColor: `${currentTheme.colors.primary}88`,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: currentTheme.colors.primary,
                    boxShadow: `0 0 0 3px ${currentTheme.colors.primary}18`,
                  },
                },
              },
            },
          },
          MuiLinearProgress: {
            styleOverrides: {
              root: {
                borderRadius: 6,
                height: 6,
                backgroundColor: currentTheme.colors.surfaceAlt,
                overflow: 'hidden',
              },
              bar: {
                borderRadius: 6,
                background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
              },
            },
          },
          MuiSelect: {
            styleOverrides: {
              root: {
                borderRadius: 6,
              },
            },
          },
          MuiMenuItem: {
            styleOverrides: {
              root: {
                borderRadius: 6,
              },
            },
          },
        },
      }),
    [currentTheme, isLight, buttonText]
  );

  const setTheme = (id: string) => setThemeId(id);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, allThemes: themes }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
