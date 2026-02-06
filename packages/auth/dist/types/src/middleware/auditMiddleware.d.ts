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
        get(name: string): {
            value: string;
        } | undefined;
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
/**
 * Create audit middleware
 */
export declare function createAuditMiddleware(options?: AuditMiddlewareOptions): (req: NextRequest, res: NextResponse) => Promise<void>;
/**
 * Default middleware instance
 */
export declare const auditMiddleware: (req: NextRequest, res: NextResponse) => Promise<void>;
//# sourceMappingURL=auditMiddleware.d.ts.map