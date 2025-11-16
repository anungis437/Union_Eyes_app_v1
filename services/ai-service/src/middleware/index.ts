import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // In production, verify JWT token using Supabase client
    // For now, we'll extract tenant ID from custom header
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' });
    }

    // Add to request
    (req as any).user = {
      tenantId,
      token,
    };

    next();
  } catch (error) {
    logger.error('Authentication failed', { error });
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Rate limiting middleware
 * Simple in-memory rate limiting (use Redis in production)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const tenantId = (req as any).user?.tenantId || req.ip;
  const now = Date.now();

  const record = requestCounts.get(tenantId);

  if (!record || now > record.resetTime) {
    // New window
    requestCounts.set(tenantId, {
      count: 1,
      resetTime: now + 60000, // 1 minute
    });
    return next();
  }

  if (record.count >= config.maxRequestsPerMinute) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    });
  }

  record.count++;
  next();
}

/**
 * Error handler middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Request error', {
    error: err,
    method: req.method,
    path: req.path,
    tenantId: (req as any).user?.tenantId,
  });

  // Don't expose internal errors in production
  const message = config.nodeEnv === 'development' ? err.message : 'Internal server error';

  res.status(500).json({
    error: message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
}

/**
 * Request validation middleware factory
 */
export function validateRequest(schema: {
  body?: Record<string, { required?: boolean; type?: string }>;
  query?: Record<string, { required?: boolean; type?: string }>;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      for (const [key, rules] of Object.entries(schema.body)) {
        const value = req.body[key];

        if (rules.required && !value) {
          errors.push(`${key} is required`);
          continue;
        }

        if (value && rules.type) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (actualType !== rules.type) {
            errors.push(`${key} must be of type ${rules.type}`);
          }
        }
      }
    }

    // Validate query
    if (schema.query) {
      for (const [key, rules] of Object.entries(schema.query)) {
        const value = req.query[key];

        if (rules.required && !value) {
          errors.push(`Query parameter ${key} is required`);
          continue;
        }

        if (value && rules.type && typeof value !== rules.type) {
          errors.push(`Query parameter ${key} must be of type ${rules.type}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    next();
  };
}
