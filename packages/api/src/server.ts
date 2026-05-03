import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './config/db';
import { setupSocketIO } from './socket/index';

import authRoutes from './routes/auth';
import boothRoutes from './routes/booths';
import staffRoutes from './routes/staff';
import voterRoutes from './routes/voters';
import voterAssignmentRoutes from './routes/voterAssignments';
import notificationRoutes from './routes/notifications';
import auditLogRoutes from './routes/auditLogs';
import analyticsRoutes from './routes/analytics';
import subscriptionRoutes from './routes/subscriptions';
import discrepancyRoutes from './routes/discrepancies';
import imagekitRoutes from './routes/imagekit';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});
app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'POLLSTICS API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/booths', boothRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/voter-assignments', voterAssignmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/discrepancies', discrepancyRoutes);
app.use('/api/imagekit', imagekitRoutes);

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

setupSocketIO(io);

const PORT = parseInt(process.env.PORT || '9003', 10);

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`[POLLSTICS API] running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

export { app, server, io };
