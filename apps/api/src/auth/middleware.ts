import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler.js';

export interface AuthPayload {
  userId: string;
  role: 'owner' | 'standard' | 'admin';
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV !== 'production'
    ? 'development-only-secret-change-in-production'
    : (() => {
        throw new Error(
          'JWT_SECRET environment variable must be set in production. Refusing to use fallback secret.'
        );
      })());

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    throw new AppError('Invalid or expired token', 403);
  }
}

export function requireRole(...roles: Array<'owner' | 'standard' | 'admin'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    next();
  };
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
