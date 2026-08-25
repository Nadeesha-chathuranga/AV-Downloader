import React from 'react';
import { Container, Box } from '@mui/material';
import Header from './components/Header';
import DownloadForm from './components/DownloadForm';
import DownloadProgress from './components/DownloadProgress';
import DownloadHistory from './components/DownloadHistory';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './theme/ThemeContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <div className="App">
          <Header />
          <Container maxWidth="lg">
            <Box sx={{ mt: 4, mb: 4 }}>
              <DownloadForm />
              <DownloadProgress />
              <DownloadHistory />
            </Box>
          </Container>
        </div>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
