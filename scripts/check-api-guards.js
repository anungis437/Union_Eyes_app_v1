#!/usr/bin/env node
/**
 * API Guard Validation Script
 * 
 * Ensures all API routes are properly guarded with authentication.
 * Recognizes all valid auth patterns in the codebase.
 * 
 * @module scripts/check-api-guards
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// =============================================================================
// CONSTANTS
// =============================================================================

// Canonical guard module path
const CANONICAL_GUARD_MODULE = '@/lib/api-auth-guard';

// Public routes allowlist
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/health/liveness',
  '/api/status',
  '/api/docs/openapi.json',
  '/api/webhooks/stripe',
  '/api/webhooks/clc',
  '/api/webhooks/signatures',
  '/api/webhooks/whop',
  '/api/signatures/webhooks/docusign',
  '/api/integrations/shopify/webhooks',
  '/api/stripe/webhooks',
  '/api/whop/webhooks',
  '/api/whop/unauthenticated-checkout',
  '/api/whop/create-checkout',
  '/api/communications/track/open/*',
  '/api/communications/track/click',
  '/api/communications/unsubscribe/*',
  '/api/sentry-example-api',
  '/api/cron/analytics/daily-metrics',
  '/api/cron/education-reminders',
  '/api/cron/monthly-dues',
  '/api/cron/monthly-per-capita',
  '/api/cron/overdue-notifications',
  '/api/cron/scheduled-reports',
  '/api/rewards/cron',
  '/api/cron/external-data-sync',
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function matchesPattern(pattern, apiPath) {
  const regexPattern = pattern
    .replace(/\[.*?\]/g, '[^/]+')
    .replace(/\*/g, '.*');
  return new RegExp(`^${regexPattern}$`).test(apiPath);
}

function isAllowlisted(apiPath) {
  return PUBLIC_ROUTES.some(route => matchesPattern(route, apiPath));
}

/**
 * Check if content contains canonical guard import
 */
function hasCanonicalGuardImport(content) {
  const withApiAuthPattern = /import\s*\{[^}]*withApiAuth[^}]*\}\s*from\s*['"]@\//.test(content);
  const requireApiAuthPattern = /import\s*\{[^}]*requireApiAuth[^}]*\}\s*from\s*['"]@\//.test(content);
  return withApiAuthPattern || requireApiAuthPattern;
}

/**
 * Check for canonical guard usage
 */
