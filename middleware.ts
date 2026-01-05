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
  "/:locale/login(.*)",
  "/:locale/signup(.*)"
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
  // Skip middleware for static files and API routes
  if (req.nextUrl.pathname.startsWith('/api') || 
      req.nextUrl.pathname.startsWith('/_next') ||
      req.nextUrl.pathname.includes('.')) {
    // Skip auth for webhook endpoints
    if (req.nextUrl.pathname.startsWith('/api/whop/webhooks')) {
      console.log("Skipping Clerk auth for Whop webhook endpoint");
    }
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
