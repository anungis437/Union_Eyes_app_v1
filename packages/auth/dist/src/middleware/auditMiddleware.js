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
// ============================================================================
// MIDDLEWARE
// ============================================================================
/**
 * Default configuration
 */
const defaultOptions = {
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
export function createAuditMiddleware(options = {}) {
    const config = { ...defaultOptions, ...options };
    return async function auditMiddleware(req, res) {
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
        const context = {
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
        }
        catch (error) {
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
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Extract user ID from request
 */
function extractUserId(req) {
    // Try from headers
    const headerUserId = req.headers.get('x-user-id');
    if (headerUserId)
        return headerUserId;
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
function extractFirmId(req) {
    return req.headers.get('x-firm-id') || undefined;
}
/**
 * Extract session ID from request
 */
function extractSessionId(req) {
    return req.headers.get('x-session-id') || req.cookies.get('session')?.value;
}
/**
 * Extract IP address from request
 */
function extractIpAddress(req) {
    return (req.headers.get('x-forwarded-for')?.split(',')[0] ||
        req.headers.get('x-real-ip') ||
        undefined);
}
/**
 * Log API request
 */
async function logRequest(context) {
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
    }
    catch (error) {
}
}
/**
 * Log API response
 */
async function logResponse(context, res) {
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
    }
    catch (error) {
}
}
/**
 * Log error
 */
async function logError(context, error) {
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
    }
    catch (err) {
}
}
/**
 * Detect request anomalies
 */
async function detectRequestAnomalies(context) {
    try {
        if (!context.userId)
            return;
        // Check for unusual API usage patterns
        // This would typically check:
        // - Request rate (too many requests)
        // - Unusual endpoints accessed
        // - Suspicious patterns (e.g., scanning)
        // For now, just log that we're checking
}
    catch (error) {
}
}
// ============================================================================
// EXPORTS
// ============================================================================
/**
 * Default middleware instance
 */
export const auditMiddleware = createAuditMiddleware();
//# sourceMappingURL=auditMiddleware.js.map