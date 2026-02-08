/**
 * API Route Auth Scanner
 * 
 * Scans all API routes and identifies those without authentication guards.
 * Run with: pnpm tsx scripts/scan-api-auth.ts
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { PUBLIC_API_ROUTES, CRON_API_ROUTES } from '../lib/api-auth-guard';

interface RouteInfo {
  path: string;
  file: string;
  hasAuth: boolean;
  authPatterns: string[];
  isPublic: boolean;
  isCron: boolean;
}

const AUTH_PATTERNS = [
  'withApiAuth',
  'withSecureAPI',
  'withRoleAuth',
  'withEnhancedRoleAuth',
  'withTenantAuth',
  'requireUser',
  'requireApiUser',
  'auth()',
  'currentUser()',
  'getCurrentUser()',
  'getUserFromRequest(',
  'getServerSession(',
];

/**
 * Check if a route path is in the public allowlist (supports wildcards)
 */
function isPublicRoute(pathname: string): boolean {
  // Exact match
  if (PUBLIC_API_ROUTES.has(pathname)) {
    return true;
  }
  
  // Pattern match for dynamic routes and wildcards
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

function scanDirectory(dir: string, baseApiPath: string = ''): RouteInfo[] {
  const results: RouteInfo[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        const apiPath = baseApiPath ? `${baseApiPath}/${entry}` : entry;
        results.push(...scanDirectory(fullPath, apiPath));
      } else if (entry === 'route.ts' || entry === 'route.js') {
        // Found a route file
        const apiPath = `/api/${baseApiPath}`;
        const content = readFileSync(fullPath, 'utf-8');
        
        // Check for auth patterns
        const foundPatterns: string[] = [];
        for (const pattern of AUTH_PATTERNS) {
          if (content.includes(pattern)) {
            foundPatterns.push(pattern);
          }
        }
        
        const hasAuth = foundPatterns.length > 0;
        const isPublic = isPublicRoute(apiPath);
        const isCron = Array.from(CRON_API_ROUTES).some(route => apiPath.startsWith(route));
        
        results.push({
          path: apiPath,
          file: fullPath,
          hasAuth,
          authPatterns: foundPatterns,
          isPublic,
          isCron,
        });
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error);
  }
  
  return results;
}

function main() {
  console.log('🔍 Scanning API routes for authentication coverage...\n');
  
  const apiDir = join(process.cwd(), 'app', 'api');
  const routes = scanDirectory(apiDir);
  
  // Categorize routes
  const authenticated = routes.filter(r => r.hasAuth);
  const publicAllowlisted = routes.filter(r => r.isPublic && !r.hasAuth);
  const cronRoutes = routes.filter(r => r.isCron && !r.hasAuth);
  const unprotected = routes.filter(r => !r.hasAuth && !r.isPublic && !r.isCron);
  
  // Print summary
  console.log('📊 Summary:');
  console.log(`   Total routes: ${routes.length}`);
  console.log(`   ✅ Authenticated: ${authenticated.length}`);
  console.log(`   🌐 Public (allowlisted): ${publicAllowlisted.length}`);
  console.log(`   ⏰ Cron routes: ${cronRoutes.length}`);
  console.log(`   ⚠️  Unprotected (not allowlisted): ${unprotected.length}\n`);
  
  // Show unprotected routes that need attention
  if (unprotected.length > 0) {
    console.log('⚠️  UNPROTECTED ROUTES (need review):');
    console.log('   These routes lack auth guards and are not in the public allowlist.\n');
    
    unprotected.forEach(route => {
      console.log(`   ${route.path}`);
      console.log(`      File: ${route.file.replace(process.cwd(), '.')}`);
    });
    console.log('');
    console.log('   Action required:');
    console.log('   1. Add withApiAuth() wrapper to the route handler');
    console.log('   2. OR add to PUBLIC_API_ROUTES if intentionally public');
    console.log('   3. OR add to CRON_API_ROUTES if it\'s a cron job\n');
  }
  
  // Show public routes for verification
  if (publicAllowlisted.length > 0) {
    console.log('🌐 PUBLIC ROUTES (in allowlist):');
    publicAllowlisted.forEach(route => {
      console.log(`   ${route.path}`);
    });
    console.log('');
  }
  
  // Show cron routes
  if (cronRoutes.length > 0) {
    console.log('⏰ CRON ROUTES:');
    cronRoutes.forEach(route => {
      console.log(`   ${route.path}`);
    });
    console.log('');
  }
  
  // Exit with error code if there are unprotected routes
  if (unprotected.length > 0) {
    console.log('❌ Auth coverage incomplete. Please review unprotected routes.\n');
    process.exit(1);
  } else {
    console.log('✅ All API routes have proper authentication coverage!\n');
    process.exit(0);
  }
}

main();
