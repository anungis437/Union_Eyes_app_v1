/**
 * Next.js Edge Middleware
 * 
 * MIDDLEWARE STACK ARCHITECTURE:
 * ================================
 * 
 * This application uses a multi-layer middleware approach for security and isolation:
 * 
 * Layer 1: Edge Middleware (THIS FILE)
 * - Runs on Vercel Edge/Cloudflare network before request reaches application
 * - Responsibilities:
 *   1. Clerk authentication (JWT validation, session management)
 *   2. i18n localization routing
 *   3. Route protection (public vs protected routes)
 *   4. Webhook authentication (cron, Stripe, Clerk webhooks)
 * - Sets: userId, orgId, sessionClaims in request context
 * 
 * Layer 2: Database RLS Context (lib/db/with-rls-context.ts)
 * - Runs inside API routes and server actions
 * - Responsibilities:
 *   1. Sets PostgreSQL session variables (app.current_user_id)
 *   2. Enables Row-Level Security enforcement
 *   3. Transaction-scoped isolation (prevents context leakage)
 * - Usage: Wrap all database operations in withRLSContext()
 * 
 * Layer 3: Application Authorization (lib/auth.ts)
 * - Runs inside business logic
 * - Responsibilities:
 *   1. Role-based access control (RBAC)
 *   2. Organization membership checks
 *   3. Permission validation
 * - Functions: hasRole(), isSystemAdmin(), hasRoleInOrganization()
 * 
 * COORDINATION:
 * - Edge middleware authenticates user via Clerk
 * - RLS middleware sets database context using authenticated user ID
 * - RLS policies enforce row-level security automatically
 * - Application code can add additional authorization checks as needed
 * 
 * See: docs/security/RLS_AUTH_RBAC_ALIGNMENT.md for complete architecture
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

const isProtectedRoute = createRouteMatcher([
  "/:locale/dashboard(.*)"
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/:locale",
  "/login(.*)",
  "/signup(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/:locale/login(.*)",
  "/:locale/signup(.*)",
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)"
]);

const isApiPublicRoute = createRouteMatcher([
  "/api/health",
  "/api/health/liveness",
  "/api/status",
  "/api/docs/openapi.json",
  "/api/webhooks(.*)",
  "/api/stripe/webhooks",
  "/api/whop/webhooks",
  "/api/signatures/webhooks(.*)",
  "/api/integrations/shopify/webhooks",
  "/api/communications/track(.*)",
  "/api/communications/unsubscribe(.*)",
  "/api/whop/unauthenticated-checkout",
  "/api/sentry-example-api"
]);

const isApiCronRoute = createRouteMatcher(["/api/cron(.*)"]);

// Create i18n middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true
});

// This handles both payment provider use cases from whop-setup.md and stripe-setup.md
export default clerkMiddleware((auth, req) => {
  if (req.nextUrl.pathname.startsWith('/api')) {
    if (isApiPublicRoute(req)) {
      return NextResponse.next();
    }

    if (isApiCronRoute(req)) {
      const cronSecret = process.env.CRON_SECRET || "";
      const providedSecret = req.headers.get("x-cron-secret") || "";
      if (!cronSecret || cronSecret !== providedSecret) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      return NextResponse.next();
    }

    auth().protect();
    return NextResponse.next();
  }

  // Skip middleware for static files
  if (req.nextUrl.pathname.startsWith('/_next') ||
      req.nextUrl.pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Check for problematic URLs that might cause 431 errors
  // This covers both Clerk handshake params and payment provider redirects
  if (
    req.nextUrl.search && (
      req.nextUrl.search.includes('__clerk_handshake') ||
      req.nextUrl.search.includes('payment_intent') ||
      req.nextUrl.search.includes('checkout_id') ||
      req.nextUrl.search.includes('ref=') ||
      req.nextUrl.search.includes('client_reference_id=')
    )
  ) {
    // The URL contains parameters that might cause 431 errors
    // Instead of just letting it pass through, redirect to a clean URL
    // This prevents the accumulation of large cookies
    
    // Extract the base URL path without query parameters
    const cleanUrl = req.nextUrl.pathname;
    
    // Create a new URL object based on the current request
    const url = new URL(cleanUrl, req.url);
    
    // Important: Add a small cache-busting parameter to ensure the browser doesn't use cached data
    // This helps avoid cookie-related issues without adding significant query string size
    url.searchParams.set('cb', Date.now().toString().slice(-4));
    
    console.log(`Redirecting from problematic URL with large parameters to clean URL: ${url.toString()}`);
    
    // Return a redirect response to the clean URL
    return NextResponse.redirect(url);
  }

  // Protect non-public routes
  if (!isPublicRoute(req)) {
    auth().protect();
  }
  
  // For non-API routes, run i18n middleware and return its response
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, but match everything else
    '/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\..*).*)' 
  ]
};
