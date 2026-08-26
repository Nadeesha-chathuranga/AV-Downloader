import React from 'react';
import Header from './components/Header';
import DownloadForm from './components/DownloadForm';
import DownloadPanel from './components/DownloadPanel';
import DownloadHistory from './components/DownloadHistory';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './theme/ThemeContext';
import './App.css';

function AppContent() {
  return (
    <div className="App">
      <Header />
      <div className="app-layout">
        <main className="app-main">
          <DownloadForm />
          <DownloadHistory />
        </main>
        <aside className="app-sidebar">
          <DownloadPanel />
        </aside>
      </div>
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
