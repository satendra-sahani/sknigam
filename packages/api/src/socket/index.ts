import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export function setupSocketIO(io: Server): void {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      (socket as any).user = { role: 'anonymous' };
      return next();
    }
    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'secret') as {
        userId: string;
        role: string;
        assemblyConstituency?: string;
      };
      (socket as any).user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] connected: ${socket.id}, role: ${user?.role || 'anonymous'}`);

    if (user?.userId) socket.join(`user_${user.userId}`);
    if (user?.assemblyConstituency) socket.join(`constituency_${user.assemblyConstituency}`);
    if (user?.role && user.role !== 'anonymous') socket.join(`role_${user.role}`);

    socket.on('disconnect', () => {
      console.log(`[Socket] disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket.io] Setup complete');
}
