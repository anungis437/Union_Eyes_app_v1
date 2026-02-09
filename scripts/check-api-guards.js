#!/usr/bin/env node
/**
 * API Guard Validation Script (Node.js version)
 * 
 * Ensures all API routes are properly guarded with authentication.
 * Fails if any route lacks proper guards and is not explicitly allowlisted.
 * 
 * This script helps enforce the "deny-by-default" security policy for API routes.
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Public routes allowlist (sync with config/public-api-routes.ts)
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
];

function matchesPattern(pattern, path) {
  const regex = pattern
    .replace(/\[.*?\]/g, '[^/]+')
    .replace(/\*/g, '.*');
  return new RegExp(`^${regex}$`).test(path);
}

function isAllowlisted(apiPath) {
  return PUBLIC_ROUTES.some(route => matchesPattern(route, apiPath));
}

function isRouteGuarded(content) {
  // Check for various guard patterns
  if (content.includes('requireApiAuth')) return { guarded: true, type: 'requireApiAuth' };
  if (content.includes('withApiAuth')) return { guarded: true, type: 'withApiAuth' };
  if (content.includes('withEnhancedRoleAuth')) return { guarded: true, type: 'withEnhancedRoleAuth' };
  if (content.includes('withOrganizationAuth')) return { guarded: true, type: 'withOrganizationAuth' };
  if (content.includes('withRoleAuth')) return { guarded: true, type: 'withRoleAuth' };
  if (content.includes('withSecureAPI')) return { guarded: true, type: 'withSecureAPI' };
  if (content.includes('requireUser')) return { guarded: true, type: 'requireUser' };
  if (content.includes('getCurrentUser')) return { guarded: true, type: 'getCurrentUser' };
  if (content.includes('getUserFromRequest')) return { guarded: true, type: 'getUserFromRequest' };
  if (content.includes('currentUser()')) return { guarded: true, type: 'currentUser' };
  if (content.includes('withRLSContext')) return { guarded: true, type: 'withRLSContext' };
  if (content.includes('await auth()')) return { guarded: true, type: 'manual-auth' };
  return { guarded: false };
}

function findApiRoutes(appDir) {
  const pattern = path.join(appDir, 'api', '**/route.ts').replace(/\\/g, '/');
  const files = glob.sync(pattern);
  
  return files.map(filePath => {
    const relativePath = path.relative(appDir, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Convert file path to API path
    const apiPath = '/' + relativePath.replace(/\/route\.ts$/, '').replace(/\\/g, '/');
    
    // Extract exported methods
    const exportMatches = content.match(/export\s+(const|async\s+function)\s+(GET|POST|PUT|DELETE|PATCH)/g) || [];
    const exports = exportMatches.map(m => {
      const match = m.match(/(GET|POST|PUT|DELETE|PATCH)/);
      return match ? match[1] : '';
    }).filter(Boolean);
    
    return { filePath, relativePath, apiPath, content, exports };
  });
}

function main() {
  console.log('🔐 API Route Guard Validation\n');
  
  const appDir = path.join(process.cwd(), 'app');
  
  if (!fs.existsSync(appDir)) {
    console.error(`Error: app directory not found at ${appDir}`);
    process.exit(1);
  }
  
  const routes = findApiRoutes(appDir);
  
  const violations = [];
  const guarded = [];
  const allowlisted = [];
  
  for (const route of routes) {
    const guardCheck = isRouteGuarded(route.content);
    const isPublic = isAllowlisted(route.apiPath);
    
    if (!guardCheck.guarded && !isPublic) {
      violations.push(route);
    } else if (guardCheck.guarded) {
      guarded.push({ ...route, guardType: guardCheck.type });
    } else if (isPublic) {
      allowlisted.push(route);
    }
  }
  
  // Report
  console.log('Routes Summary:');
  console.log(`  Total routes:    ${routes.length}`);
  console.log(`  ✅ Guarded:       ${guarded.length}`);
  console.log(`  📋 Allowlisted:   ${allowlisted.length}`);
  console.log(`  ❌ Violations:    ${violations.length}`);
  console.log('');
  
  if (violations.length > 0) {
    console.log('❌ UNGUARDED ROUTES (not allowlisted):\n');
    
    for (const v of violations) {
      console.log(`  ✗ ${v.apiPath}`);
      console.log(`    File: ${v.relativePath}`);
      console.log(`    Methods: ${v.exports.join(', ') || 'none exported'}`);
      console.log('');
    }
    
    console.log('To fix:');
    console.log('  1. Add requireApiAuth() to the route handler:');
    console.log('     ```typescript');
    console.log('     import { requireApiAuth } from "@/lib/api-auth-guard";');
    console.log('     ');
    console.log('     export async function GET(request: NextRequest) {');
    console.log('       await requireApiAuth({ tenant: true });');
    console.log('       // your handler logic');
    console.log('     }');
    console.log('     ```');
    console.log('');
    console.log('  2. OR add route to config/public-api-routes.ts if truly public');
    console.log('');
    
    process.exit(1);
  }
  
  console.log('✅ PASS: All API routes are properly guarded!');
  process.exit(0);
}

if (require.main === module) {
  main();
}
