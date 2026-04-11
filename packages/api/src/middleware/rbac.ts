import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Middleware that filters data by zone for zone_incharge users.
 * Adds a zoneFilter property to the request that can be used in queries.
 */
export const zoneFilter = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (req.user?.role === 'zone_incharge' && req.user.zone) {
    (req as any).zoneFilter = { zone: req.user.zone };
  } else {
    (req as any).zoneFilter = {};
  }
  next();
};
