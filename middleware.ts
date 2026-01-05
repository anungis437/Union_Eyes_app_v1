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

// Create i18n middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true
});

// This handles both payment provider use cases from whop-setup.md and stripe-setup.md
export default clerkMiddleware((auth, req) => {
  // Skip i18n middleware for API routes
  if (req.nextUrl.pathname.startsWith('/api')) {
    // Skip auth for webhook endpoints
    if (req.nextUrl.pathname.startsWith('/api/whop/webhooks')) {
      console.log("Skipping Clerk auth for Whop webhook endpoint");
      return NextResponse.next();
    }
    
    // For other API routes, continue without i18n middleware
    // API routes should handle their own auth checks
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

  // Special handling for frictionless payment flow
  // If a user has just completed signup after payment and is authenticated,
  // redirect them to the dashboard instead of keeping them on the signup page
  const { userId } = auth();
  
  // Prevent logged-in users from accessing signup/login pages (causes redirect loop)
  if (userId && (req.nextUrl.pathname.includes('/signup') || req.nextUrl.pathname.includes('/login'))) {
    console.log("Authenticated user trying to access auth page, redirecting to dashboard");
    const locale = req.nextUrl.pathname.split('/')[1] || defaultLocale;
    const dashboardUrl = new URL(`/${locale}/dashboard`, req.url);
    return NextResponse.redirect(dashboardUrl);
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
