require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs-extra');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// Comma-separated origins via CLIENT_ORIGIN plus standard local dev ports.
// In development the frontend may run on a fallback port (e.g. 3001) if 3000
// is taken, so we allow the common localhost origins to avoid a false offline state.
const devOrigins = (envOrigin) => {
  const fromEnv = (envOrigin || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([
    ...fromEnv,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ])];
};

const corsOrigin = process.env.NODE_ENV === 'production'
  ? false
  : devOrigins(process.env.CLIENT_ORIGIN);

const io = socketIo(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Ensure downloads and templates directories exist
const templatesDir = path.join(__dirname, '../templates');
fs.ensureDirSync(templatesDir);

// Routes
const downloadRouter = require('./routes/download');
const downloadsDir = typeof downloadRouter.getDownloadsDir === 'function' ? downloadRouter.getDownloadsDir() : path.join(__dirname, '../downloads');
fs.ensureDirSync(downloadsDir);
fs.ensureDirSync(path.join(downloadsDir, 'Video'));
fs.ensureDirSync(path.join(downloadsDir, 'Audio'));
app.use('/api/download', downloadRouter);
app.use('/api/info', require('./routes/info'));
app.use('/api/formats', require('./routes/formats'));
app.use('/api/templates', require('./routes/templates'));

// Socket.io for real-time download progress
let restoredState = [];
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Repopulate the UI after a socket (re)connect with restored downloads/queue.
  if (restoredState && restoredState.length > 0) {
    socket.emit('state-restore', { downloads: restoredState });
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Rehydrate persisted queue + interrupted downloads on boot.
if (typeof downloadRouter.rehydrate === 'function') {
  try {
    restoredState = downloadRouter.rehydrate(io);
  } catch (e) {
    console.error('[STATE] Rehydrate failed:', e.message);
  }
}

// Export io for use in routes
app.set('socketio', io);

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
