import React from 'react';
import { Container, Box } from '@mui/material';
import Header from './components/Header';
import DownloadForm from './components/DownloadForm';
import DownloadQueue from './components/DownloadQueue';
import DownloadProgress from './components/DownloadProgress';
import DownloadHistory from './components/DownloadHistory';
import { SocketProvider, useSocket } from './contexts/SocketContext';
import { ThemeProvider } from './theme/ThemeContext';
import './App.css';

function AppContent() {
  const { downloads, cancelDownload } = useSocket();

  return (
    <div className="App">
      <Header />
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <DownloadForm />
          <DownloadQueue downloads={downloads} onCancel={cancelDownload} />
          <DownloadProgress />
          <DownloadHistory />
        </Box>
      </Container>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