function hasCanonicalGuardUsage(content) {
  const wrapperPattern = /export\s+const\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS)\s*=\s*withApiAuth\s*\(/;
  const requirePattern = /await\s+requireApiAuth\s*\(/;
  return wrapperPattern.test(content) || (content.includes('await requireApiAuth') && hasCanonicalGuardImport(content));
}

/**
 * Check for middleware auth patterns
 */
function hasMiddlewareAuth(content) {
  // withEnhancedRoleAuth from enterprise-role-middleware
  if (/withEnhancedRoleAuth\s*\(/.test(content)) {
    return { guarded: true, type: 'middleware', details: 'withEnhancedRoleAuth' };
  }
  
  // withSecureAPI from api-security middleware
  if (/withSecureAPI\s*\(/.test(content)) {
    return { guarded: true, type: 'middleware', details: 'withSecureAPI' };
  }
  
  // withAdminOnly from api-security middleware
  if (/withAdminOnly\s*\(/.test(content)) {
    return { guarded: true, type: 'middleware', details: 'withAdminOnly' };
  }
  
  // withValidatedBody, withValidatedQuery from api-security middleware
  if (/withValidated(Body|Query)\s*\(/.test(content)) {
    return { guarded: true, type: 'middleware', details: 'withValidated' };
  }
  
  // withOrganizationAuth from organization-middleware
  if (/withOrganizationAuth\s*\(/.test(content)) {
    return { guarded: true, type: 'middleware', details: 'withOrganizationAuth' };
  }
  
  // withRoleAuth from role-middleware
  if (/withRoleAuth\s*\(/.test(content)) {
    return { guarded: true, type: 'middleware', details: 'withRoleAuth' };
  }
  
  return null;
}

/**
 * Check for Clerk auth patterns
 */
function hasClerkAuth(content) {
  // auth() or getAuth() from @clerk/nextjs/server
  if (/\bauth\s*\(\s*\)|\bgetAuth\s*\(/.test(content)) {
    return { guarded: true, type: 'clerk', details: 'auth() or getAuth()' };
  }
  
  // currentUser() from @clerk/nextjs/server
  if (/currentUser\s*\(/.test(content)) {
    return { guarded: true, type: 'clerk', details: 'currentUser()' };
  }
  
  return null;
}

/**
 * Check for requireUser pattern from unified-auth
 */
function hasRequireUser(content) {
  if (/requireUser\s*\(/.test(content)) {
    return { guarded: true, type: 'requireUser', details: 'requireUser()' };
  }
  
  if (/requireUserForOrganization\s*\(/.test(content)) {
    return { guarded: true, type: 'requireUser', details: 'requireUserForOrganization()' };
  }
  
  if (/requireRole\s*\(/.test(content)) {
    return { guarded: true, type: 'requireUser', details: 'requireRole()' };
  }
  
  return null;
}

/**
 * Check for getUserFromRequest pattern
 */
function hasGetUserFromRequest(content) {
  if (/getUserFromRequest\s*\(/.test(content)) {
    return { guarded: true, type: 'getUserFromRequest', details: 'getUserFromRequest()' };
  }
  
  // getCurrentUser from lib/auth
  if (/getCurrentUser\s*\(/.test(content)) {
    return { guarded: true, type: 'getUserFromRequest', details: 'getCurrentUser()' };
  }
  
  return null;
}

/**
 * Check for cron auth pattern
 */
function hasCronAuth(content) {
  if (/CRON_SECRET/.test(content) && /authorization|headers?\s*\(/.test(content)) {
    return { guarded: true, type: 'cron', details: 'CRON_SECRET auth' };
  }
  
  return null;
}

/**
 * Check if route is properly guarded (any valid pattern)
 */
function isRouteGuarded(content) {
  // Check canonical module
  if (hasCanonicalGuardImport(content) && hasCanonicalGuardUsage(content)) {
    return { guarded: true, type: 'canonical', details: 'withApiAuth or requireApiAuth' };
  }
  
  // Check middleware auth
  const middlewareAuth = hasMiddlewareAuth(content);
  if (middlewareAuth) return middlewareAuth;
  
  // Check Clerk auth
  const clerkAuth = hasClerkAuth(content);
  if (clerkAuth) return clerkAuth;
  
  // Check requireUser
  const requireUserAuth = hasRequireUser(content);
  if (requireUserAuth) return requireUserAuth;
  
  // Check getUserFromRequest
  const getUserAuth = hasGetUserFromRequest(content);
  if (getUserAuth) return getUserAuth;
  
  // Check cron auth
  const cronAuth = hasCronAuth(content);
  if (cronAuth) return cronAuth;
  
  return { guarded: false };
}

/**
 * Find all API routes in the app directory
 */
function findApiRoutes(appDir) {
  const pattern = path.join(appDir, 'api', '**/route.ts').replace(/\\/g, '/');
  const files = glob.sync(pattern);
  
  return files.map(filePath => {
    const relativePath = path.relative(appDir, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const apiPath = '/' + relativePath.replace(/\/route\.ts$/, '').replace(/\\/g, '/');
    
    const exportMatches = content.match(/export\s+(const|async\s+function)\s+(GET|POST|PUT|DELETE|PATCH)/g) || [];
    const exports = exportMatches.map(m => {
      const match = m.match(/(GET|POST|PUT|DELETE|PATCH)/);
      return match ? match[1] : '';
    }).filter(Boolean);
    
    return { filePath, relativePath, apiPath, content, exports };
  });
}

/**
 * Check if an allowlisted route file actually exists
 */
function validateAllowlistExists(routes) {
  const invalidAllowlist = [];
  
  for (const route of routes) {
    if (isAllowlisted(route.apiPath)) {
      if (!fs.existsSync(route.filePath)) {
        invalidAllowlist.push(route);
      }
    }
  }
  
  return invalidAllowlist;
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  console.log('🔐 API Route Guard Validation\n');
  console.log('Recognized Auth Patterns:');
  console.log('  - withApiAuth / requireApiAuth (canonical)');
  console.log('  - withEnhancedRoleAuth / withSecureAPI (middleware)');
  console.log('  - auth() / currentUser() (Clerk)');
  console.log('  - requireUser / requireRole (unified-auth)');
  console.log('  - getCurrentUser / getUserFromRequest (lib/auth)');
  console.log('  - CRON_SECRET (cron routes)\n');
  
  const appDir = path.join(process.cwd(), 'app');
  
  if (!fs.existsSync(appDir)) {
    console.error(`Error: app directory not found at ${appDir}`);
    process.exit(1);
  }
  
  const routes = findApiRoutes(appDir);
  
  const violations = [];
  const guarded = [];
  const allowlisted = [];
  const invalidAllowlist = [];
  
  // Count by guard type
  const guardTypeCounts = {};
  
  for (const route of routes) {
    const guardCheck = isRouteGuarded(route.content);
    const isPublic = isAllowlisted(route.apiPath);
    
    if (!guardCheck.guarded && !isPublic) {
      violations.push(route);
    } else if (guardCheck.guarded) {
      guarded.push({ ...route, guardType: guardCheck.type, guardDetails: guardCheck.details });
      guardTypeCounts[guardCheck.type] = (guardTypeCounts[guardCheck.type] || 0) + 1;
    } else if (isPublic) {
      allowlisted.push(route);
    }
  }
  
  // Validate allowlist
  const invalidRoutes = validateAllowlistExists(routes);
  
  // Report
  console.log('Routes Summary:');
  console.log(`  Total routes:       ${routes.length}`);
  console.log(`  ✅ Guarded:         ${guarded.length}`);
  console.log(`  📋 Allowlisted:     ${allowlisted.length}`);
  console.log(`  ❌ Violations:      ${violations.length}`);
  console.log(`  ⚠️  Invalid:         ${invalidRoutes.length}`);
  console.log('');
  
  console.log('Guard Type Distribution:');
  for (const [type, count] of Object.entries(guardTypeCounts)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log('');
  
  // Fail if invalid allowlist entries
  if (invalidRoutes.length > 0) {
    console.log('❌ INVALID ALLOWLIST ENTRIES:\n');
    for (const route of invalidRoutes) {
      console.log(`  ✗ ${route.apiPath}`);
    }
    process.exit(1);
  }
  
  if (violations.length > 0) {
    console.log('❌ UNGUARDED ROUTES (not allowlisted):\n');
    
    for (const v of violations.slice(0, 20)) {
      console.log(`  ✗ ${v.apiPath}`);
      console.log(`    File: ${v.relativePath}`);
      console.log(`    Methods: ${v.exports.join(', ') || 'none exported'}`);
      console.log('');
    }
    
    if (violations.length > 20) {
      console.log(`  ... and ${violations.length - 20} more\n`);
    }
    
    console.log('To fix, add authentication to these routes using any recognized pattern:\n');
    console.log('  1. Canonical (recommended):');
    console.log(`     import { withApiAuth } from '${CANONICAL_GUARD_MODULE}';`);
    console.log('     export const GET = withApiAuth(async (request) => { ... });\n');
    console.log('  2. Middleware:');
    console.log('     import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";');
    console.log('     export const GET = withEnhancedRoleAuth(50, async (request, context) => { ... });\n');
    console.log('  3. Clerk:');
    console.log('     import { auth } from "@clerk/nextjs/server";');
    console.log('     export async function GET(request) { const { userId } = await auth(); ... }\n');
    console.log('  4. lib/auth (getCurrentUser):');
    console.log('     import { getCurrentUser } from "@/lib/auth";');
    console.log('     const user = await getCurrentUser();\n');
    console.log('  5. Or add route to PUBLIC_ROUTES array if truly public');
    console.log('');
    
    process.exit(1);
  }
  
  console.log('✅ PASS: All API routes are properly guarded!');
  console.log(`\nCanonical module: ${CANONICAL_GUARD_MODULE}`);
  process.exit(0);
}

if (require.main === module) {
  main();
}
