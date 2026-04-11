import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL, STORAGE_KEYS } from '../utils/constants';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) {
    return socket;
  }

  const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.log('[Socket] Connection error:', error.message);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function joinBoothRoom(boothId: string): void {
  socket?.emit('join:booth', boothId);
}

export function joinZoneRoom(zone: string): void {
  socket?.emit('join:zone', zone);
}

export function onNotification(
  callback: (notification: any) => void,
): () => void {
  socket?.on('notification', callback);
  return () => {
    socket?.off('notification', callback);
  };
}

export function onVoterCountUpdate(
  callback: (data: any) => void,
): () => void {
  socket?.on('voter_count:update', callback);
  return () => {
    socket?.off('voter_count:update', callback);
  };
}

export function onIncidentUpdate(
  callback: (data: any) => void,
): () => void {
  socket?.on('incident:update', callback);
  return () => {
    socket?.off('incident:update', callback);
  };
}
