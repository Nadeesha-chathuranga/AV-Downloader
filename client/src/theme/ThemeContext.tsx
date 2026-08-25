import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AppTheme, themes, getThemeById } from './themes';

interface ThemeContextType {
  currentTheme: AppTheme;
  setTheme: (id: string) => void;
  allThemes: AppTheme[];
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: themes[0],
  setTheme: () => {},
  allThemes: themes,
});

export const useAppTheme = () => useContext(ThemeContext);

const STORAGE_KEY = 'universal-downloader-theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || 'dark';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeId);
  }, [themeId]);

  const currentTheme = useMemo(() => getThemeById(themeId), [themeId]);

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: currentTheme.id === 'light' ? 'light' : 'dark',
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
        shape: { borderRadius: 16 },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                backdropFilter: 'blur(10px)',
                background: `${currentTheme.colors.surface}cc`,
                border: `1px solid ${currentTheme.colors.border}`,
                borderRadius: 16,
                transition: 'all 0.3s ease',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                textTransform: 'none',
                fontWeight: 600,
                padding: '8px 24px',
                transition: 'all 0.2s ease',
              },
              containedPrimary: {
                background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${currentTheme.colors.primary}dd, ${currentTheme.colors.secondary}dd)`,
                  boxShadow: `0 4px 20px ${currentTheme.colors.primary}44`,
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
                borderRadius: 8,
                fontWeight: 500,
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 12,
                  transition: 'all 0.2s ease',
                  '&:hover fieldset': {
                    borderColor: currentTheme.colors.primary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: currentTheme.colors.primary,
                    boxShadow: `0 0 0 2px ${currentTheme.colors.primary}22`,
                  },
                },
              },
            },
          },
          MuiLinearProgress: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                height: 8,
                backgroundColor: currentTheme.colors.surfaceAlt,
              },
            },
          },
        },
      }),
    [currentTheme]
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
