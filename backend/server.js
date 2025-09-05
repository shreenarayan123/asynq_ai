const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/database');
const whatsappService = require('./services/whatsappService');
const aiService = require('./services/aiService');
const { initializeSettings, setupCleanupTasks } = require('./utils/dbInit');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const corsMiddleware = require('./middleware/corsMiddleware');

// Routes
const connectionRoutes = require('./routes/connection');
const messagesRoutes = require('./routes/messages');
const rulesRoutes = require('./routes/rules');
const settingsRoutes = require('./routes/settings');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 5000
});

const PORT = process.env.PORT || 5000;

// Connect to Database
(async () => {
  await connectDB();
  
  // Initialize default settings
  await initializeSettings();
  
  // Setup cleanup tasks
  await setupCleanupTasks();
})();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading of resources from different origins
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(corsMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize services
whatsappService.initialize(io);
aiService.initialize();

  // Routes
app.use('/api/connection', connectionRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/settings', settingsRoutes);
  
// Debug route to test QR generation
app.get('/api/debug/qr-test', async (req, res) => {
  const { generateTestQrCode } = require('./utils/debugUtils');
  try {
    const success = await generateTestQrCode();
    res.json({ success, message: 'QR code test completed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current connection status
  const status = whatsappService.getConnectionStatus();
  console.log('Sending connection status to new client:', status.status);
  if (status.qr) {
    console.log('QR code available, length:', status.qr.length);
  } else {
    console.log('No QR code available');
  }
  
  socket.emit('connectionStatus', status);
  
  // Handle custom events
  socket.on('requestQR', () => {
    console.log('Client requested new QR code');
    whatsappService.resetConnection().then(() => {
      console.log('Connection reset triggered by client request');
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await whatsappService.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await whatsappService.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, server, io };
