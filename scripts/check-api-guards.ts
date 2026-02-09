#!/usr/bin/env tsx
/**
 * API Guard Validation Script
 * 
 * Ensures all API routes are properly guarded with authentication.
 * Fails if any route lacks proper guards and is not explicitly allowlisted.
 * 
 * This script helps enforce the "deny-by-default" security policy for API routes.
 * 
 * @requires tsx (TypeScript executor)
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { PUBLIC_API_ROUTES, CRON_API_ROUTES } from '../config/public-api-routes';

interface RouteFileInfo {
  filePath: string;
  relativePath: string;
  apiPath: string;
  content: string;
  exports: string[];
}

interface ValidationResult {
  file: RouteFileInfo;
  isGuarded: boolean;
  isAllowlisted: boolean;
  guardType?: 'requireApiAuth' | 'withApiAuth' | 'withEnhancedRoleAuth' | 'manual-auth';
  reason?: string;
}

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function findApiRoutes(appDir: string): RouteFileInfo[] {
  // Find all route.ts files in app/api
  const pattern = path.join(appDir, 'api', '**/route.ts').replace(/\\/g, '/');
  const files = glob.sync(pattern);
  
  return files.map(filePath => {
    const relativePath = path.relative(appDir, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Convert file path to API path
    // app/api/members/[id]/route.ts -> /api/members/[id]
    const apiPath = '/' + relativePath
      .replace(/\/route\.ts$/, '')
      .replace(/\\/g, '/');
    
    // Extract exported methods (GET, POST, PUT, DELETE, PATCH)
    const exportMatches = content.match(/export\s+(const|async\s+function)\s+(GET|POST|PUT|DELETE|PATCH)/g) || [];
    const exports = exportMatches.map(m => {
      const match = m.match(/(GET|POST|PUT|DELETE|PATCH)/);
      return match ? match[1] : '';
    }).filter(Boolean);
    
    return {
      filePath,
      relativePath,
      apiPath,
      content,
      exports,
    };
  });
}

function isRouteGuarded(file: RouteFileInfo): { guarded: boolean; type?: string; reason?: string } {
  const { content } = file;
  
  // Check for various guard patterns
  
  // 1. requireApiAuth usage
  if (content.includes('requireApiAuth')) {
    return { guarded: true, type: 'requireApiAuth' };
  }
  
  // 2. withApiAuth wrapper
  if (content.includes('withApiAuth')) {
    return { guarded: true, type: 'withApiAuth' };
  }
  
  // 3. withEnhancedRoleAuth wrapper
  if (content.includes('withEnhancedRoleAuth')) {
    return { guarded: true, type: 'withEnhancedRoleAuth' };
  }
  
  // 4. Manual auth() calls from Clerk (less ideal but acceptable)
  if (content.includes('await auth()') || content.includes('const { userId') && content.includes('await auth')) {
    return { guarded: true, type: 'manual-auth', reason: 'Uses manual auth() calls (consider using requireApiAuth)' };
  }
  
  // 5. withRLSContext implies authentication
  if (content.includes('withRLSContext')) {
    return { guarded: true, type: 'manual-auth', reason: 'Uses withRLSContext (implies auth)' };
  }
  
  return { guarded: false };
}

function isRouteAllowlisted(apiPath: string): boolean {
  // Check against public routes
  const allPublicRoutes = [...PUBLIC_API_ROUTES, ...CRON_API_ROUTES];
  
  return allPublicRoutes.some(route => {
    const pattern = route.pattern
      .replace(/\[.*?\]/g, '[^/]+')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(apiPath);
  });
}

function validateRoutes(appDir: string): ValidationResult[] {
  const routes = findApiRoutes(appDir);
  
  return routes.map(file => {
    const guardCheck = isRouteGuarded(file);
    const isAllowlisted = isRouteAllowlisted(file.apiPath);
    
    return {
      file,
      isGuarded: guardCheck.guarded,
      isAllowlisted,
      guardType: guardCheck.type as any,
      reason: guardCheck.reason,
    };
  });
}

function main() {
  console.log(`${colors.cyan}🔐 API Route Guard Validation${colors.reset}\n`);
  
  const appDir = path.join(process.cwd(), 'app');
  
  if (!fs.existsSync(appDir)) {
    console.error(`${colors.red}Error: app directory not found at ${appDir}${colors.reset}`);
    process.exit(1);
  }
  
  const results = validateRoutes(appDir);
  
  // Categorize results
  const violations: ValidationResult[] = [];
  const guarded: ValidationResult[] = [];
  const allowlisted: ValidationResult[] = [];
  
  for (const result of results) {
    if (!result.isGuarded && !result.isAllowlisted) {
      violations.push(result);
    } else if (result.isGuarded) {
      guarded.push(result);
    } else if (result.isAllowlisted) {
      allowlisted.push(result);
    }
  }
  
  // Report statistics
  console.log(`${colors.cyan}Routes Summary:${colors.reset}`);
  console.log(`  Total routes:    ${results.length}`);
  console.log(`  ${colors.green}✅ Guarded:       ${guarded.length}${colors.reset}`);
  console.log(`  ${colors.yellow}📋 Allowlisted:   ${allowlisted.length}${colors.reset}`);
  console.log(`  ${colors.red}❌ Violations:    ${violations.length}${colors.reset}`);
  console.log('');
  
  // Show violations
  if (violations.length > 0) {
    console.log(`${colors.red}❌ UNGUARDED ROUTES (not allowlisted):${colors.reset}\n`);
    
    for (const v of violations) {
      console.log(`  ${colors.red}✗${colors.reset} ${v.file.apiPath}`);
      console.log(`    File: ${v.file.relativePath}`);
      console.log(`    Methods: ${v.file.exports.join(', ') || 'none exported'}`);
      console.log('');
    }
    
    console.log(`${colors.yellow}To fix:${colors.reset}`);
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
  
  // Show warnings for manual auth
  const manualAuthRoutes = guarded.filter(r => r.guardType === 'manual-auth');
  if (manualAuthRoutes.length > 0) {
    console.log(`${colors.yellow}⚠️  Routes using manual auth (${manualAuthRoutes.length}):${colors.reset}`);
    manualAuthRoutes.slice(0, 5).forEach(r => {
      console.log(`  - ${r.file.apiPath} (${r.reason || 'manual auth'})`);
    });
    if (manualAuthRoutes.length > 5) {
      console.log(`  ... and ${manualAuthRoutes.length - 5} more`);
    }
    console.log('  Consider migrating to requireApiAuth() for consistency.');
    console.log('');
  }
  
  console.log(`${colors.green}✅ PASS: All API routes are properly guarded!${colors.reset}`);
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main();
}
