import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import AuditLog from '../models/AuditLog';

export const createAuditLog = async (
  userId: string,
  role: string,
  action: string,
  req: AuthRequest,
  targetEntityId?: string,
  oldValue?: any,
  newValue?: any
): Promise<void> => {
  try {
    await AuditLog.create({
      userId,
      role,
      action,
      targetEntityId,
      oldValue,
      newValue,
      ipAddress: req.ip || req.socket?.remoteAddress,
      deviceInfo: req.headers['user-agent'],
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

/**
 * Middleware factory that automatically logs an audit action after the route handler.
 */
export const auditMiddleware = (action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        createAuditLog(
          req.user.userId,
          req.user.role,
          action,
          req,
          req.params.id,
        ).catch(console.error);
      }
      return originalJson(body);
    };
    next();
  };
};
