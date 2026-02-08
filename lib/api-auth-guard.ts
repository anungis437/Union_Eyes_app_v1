/**
 * API Authentication Guard
 * 
 * Centralized authentication enforcement for API routes.
 * This provides a consistent auth pattern across all API endpoints with
 * an explicit allowlist for public routes.
 * 
 * @module lib/api-auth-guard
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

/**
 * Public API routes that do not require authentication.
 * These are explicitly allowlisted and documented.
 */
export const PUBLIC_API_ROUTES = new Set([
  // Health checks and monitoring
  '/api/health',
  '/api/health/liveness',
  '/api/status',
  '/api/docs/openapi.json',
  
  // Webhooks (authenticate via signature verification)
  '/api/webhooks/stripe',
  '/api/webhooks/clc',
  '/api/webhooks/signatures',
  '/api/webhooks/whop',
  '/api/signatures/webhooks/docusign',
  '/api/integrations/shopify/webhooks',
  '/api/stripe/webhooks',
  '/api/whop/webhooks',
  
  // Public checkout/payment flows
  '/api/whop/unauthenticated-checkout',
  '/api/whop/create-checkout',
  
  // Public tracking/analytics (no sensitive data)
  '/api/communications/track/open/*',
  '/api/communications/track/click',
  '/api/communications/unsubscribe/*',
  
  // Sentry test endpoint (dev only, should be removed in prod)
  '/api/sentry-example-api',
]);

/**
 * Cron job routes that should authenticate via header secret.
 * These are internal scheduled tasks.
 */
export const CRON_API_ROUTES = new Set([
  '/api/cron/analytics/daily-metrics',
  '/api/cron/education-reminders',
  '/api/cron/monthly-dues',
  '/api/cron/monthly-per-capita',
  '/api/cron/overdue-notifications',
  '/api/cron/scheduled-reports',
  '/api/rewards/cron',
]);

/**
 * API route handler with authentication enforcement
 */
type ApiRouteHandler<TContext = any> = (
  request: NextRequest,
  context: { params?: TContext }
) => Promise<NextResponse> | NextResponse;

interface ApiGuardOptions {
  /**
   * Require authentication (default: true)
   */
  requireAuth?: boolean;
  
  /**
   * For cron routes: validate cron secret header
   */
  cronAuth?: boolean;
  
  /**
   * Minimum permission level required (future use)
   */
  minPermission?: string;
}

/**
 * Check if a route path is in the public allowlist
 */
function isPublicRoute(pathname: string): boolean {
  // Exact match
  if (PUBLIC_API_ROUTES.has(pathname)) {
    return true;
  }
  
  // Pattern match for dynamic routes
  for (const route of PUBLIC_API_ROUTES) {
    if (route.includes('[') || route.includes('*')) {
      const pattern = route
        .replace(/\[.*?\]/g, '[^/]+')
        .replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(pathname)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a route path is a cron job
 */
function isCronRoute(pathname: string): boolean {
  for (const route of CRON_API_ROUTES) {
    if (pathname.startsWith(route)) {
      return true;
    }
  }
  return false;
}

/**
 * Verify cron secret header
 */
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET_KEY;
  
  if (!expectedSecret) {
    console.error('CRON_SECRET_KEY not configured');
    return false;
  }
  
  return cronSecret === expectedSecret;
}

/**
 * API Authentication Guard Wrapper
 * 
 * Usage:
 * ```ts
 * export const GET = withApiAuth(async (request, context) => {
 *   // Your handler logic
 *   return NextResponse.json({ data });
 * });
 * 
 * // For cron routes:
 * export const POST = withApiAuth(async (request, context) => {
 *   // Your handler logic
 * }, { cronAuth: true });
 * 
 * // For public routes (explicitly):
 * export const GET = withApiAuth(async (request, context) => {
 *   // Your handler logic
 * }, { requireAuth: false });
 * ```
 */
export function withApiAuth<TContext = any>(
  handler: ApiRouteHandler<TContext>,
  options: ApiGuardOptions = {}
): ApiRouteHandler<TContext> {
  return async (request: NextRequest, context: { params?: TContext }) => {
    const pathname = request.nextUrl.pathname;
    
    // Check if route is in public allowlist
    const isPublic = isPublicRoute(pathname);
    const isCron = isCronRoute(pathname);
    
    // Determine if auth is required
    const requireAuth = options.requireAuth !== false && !isPublic;
    const requireCronAuth = options.cronAuth || isCron;
    
    // Cron authentication (secret header)
    if (requireCronAuth) {
      if (!verifyCronAuth(request)) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid cron secret' },
          { status: 401 }
        );
      }
      // Cron routes don't need user auth
      return handler(request, context);
    }
    
    // User authentication (Clerk)
    if (requireAuth) {
      try {
        const { userId } = await auth();
        
        if (!userId) {
          return NextResponse.json(
            { error: 'Unauthorized: Authentication required' },
            { status: 401 }
          );
        }
        
        // Optionally attach user to request for downstream use
        // (context would need to be extended)
      } catch (error) {
        console.error('Auth check failed:', error);
        return NextResponse.json(
          { error: 'Authentication error' },
          { status: 401 }
        );
      }
    }
    
    // Proceed to handler
    return handler(request, context);
  };
}

/**
 * Export auth utilities for existing middleware compatibility
 */
export { auth, currentUser } from '@clerk/nextjs/server';

/**
 * Require authenticated user with organization context
 * (alias for existing patterns)
 */
export async function requireApiUser() {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: Authentication required');
  }
  
  return {
    userId,
    organizationId: orgId || null,
  };
}
