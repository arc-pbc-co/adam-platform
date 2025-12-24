import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Extend Express Request to include user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_to_a_random_secret_in_production';

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header and attaches user to request
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid token:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication - doesn't fail if no token, but attaches user if present
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
        name: string;
        role: string;
      };
      req.user = decoded;
    } catch {
      // Token invalid, but we continue without user
    }
  }

  next();
}

/**
 * Role-based authorization middleware
 * Must be used after authenticateToken
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Generate JWT token for a user
 */
export function generateToken(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Get user ID from request, with fallback for development
 */
export function getUserId(req: AuthenticatedRequest): string {
  if (req.user) {
    return req.user.id;
  }
  // Development fallback - use admin user from database
  if (process.env.NODE_ENV === 'development') {
    // This ID matches the ADAM System Admin user in the database
    return '991cb7b8-bab6-4394-bf95-725caf62b37c';
  }
  throw new Error('User not authenticated');
}
