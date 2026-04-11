import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export function setupSocketIO(io: Server): void {
  // Authentication middleware for socket connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      // Allow anonymous connections for public dashboards
      (socket as any).user = { role: 'anonymous' };
      return next();
    }

    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'secret') as {
        userId: string;
        role: string;
        zone?: string;
      };
      (socket as any).user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] Client connected: ${socket.id}, role: ${user?.role || 'anonymous'}`);

    // Join user-specific room for targeted notifications
    if (user?.userId) {
      socket.join(`user_${user.userId}`);
    }

    // Join zone-specific room
    if (user?.zone) {
      socket.join(`zone_${user.zone}`);
    }

    // Join role-based room
    if (user?.role && user.role !== 'anonymous') {
      socket.join(`role_${user.role}`);
    }

    // Handle joining booth-specific rooms
    socket.on('join-booth', (boothId: string) => {
      socket.join(`booth_${boothId}`);
      console.log(`[Socket] ${socket.id} joined booth_${boothId}`);
    });

    // Handle leaving booth-specific rooms
    socket.on('leave-booth', (boothId: string) => {
      socket.leave(`booth_${boothId}`);
      console.log(`[Socket] ${socket.id} left booth_${boothId}`);
    });

    // Handle joining dashboard room for live updates
    socket.on('join-dashboard', () => {
      socket.join('dashboard');
      console.log(`[Socket] ${socket.id} joined dashboard`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket.io] Setup complete');
}
