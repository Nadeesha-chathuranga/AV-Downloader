import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.REACT_APP_SERVER_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: env.REACT_APP_SERVER_URL || 'http://localhost:5000',
          ws: true,
        },
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.REACT_APP_SERVER_URL': JSON.stringify(env.REACT_APP_SERVER_URL || ''),
    },
  };
});
