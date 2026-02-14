/**
 * Audit Middleware
 * 
 * Express/Next.js middleware for automatic audit logging of API requests.
 * Captures request/response data, timing, and security events.
 * 
 * @module AuditMiddleware
 * @author CourtLens Platform Team
 * @date October 23, 2025
 * @phase Phase 2 Week 1 Day 7
 */

import { securityAuditService } from '../services/securityAuditService';
import { anomalyDetectionService } from '../services/anomalyDetectionService';

// ============================================================================
// TYPES
// ============================================================================

export interface NextRequest {
  method: string;
  nextUrl: {
    pathname: string;
    searchParams: URLSearchParams;
  };
  headers: {
    get(name: string): string | null;
  };
  cookies: {
    get(name: string): { value: string } | undefined;
  };
}

export interface NextResponse {
  status: number;
}

export interface AuditMiddlewareOptions {
  enabled?: boolean;
  logRequests?: boolean;
  logResponses?: boolean;
  logErrors?: boolean;
  detectAnomalies?: boolean;
  excludePaths?: string[];
  excludeMethods?: string[];
  sensitiveHeaders?: string[];
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  firmId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  method: string;
  path: string;
  query?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
  startTime: number;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Default configuration
 */
const defaultOptions: AuditMiddlewareOptions = {
  enabled: true,
  logRequests: true,
  logResponses: true,
  logErrors: true,
  detectAnomalies: true,
  excludePaths: ['/health', '/metrics', '/favicon.ico'],
  excludeMethods: ['OPTIONS'],
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key']
};

/**
 * Create audit middleware
 */
export function createAuditMiddleware(options: AuditMiddlewareOptions = {}) {
  const config = { ...defaultOptions, ...options };

  return async function auditMiddleware(
    req: NextRequest,
    res: NextResponse
  ) {
    // Skip if disabled
    if (!config.enabled) {
      return;
    }

    // Skip excluded paths
    const path = req.nextUrl.pathname;
    if (config.excludePaths?.some(p => path.startsWith(p))) {
      return;
    }

    // Skip excluded methods
    const method = req.method;
    if (config.excludeMethods?.includes(method)) {
      return;
    }

    // Build request context
    const context: RequestContext = {
      requestId: generateRequestId(),
      userId: extractUserId(req),
      firmId: extractFirmId(req),
      sessionId: extractSessionId(req),
      ipAddress: extractIpAddress(req),
      userAgent: req.headers.get('user-agent') || undefined,
      method,
      path,
      query: Object.fromEntries(req.nextUrl.searchParams),
      startTime: Date.now()
    };

    // Log request
    if (config.logRequests) {
      await logRequest(context);
    }

    try {
      // Continue with request processing
      // Note: In actual middleware, you would call next() here
      
      // Log response (simulated)
      if (config.logResponses) {
        await logResponse(context, res);
      }

      // Detect anomalies
      if (config.detectAnomalies && context.userId) {
        await detectRequestAnomalies(context);
      }
    } catch (error) {
      // Log error
      if (config.logErrors) {
        await logError(context, error);
      }
      throw error;
    }
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract user ID from request
 */
function extractUserId(req: NextRequest): string | undefined {
  // Try from headers
  const headerUserId = req.headers.get('x-user-id');
  if (headerUserId) return headerUserId;

  // Try from auth token (simplified)
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    // In production, decode JWT and extract user ID
    return 'user_from_token';
  }

  return undefined;
}

/**
 * Extract firm ID from request
 */
function extractFirmId(req: NextRequest): string | undefined {
  return req.headers.get('x-firm-id') || undefined;
}

/**
 * Extract session ID from request
 */
function extractSessionId(req: NextRequest): string | undefined {
  return req.headers.get('x-session-id') || req.cookies.get('session')?.value;
}

/**
 * Extract IP address from request
 */
function extractIpAddress(req: NextRequest): string | undefined {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    undefined
  );
}
import { logger } from '../utils/logger';
import { logger } from '@/lib/logger';

/**
 * Log API request
 */
async function logRequest(context: RequestContext): Promise<void> {
  try {
    await securityAuditService.logAPIAccess({
      firmId: context.firmId,
      userId: context.userId,
      endpoint: context.path,
      method: context.method,
      statusCode: 0, // Not yet known
      responseTimeMs: 0, // Not yet known
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        requestId: context.requestId,
        query: context.query
      }
    });
  } catch (error) {
    logger.error('Failed to log request:', error);
  }
}

/**
 * Log API response
 */
async function logResponse(context: RequestContext, res: NextResponse): Promise<void> {
  try {
    const responseTime = Date.now() - context.startTime;

    await securityAuditService.logAPIAccess({
      firmId: context.firmId,
      userId: context.userId,
      endpoint: context.path,
      method: context.method,
      statusCode: res.status,
      responseTimeMs: responseTime,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        requestId: context.requestId
      }
    });
  } catch (error) {
    logger.error('Failed to log response:', error);
  }
}

/**
 * Log error
 */
async function logError(context: RequestContext, error: any): Promise<void> {
  try {
    await securityAuditService.logSecurityEvent({
      firmId: context.firmId,
      userId: context.userId,
      eventType: 'api_error',
      severity: 'high',
      title: `API Error: ${context.method} ${context.path}`,
      description: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        requestId: context.requestId,
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  } catch (err) {
    logger.error('Failed to log error:', err);
  }
}

/**
 * Detect request anomalies
 */
async function detectRequestAnomalies(context: RequestContext): Promise<void> {
  try {
    if (!context.userId) return;

    // Check for unusual API usage patterns
    // This would typically check:
    // - Request rate (too many requests)
    // - Unusual endpoints accessed
    // - Suspicious patterns (e.g., scanning)
    
    // For now, just log that we're checking
    logger.debug('Checking anomalies for user', { userId: context.userId });
  } catch (error) {
    logger.error('Failed to detect anomalies:', error);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Default middleware instance
 */
export const auditMiddleware = createAuditMiddleware();
