import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { ZodSchema } from 'zod';
import { getDb } from '../db/store.ts';
import { UserRole } from '../types.ts';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-only-secret-change-before-deploy');
if (process.env.NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface AuthRequest extends Request {
  auth?: AuthPayload;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = header.slice(7).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const db = getDb();
    const user = db.users.find((u) => u.id === decoded.userId && u.isActive);
    if (!user) {
      res.status(401).json({ error: 'Account is inactive or no longer exists.' });
      return;
    }
    req.auth = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({ error: 'You do not have permission to access this resource.' });
      return;
    }
    next();
  };
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes and try again.' },
});

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      res.status(400).json({
        error: firstIssue ? `${firstIssue.path.join('.') || 'Input'}: ${firstIssue.message}` : 'Invalid request payload',
        details: parsed.error.issues,
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB cap per file for Render-safe persistent DB storage
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Unsupported file format. Allowed: JPG, PNG, WEBP, PDF.'));
      return;
    }
    cb(null, true);
  },
});

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[API Error]', err);
  if (err.message?.includes('Unsupported file format') || err.message?.includes('File too large')) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'An unexpected server error occurred. Please try again.' });
}
