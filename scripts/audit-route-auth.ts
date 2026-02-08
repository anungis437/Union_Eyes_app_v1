#!/usr/bin/env tsx
/**
 * Route Authorization Audit Script
 * 
 * Analyzes all API routes to verify proper authentication and authorization middleware
 * Identifies unprotected routes and generates comprehensive security report
 * 
 * Usage: pnpm tsx scripts/audit-route-auth.ts
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RouteAnalysis {
  path: string;
  relativePath: string;
  methods: string[];
  authMiddleware: string[];
  isProtected: boolean;
  roleLevel?: number;
  permissions?: string[];
  issues: string[];
  lineNumbers: { [key: string]: number };
}

interface AuditSummary {
  totalRoutes: number;
  protectedRoutes: number;
  unprotectedRoutes: number;
  criticalIssues: number;
  warningIssues: number;
  routes: RouteAnalysis[];
}

// Auth middleware patterns to detect
const AUTH_PATTERNS = {
  withEnhancedRoleAuth: /withEnhancedRoleAuth\s*\(\s*(\d+)\s*,/g,
  withPermission: /withPermission\s*\(\s*['"]([\w_]+)['"]\s*,/g,
  withOrganizationAuth: /withOrganizationAuth\s*\(/g,
  withRoleAuth: /withRoleAuth\s*\(/g,
  checkUserRole: /checkUserRole\s*\(/g,
  checkUserPermission: /checkUserPermission\s*\(/g,
  requireAuth: /requireAuth\s*\(/g,
  getServerSession: /getServerSession\s*\(/g,
  auth: /auth\s*\(\s*\)/g,
};

// HTTP methods to check
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

// Routes that should be public (no auth required)
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/auth/callback',
  '/api/auth/signin',
  '/api/auth/signout',
  '/api/webhooks',
  '/api/stripe/webhook',
  '/api/clerk/webhook',
  '/api/public',
];

/**
 * Recursively scan directory for route files
 */
function scanDirectory(dir: string, baseDir: string): string[] {
  const files: string[] = [];
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...scanDirectory(fullPath, baseDir));
      } else if (item === 'route.ts' || item === 'route.js') {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
  
  return files;
}

/**
 * Analyze a route file for auth middleware
 */
