import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './config/db';
import { setupSocketIO } from './socket/index';

// Import routes
import authRoutes from './routes/auth';
import boothRoutes from './routes/booths';
import boothAssignmentRoutes from './routes/boothAssignments';
import voterCountRoutes from './routes/voterCounts';
import checkInRoutes from './routes/checkIns';
import incidentRoutes from './routes/incidents';
import notificationRoutes from './routes/notifications';
import staffRoutes from './routes/staff';
import dashboardRoutes from './routes/dashboard';
import auditLogRoutes from './routes/auditLogs';

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Election API is running', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/booths', boothRoutes);
app.use('/api/booth-assignments', boothAssignmentRoutes);
app.use('/api/voter-counts', voterCountRoutes);
app.use('/api/check-ins', checkInRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Setup Socket.io
setupSocketIO(io);

// Connect DB and start server
const PORT = parseInt(process.env.PORT || '5000', 10);

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.io ready`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

export { app, server, io };
