export interface AppTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
}

export const themes: AppTheme[] = [
  {
    id: 'dark',
    name: 'Dark',
    colors: {
      primary: '#BB86FC',
      secondary: '#03DAC6',
      background: '#121212',
      surface: '#1E1E1E',
      surfaceAlt: '#2C2C2C',
      text: '#E0E0E0',
      textSecondary: '#9E9E9E',
      border: '#333333',
      error: '#CF6679',
      success: '#4CAF50',
      warning: '#FFB74D',
      info: '#64B5F6',
    },
  },
  {
    id: 'light',
    name: 'Light',
    colors: {
      primary: '#6200EE',
      secondary: '#03DAC6',
      background: '#F5F5F5',
      surface: '#FFFFFF',
      surfaceAlt: '#F0F0F0',
      text: '#1A1A1A',
      textSecondary: '#666666',
      border: '#E0E0E0',
      error: '#B00020',
      success: '#4CAF50',
      warning: '#FF9800',
      info: '#2196F3',
    },
  },
  {
    id: 'amoled',
    name: 'AMOLED',
    colors: {
      primary: '#BB86FC',
      secondary: '#03DAC6',
      background: '#000000',
      surface: '#0A0A0A',
      surfaceAlt: '#141414',
      text: '#E0E0E0',
      textSecondary: '#888888',
      border: '#1A1A1A',
      error: '#CF6679',
      success: '#4CAF50',
      warning: '#FFB74D',
      info: '#64B5F6',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#00BCD4',
      secondary: '#26C6DA',
      background: '#0D1B2A',
      surface: '#1B2838',
      surfaceAlt: '#243447',
      text: '#E0E0E0',
      textSecondary: '#8899AA',
      border: '#2A3F54',
      error: '#EF5350',
      success: '#66BB6A',
      warning: '#FFA726',
      info: '#42A5F5',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#4CAF50',
      secondary: '#81C784',
      background: '#1B2A1B',
      surface: '#243324',
      surfaceAlt: '#2D3F2D',
      text: '#E0E0E0',
      textSecondary: '#88AA88',
      border: '#3A5A3A',
      error: '#EF5350',
      success: '#66BB6A',
      warning: '#FFA726',
      info: '#42A5F5',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#FF5722',
      secondary: '#FF8A65',
      background: '#1A0A00',
      surface: '#2A1508',
      surfaceAlt: '#3A2010',
      text: '#E0E0E0',
      textSecondary: '#AA8877',
      border: '#4A2A15',
      error: '#EF5350',
      success: '#66BB6A',
      warning: '#FFB74D',
      info: '#42A5F5',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    colors: {
      primary: '#88C0D0',
      secondary: '#81A1C1',
      background: '#2E3440',
      surface: '#3B4252',
      surfaceAlt: '#434C5E',
      text: '#ECEFF4',
      textSecondary: '#D8DEE9',
      border: '#4C566A',
      error: '#BF616A',
      success: '#A3BE8C',
      warning: '#EBCB8B',
      info: '#88C0D0',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    colors: {
      primary: '#BD93F9',
      secondary: '#50FA7B',
      background: '#282A36',
      surface: '#343746',
      surfaceAlt: '#44475A',
      text: '#F8F8F2',
      textSecondary: '#BFBFBF',
      border: '#6272A4',
      error: '#FF5555',
      success: '#50FA7B',
      warning: '#F1FA8C',
      info: '#8BE9FD',
    },
  },
];

export const getThemeById = (id: string): AppTheme => {
  return themes.find((t) => t.id === id) || themes[0];
};