function analyzeRouteFile(filePath: string, baseDir: string): RouteAnalysis {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = relative(baseDir, filePath);
  
  const analysis: RouteAnalysis = {
    path: filePath,
    relativePath,
    methods: [],
    authMiddleware: [],
    isProtected: false,
    issues: [],
    lineNumbers: {},
  };
  
  // Detect HTTP method exports
  for (const method of HTTP_METHODS) {
    const methodPattern = new RegExp(`export\\s+(?:const|async\\s+function)\\s+${method}\\s*[=:]`, 'gm');
    if (methodPattern.test(content)) {
      analysis.methods.push(method);
      
      // Find line number
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`export`) && lines[i].includes(method)) {
          analysis.lineNumbers[method] = i + 1;
          break;
        }
      }
    }
  }
  
  // Detect auth middleware usage
  for (const [middleware, pattern] of Object.entries(AUTH_PATTERNS)) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      analysis.authMiddleware.push(middleware);
      analysis.isProtected = true;
      
      // Extract role level for withEnhancedRoleAuth
      if (middleware === 'withEnhancedRoleAuth') {
        const roleLevelMatch = pattern.exec(content);
        if (roleLevelMatch && roleLevelMatch[1]) {
          analysis.roleLevel = parseInt(roleLevelMatch[1], 10);
        }
      }
      
      // Extract permissions for withPermission
      if (middleware === 'withPermission') {
        const permMatches = Array.from(content.matchAll(pattern));
        analysis.permissions = permMatches.map(m => m[1]);
      }
    }
  }
  
  // Check for deprecated auth functions
  if (content.includes('checkUserRole') || content.includes('checkUserPermission')) {
    analysis.issues.push('CRITICAL: Uses deprecated stub auth functions (checkUserRole/checkUserPermission)');
  }
  
  // Check if route is public (should be unprotected)
  const isPublicRoute = PUBLIC_ROUTES.some(route => relativePath.includes(route.replace('/api/', '')));
  
  // Identify issues
  if (!isPublicRoute && !analysis.isProtected && analysis.methods.length > 0) {
    analysis.issues.push('WARNING: Unprotected route - no auth middleware detected');
  }
  
  if (analysis.methods.length === 0) {
    analysis.issues.push('INFO: No HTTP method exports found');
  }
  
  // Check for multiple auth middlewares (potential conflict)
  if (analysis.authMiddleware.length > 2) {
    analysis.issues.push('WARNING: Multiple auth middlewares detected - verify no conflicts');
  }
  
  return analysis;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(summary: AuditSummary): string {
  const timestamp = new Date().toISOString();
  const protectionRate = ((summary.protectedRoutes / summary.totalRoutes) * 100).toFixed(1);
  
  let report = `# Route Authorization Audit Report\n\n`;
  report += `**Generated:** ${timestamp}  \n`;
  report += `**Total Routes:** ${summary.totalRoutes}  \n`;
  report += `**Protected Routes:** ${summary.protectedRoutes} (${protectionRate}%)  \n`;
  report += `**Unprotected Routes:** ${summary.unprotectedRoutes}  \n`;
  report += `**Critical Issues:** ${summary.criticalIssues}  \n`;
  report += `**Warnings:** ${summary.warningIssues}  \n\n`;
  
  report += `---\n\n`;
  
  // Critical Issues Section
  const criticalRoutes = summary.routes.filter(r => 
    r.issues.some(i => i.startsWith('CRITICAL'))
  );
  
  if (criticalRoutes.length > 0) {
    report += `## 🔴 Critical Issues\n\n`;
    for (const route of criticalRoutes) {
      report += `### ${route.relativePath}\n\n`;
      report += `**Methods:** ${route.methods.join(', ')}  \n`;
      report += `**Issues:**\n`;
      for (const issue of route.issues.filter(i => i.startsWith('CRITICAL'))) {
        report += `- ⛔ ${issue}\n`;
      }
      report += `\n`;
    }
    report += `---\n\n`;
  }
  
  // Unprotected Routes Section
  const unprotectedRoutes = summary.routes.filter(r => 
    !r.isProtected && r.methods.length > 0 && 
    !PUBLIC_ROUTES.some(pub => r.relativePath.includes(pub.replace('/api/', '')))
  );
  
  if (unprotectedRoutes.length > 0) {
    report += `## ⚠️ Unprotected Routes\n\n`;
    report += `These routes have no authentication middleware and should be reviewed:\n\n`;
    
    for (const route of unprotectedRoutes) {
      report += `### ${route.relativePath}\n\n`;
      report += `**Methods:** ${route.methods.join(', ')}  \n`;
      report += `**Line Numbers:**\n`;
      for (const [method, line] of Object.entries(route.lineNumbers)) {
        report += `- ${method}: Line ${line}\n`;
      }
      report += `\n`;
    }
    report += `---\n\n`;
  }
  
  // Protected Routes Summary
  report += `## ✅ Protected Routes Summary\n\n`;
  
  const byMiddleware: { [key: string]: RouteAnalysis[] } = {};
  for (const route of summary.routes.filter(r => r.isProtected)) {
    const middleware = route.authMiddleware[0] || 'unknown';
    if (!byMiddleware[middleware]) {
      byMiddleware[middleware] = [];
    }
    byMiddleware[middleware].push(route);
  }
  
  for (const [middleware, routes] of Object.entries(byMiddleware)) {
    report += `### ${middleware} (${routes.length} routes)\n\n`;
    
    if (middleware === 'withEnhancedRoleAuth') {
      const byRoleLevel: { [key: number]: number } = {};
      for (const route of routes) {
        if (route.roleLevel !== undefined) {
          byRoleLevel[route.roleLevel] = (byRoleLevel[route.roleLevel] || 0) + 1;
        }
      }
      
      report += `**Role Level Distribution:**\n`;
      for (const [level, count] of Object.entries(byRoleLevel).sort((a, b) => Number(a[0]) - Number(b[0]))) {
        const levelName = getRoleLevelName(Number(level));
        report += `- Level ${level} (${levelName}): ${count} routes\n`;
      }
      report += `\n`;
    }
    
    report += `<details>\n<summary>View ${routes.length} routes</summary>\n\n`;
    for (const route of routes) {
      report += `- \`${route.relativePath}\` - Methods: ${route.methods.join(', ')}`;
      if (route.roleLevel !== undefined) {
        report += ` - Role Level: ${route.roleLevel}`;
      }
      if (route.permissions && route.permissions.length > 0) {
        report += ` - Permissions: ${route.permissions.join(', ')}`;
      }
      report += `\n`;
    }
    report += `\n</details>\n\n`;
  }
  
  report += `---\n\n`;
  
  // Recommendations
  report += `## 📋 Recommendations\n\n`;
  
  if (summary.criticalIssues > 0) {
    report += `### Critical Actions Required\n`;
    report += `1. **Replace deprecated auth functions** - ${summary.criticalIssues} routes using checkUserRole/checkUserPermission\n`;
    report += `   - Migrate to withEnhancedRoleAuth() or withPermission() from enterprise-role-middleware.ts\n`;
    report += `   - See [lib/auth/permissions.ts](../lib/auth/permissions.ts) deprecation notices for migration guide\n\n`;
  }
  
  if (summary.unprotectedRoutes > 0) {
    report += `### High Priority\n`;
    report += `1. **Review unprotected routes** - ${summary.unprotectedRoutes} routes without auth middleware\n`;
    report += `   - Verify these routes should be public\n`;
    report += `   - Add appropriate auth middleware if sensitive data is exposed\n\n`;
  }
  
  report += `### Best Practices\n`;
  report += `1. **Use enterprise-role-middleware.ts** for all new routes\n`;
  report += `2. **Prefer role-based auth** over permission-based when possible\n`;
  report += `3. **Document public routes** in PUBLIC_ROUTES array\n`;
  report += `4. **Add JSDoc comments** to exported route handlers\n`;
  report += `5. **Test auth middleware** in route integration tests\n\n`;
  
  report += `---\n\n`;
  
  // Appendix: Role Levels
  report += `## Appendix: Role Levels Reference\n\n`;
  report += `| Level | Role | Description |\n`;
  report += `|-------|------|-------------|\n`;
  report += `| 10 | Viewer | Read-only access |\n`;
  report += `| 20 | Member | Standard member access |\n`;
  report += `| 30 | Steward | Shop steward/representative |\n`;
  report += `| 40 | Officer | Union officer |\n`;
  report += `| 50 | Admin | Organization administrator |\n`;
  report += `| 60 | Super Admin | Elevated admin access |\n`;
  report += `| 70 | System Admin | System-level access |\n\n`;
  
  return report;
}

