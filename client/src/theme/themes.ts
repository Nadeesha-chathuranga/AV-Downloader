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
    id: 'cyberpunk',
    name: 'Cyberpunk',
    colors: {
      primary: '#00f0ff',
      secondary: '#ff2d78',
      background: '#0a0a0f',
      surface: '#12121a',
      surfaceAlt: '#1a1a28',
      text: '#e8e8f0',
      textSecondary: '#7a7a90',
      border: '#1e1e30',
      error: '#ff4060',
      success: '#00ff88',
      warning: '#ffb800',
      info: '#00c8ff',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    colors: {
      primary: '#00ff88',
      secondary: '#8b5cf6',
      background: '#0d1117',
      surface: '#161b22',
      surfaceAlt: '#1c2333',
      text: '#e6edf3',
      textSecondary: '#7d8590',
      border: '#21262d',
      error: '#ff5555',
      success: '#00ff88',
      warning: '#f0c000',
      info: '#58a6ff',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    colors: {
      primary: '#ff6b35',
      secondary: '#ffd700',
      background: '#121218',
      surface: '#1a1a24',
      surfaceAlt: '#222230',
      text: '#f0ece4',
      textSecondary: '#8a8490',
      border: '#2a2a38',
      error: '#ff4444',
      success: '#44ff88',
      warning: '#ffd700',
      info: '#ff8855',
    },
  },
  {
    id: 'frost',
    name: 'Frost',
    colors: {
      primary: '#4fc3f7',
      secondary: '#e0e0e0',
      background: '#0f1923',
      surface: '#1a2636',
      surfaceAlt: '#223344',
      text: '#e4eaf0',
      textSecondary: '#7a8ea0',
      border: '#263848',
      error: '#ff5566',
      success: '#44ddaa',
      warning: '#ffcc44',
      info: '#4fc3f7',
    },
  },
  {
    id: 'void',
    name: 'Void',
    colors: {
      primary: '#a855f7',
      secondary: '#84cc16',
      background: '#000000',
      surface: '#0a0a0a',
      surfaceAlt: '#141414',
      text: '#f0f0f0',
      textSecondary: '#6a6a7a',
      border: '#1a1a1a',
      error: '#ff3355',
      success: '#84cc16',
      warning: '#eab308',
      info: '#a78bfa',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#22d3ee',
      secondary: '#3b82f6',
      background: '#0b1220',
      surface: '#111c33',
      surfaceAlt: '#18243f',
      text: '#e2e8f0',
      textSecondary: '#64748b',
      border: '#1e2d4d',
      error: '#ff4d6d',
      success: '#34d399',
      warning: '#fbbf24',
      info: '#38bdf8',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#fb7185',
      secondary: '#fb923c',
      background: '#150b14',
      surface: '#20121f',
      surfaceAlt: '#2c1826',
      text: '#fbeef1',
      textSecondary: '#93707e',
      border: '#3a2033',
      error: '#f87171',
      success: '#4ade80',
      warning: '#facc15',
      info: '#f472b6',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#34d399',
      secondary: '#a3e635',
      background: '#0a120c',
      surface: '#101b12',
      surfaceAlt: '#17271a',
      text: '#e7f0ea',
      textSecondary: '#6f8a78',
      border: '#1f3326',
      error: '#f87171',
      success: '#34d399',
      warning: '#facc15',
      info: '#5eead4',
    },
  },
  {
    id: 'royal',
    name: 'Royal',
    colors: {
      primary: '#c084fc',
      secondary: '#f0abfc',
      background: '#120b1f',
      surface: '#1b1330',
      surfaceAlt: '#251a40',
      text: '#f3edf9',
      textSecondary: '#8d7fb5',
      border: '#32245a',
      error: '#fb7185',
      success: '#a3e635',
      warning: '#fde047',
      info: '#a78bfa',
    },
  },
  {
    id: 'matrix',
    name: 'Matrix',
    colors: {
      primary: '#00ff66',
      secondary: '#00ccff',
      background: '#020b03',
      surface: '#07130a',
      surfaceAlt: '#0c1f11',
      text: '#d8f5e2',
      textSecondary: '#5f8f6e',
      border: '#12331f',
      error: '#ff3355',
      success: '#00ff66',
      warning: '#ffee00',
      info: '#00ccff',
    },
  },
];

export const getThemeById = (id: string): AppTheme => {
  return themes.find((t) => t.id === id) || themes[0];
};