/**
 * Get role level name
 */
function getRoleLevelName(level: number): string {
  const levels: { [key: number]: string } = {
    10: 'Viewer',
    20: 'Member',
    30: 'Steward',
    40: 'Officer',
    50: 'Admin',
    60: 'Super Admin',
    70: 'System Admin',
  };
  return levels[level] || 'Unknown';
}

/**
 * Main audit function
 */
async function auditRoutes() {
  console.log('🔍 Starting route authorization audit...\n');
  
  const apiDir = join(__dirname, '../app/api');
  const routeFiles = scanDirectory(apiDir, __dirname);
  
  console.log(`📂 Found ${routeFiles.length} route files\n`);
  
  const summary: AuditSummary = {
    totalRoutes: 0,
    protectedRoutes: 0,
    unprotectedRoutes: 0,
    criticalIssues: 0,
    warningIssues: 0,
    routes: [],
  };
  
  for (const file of routeFiles) {
    const analysis = analyzeRouteFile(file, __dirname);
    
    // Only count routes that actually export HTTP methods
    if (analysis.methods.length > 0) {
      summary.totalRoutes++;
      summary.routes.push(analysis);
      
      if (analysis.isProtected) {
        summary.protectedRoutes++;
      } else {
        const isPublic = PUBLIC_ROUTES.some(route => 
          analysis.relativePath.includes(route.replace('/api/', ''))
        );
        if (!isPublic) {
          summary.unprotectedRoutes++;
        }
      }
      
      for (const issue of analysis.issues) {
        if (issue.startsWith('CRITICAL')) {
          summary.criticalIssues++;
        } else if (issue.startsWith('WARNING')) {
          summary.warningIssues++;
        }
      }
    }
  }
  
  // Generate report
  console.log('📊 Generating audit report...\n');
  const markdownReport = generateMarkdownReport(summary);
  
  // Save report
  const reportPath = join(__dirname, '../ROUTE_AUTH_AUDIT_REPORT.md');
  writeFileSync(reportPath, markdownReport, 'utf-8');
  
  console.log(`✅ Audit complete!\n`);
  console.log(`📑 Report saved to: ${reportPath}\n`);
  console.log(`Summary:`);
  console.log(`  Total Routes: ${summary.totalRoutes}`);
  console.log(`  Protected: ${summary.protectedRoutes} (${((summary.protectedRoutes / summary.totalRoutes) * 100).toFixed(1)}%)`);
  console.log(`  Unprotected: ${summary.unprotectedRoutes}`);
  console.log(`  Critical Issues: ${summary.criticalIssues}`);
  console.log(`  Warnings: ${summary.warningIssues}\n`);
  
  // Exit with error code if critical issues found
  if (summary.criticalIssues > 0) {
    console.error('⛔ CRITICAL ISSUES FOUND - Action required!\n');
    process.exit(1);
  }
  
  if (summary.unprotectedRoutes > 0) {
    console.warn('⚠️  Unprotected routes found - Review recommended\n');
  }
}

// Run audit
auditRoutes().catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});
