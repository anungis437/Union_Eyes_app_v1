#!/usr/bin/env node

/**
 * Comprehensive Route Security Audit
 * 
 * Scans all API routes for security compliance:
 * - Authentication guards
 * - Authorization checks  
 * - RLS context usage
 * - CORS configuration
 * - Rate limiting
 * - Input validation
 * - Error handling
 * 
 * Part of A+ Roadmap - Security Hardening Phase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
}

interface RouteAnalysis {
  path: string;
  file: string;
  methods: string[];
  hasAuthGuard: boolean;
  hasRLSContext: boolean;
  hasInputValidation: boolean;
  hasStandardizedErrors: boolean;
  hasRateLimiting: boolean;
  isPublicRoute: boolean;
  issues: SecurityIssue[];
  score: number; // 0-100
}

interface AuditReport {
  totalRoutes: number;
  scannedFiles: number;
  securityScore: number; // 0-100
  categoryCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  routeAnalyses: RouteAnalysis[];
  summary: {
    withAuth: number;
    withRLS: number;
    withValidation: number;
    withStandardizedErrors: number;
    publicRoutes: number;
    needsReview: number;
  };
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = new Set([
  '/api/health',
  '/api/status',
  '/api/metrics',
  '/api/webhooks/clerk',
  '/api/webhooks/stripe',
  '/api/auth/callback',
  '/api/cron',
  '/api/rewards/cron',
  '/api/sentry-example-api',
  '/api/communications/track/open',
  '/api/communications/track/click',
  '/api/communications/unsubscribe',
  '/api/docs/openapi.json',
  '/api/whop/webhooks',
  '/api/whop/unauthenticated-checkout',
  '/api/integrations/shopify/webhooks',
]);

// Patterns to detect security measures
const PATTERNS = {
  authGuard: /requireAuth|withAuth|withApiAuth|withAdminAuth|withRoleAuth|withEnhancedRoleAuth|withOrganizationAuth|withSecureAPI|requireSystemAdmin|auth\(|clerkMiddleware|protect\(|getCurrentUser\(|requireApiAuth\(|requireUser\(|authenticateRequest\(|CRON_SECRET|METRICS_AUTH_TOKEN/,
  rlsContext: /withRLSContext|withRLS|setRLSContext/,
  inputValidation: /z\.object|validate|schema\.parse|validateRequired|safeParse/,
  standardizedErrors: /standardErrorResponse|fromError|withStandardizedErrors/,
  rateLimiting: /rateLimit|rateLimiter|Ratelimit|checkRateLimit/,
  clerkAuth: /import.*from ['"]@clerk\/nextjs|@clerk\/backend/,
  dbQuery: /db\.(select|insert|update|delete)/,
  sqlInjection: /\$\{[^}]*\}.*\.(select|insert|update|delete)|`\s*(SELECT|INSERT|UPDATE|DELETE)/i,
  drizzleORM: /from\(|inArray\(|eq\(|and\(|or\(/,
  webhookValidation: /stripe\.webhooks\.constructEvent|verifyWebhookSignature|validateWebhook|makeWebhookHandler/,
  unsafeEval: /eval\(|Function\(|new Function/,
  hardcodedSecrets: /(password|secret|api[_-]?key|token)\s*=\s*['"]/i,
};

/**
 * Recursively find all route files
 */
function findRouteFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        findRouteFiles(fullPath, files);
      }
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Analyze a single route file
 */
function analyzeRoute(filePath: string): RouteAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Derive API route path from file path
  const routePath = '/api/' + relativePath
    .replace(/\\/g, '/')
    .split('/api/')[1]
    ?.replace('/route.ts', '')
    ?.replace('/route.js', '') || '';

  const issues: SecurityIssue[] = [];
  
  // Detect HTTP methods
  const methods: string[] = [];
  if (/export\s+(async\s+)?function\s+GET/m.test(content)) methods.push('GET');
  if (/export\s+(async\s+)?function\s+POST/m.test(content)) methods.push('POST');
  if (/export\s+(async\s+)?function\s+PUT/m.test(content)) methods.push('PUT');
  if (/export\s+(async\s+)?function\s+DELETE/m.test(content)) methods.push('DELETE');
  if (/export\s+(async\s+)?function\s+PATCH/m.test(content)) methods.push('PATCH');
  if (/export\s+const\s+(GET|POST|PUT|DELETE|PATCH)/m.test(content)) {
    const matches = content.match(/export\s+const\s+(GET|POST|PUT|DELETE|PATCH)/gm);
    if (matches) {
      matches.forEach(m => {
        const method = m.match(/(GET|POST|PUT|DELETE|PATCH)/)?.[1];
        if (method && !methods.includes(method)) methods.push(method);
      });
    }
  }

  // Check if it's a public route
  const isPublicRoute = PUBLIC_ROUTES.has(routePath) || 
    Array.from(PUBLIC_ROUTES).some(pr => routePath.startsWith(pr)) ||
    routePath.includes('/webhooks/') ||
    routePath.includes('/cron/');

  // Security checks
  const hasAuthGuard = PATTERNS.authGuard.test(content);
  const hasRLSContext = PATTERNS.rlsContext.test(content);
  const hasInputValidation = PATTERNS.inputValidation.test(content);
  const hasStandardizedErrors = PATTERNS.standardizedErrors.test(content);
  const hasRateLimiting = PATTERNS.rateLimiting.test(content);
  const hasDbQuery = PATTERNS.dbQuery.test(content);
  const hasClerkImport = PATTERNS.clerkAuth.test(content);

  // CRITICAL: Routes without auth (unless public or webhook with validation)
  const hasWebhookValidation = PATTERNS.webhookValidation.test(content);
  if (!isPublicRoute && !hasAuthGuard && !hasClerkImport && !hasWebhookValidation) {
    issues.push({
      severity: 'critical',
      category: 'Authentication',
      message: 'No authentication guard detected',
      file: relativePath,
      suggestion: 'Wrap handler with requireAuth() or add Clerk middleware',
    });
  }

  // HIGH: Database queries without RLS context
  if (hasDbQuery && !hasRLSContext && !isPublicRoute) {
    issues.push({
      severity: 'high',
      category: 'Authorization',
      message: 'Database query without RLS context',
      file: relativePath,
      suggestion: 'Wrap database operations with withRLSContext()',
    });
  }

  // MEDIUM: Missing input validation
  if ((methods.includes('POST') || methods.includes('PUT') || methods.includes('PATCH')) && !hasInputValidation) {
    issues.push({
      severity: 'medium',
      category: 'Input Validation',
      message: 'No input validation detected for mutation endpoint',
      file: relativePath,
      suggestion: 'Use Zod schema or validateRequired() for input validation',
    });
  }

  // MEDIUM: Not using standardized error responses
  if (!hasStandardizedErrors) {
    issues.push({
      severity: 'medium',
      category: 'Error Handling',
      message: 'Not using standardized error responses',
      file: relativePath,
      suggestion: 'Use standardErrorResponse() or withStandardizedErrors()',
    });
  }

  // LOW: Missing rate limiting for sensitive endpoints
  if (!hasRateLimiting && (routePath.includes('/auth') || routePath.includes('/login') || routePath.includes('/signup'))) {
    issues.push({
      severity: 'low',
      category: 'Rate Limiting',
      message: 'Sensitive endpoint without rate limiting',
      file: relativePath,
      suggestion: 'Add rate limiting with @upstash/ratelimit',
    });
  }

  // CRITICAL: SQL Injection risk (but check for Drizzle ORM usage and sql tagged templates)
  if (PATTERNS.sqlInjection.test(content)) {
    // Check if it's using safe tagged template literals: sql`...` or client`...`
    // Both Drizzle's sql and @vercel/postgres client use parameterized queries
    // This is safe with or without variables: sql`SELECT 1` and sql`SELECT * WHERE id = ${id}`
    const safeSqlPattern = /(sql|client)`/;
    const isSafeDrizzleSql = safeSqlPattern.test(content) || PATTERNS.drizzleORM.test(content);
    
    if (!isSafeDrizzleSql) {
      issues.push({
        severity: 'critical',
        category: 'SQL Injection',
        message: 'Potential SQL injection vulnerability detected',
        file: relativePath,
        suggestion: 'Use parameterized queries with Drizzle ORM',
      });
    }
  }

  // CRITICAL: Unsafe eval usage
  if (PATTERNS.unsafeEval.test(content)) {
    issues.push({
      severity: 'critical',
      category: 'Code Injection',
      message: 'Unsafe eval() or Function() usage detected',
      file: relativePath,
      suggestion: 'Remove eval() and use safe alternatives',
    });
  }

  // HIGH: Hardcoded secrets
  if (PATTERNS.hardcodedSecrets.test(content)) {
    issues.push({
      severity: 'high',
      category: 'Secrets Management',
      message: 'Potential hardcoded secret detected',
      file: relativePath,
      suggestion: 'Use environment variables for secrets',
    });
  }

  // Calculate security score (0-100)
  let score = 100;
  if (!isPublicRoute) {
    if (!hasAuthGuard) score -= 30;
    if (hasDbQuery && !hasRLSContext) score -= 20;
    if (!hasInputValidation && methods.some(m => ['POST', 'PUT', 'PATCH'].includes(m))) score -= 15;
    if (!hasStandardizedErrors) score -= 10;
    if (!hasRateLimiting && routePath.includes('/auth')) score -= 10;
  }
  
  // Critical issues drop score significantly
  issues.forEach(issue => {
    if (issue.severity === 'critical') score -= 25;
  });
  
  score = Math.max(0, score);

  return {
    path: routePath,
    file: relativePath,
    methods,
    hasAuthGuard,
    hasRLSContext,
    hasInputValidation,
    hasStandardizedErrors,
    hasRateLimiting,
    isPublicRoute,
    issues,
    score,
  };
}

/**
 * Generate comprehensive audit report
 */
function generateReport(analyses: RouteAnalysis[]): AuditReport {
  const categoryCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  analyses.forEach(analysis => {
    analysis.issues.forEach(issue => {
      categoryCounts[issue.severity]++;
    });
  });

  const summary = {
    withAuth: analyses.filter(a => a.hasAuthGuard || a.isPublicRoute).length,
    withRLS: analyses.filter(a => a.hasRLSContext).length,
    withValidation: analyses.filter(a => a.hasInputValidation).length,
    withStandardizedErrors: analyses.filter(a => a.hasStandardizedErrors).length,
    publicRoutes: analyses.filter(a => a.isPublicRoute).length,
    needsReview: analyses.filter(a => a.issues.length > 0).length,
  };

  // Calculate overall security score (weighted average)
  const totalScore = analyses.reduce((sum, a) => sum + a.score, 0);
  const securityScore = analyses.length > 0 ? Math.round(totalScore / analyses.length) : 0;

  return {
    totalRoutes: analyses.length,
    scannedFiles: analyses.length,
    securityScore,
    categoryCounts,
    routeAnalyses: analyses,
    summary,
  };
}

/**
 * Print report to console
 */
function printReport(report: AuditReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('🔒 API ROUTE SECURITY AUDIT REPORT');
  console.log('='.repeat(80) + '\n');

  // Overall metrics
  console.log('📊 OVERVIEW');
  console.log('-'.repeat(80));
  console.log(`Total Routes Scanned: ${report.totalRoutes}`);
  console.log(`Overall Security Score: ${report.securityScore}/100 ${getScoreEmoji(report.securityScore)}`);
  console.log(`Routes Needing Review: ${report.summary.needsReview}`);
  console.log('');

  // Security coverage
  console.log('🛡️  SECURITY COVERAGE');
  console.log('-'.repeat(80));
  console.log(`Authentication Guards: ${report.summary.withAuth}/${report.totalRoutes} (${Math.round(report.summary.withAuth / report.totalRoutes * 100)}%)`);
  console.log(`RLS Context Usage: ${report.summary.withRLS}/${report.totalRoutes} (${Math.round(report.summary.withRLS / report.totalRoutes * 100)}%)`);
  console.log(`Input Validation: ${report.summary.withValidation}/${report.totalRoutes} (${Math.round(report.summary.withValidation / report.totalRoutes * 100)}%)`);
  console.log(`Standardized Errors: ${report.summary.withStandardizedErrors}/${report.totalRoutes} (${Math.round(report.summary.withStandardizedErrors / report.totalRoutes * 100)}%)`);
  console.log(`Public Routes: ${report.summary.publicRoutes}`);
  console.log('');

  // Issue breakdown
  console.log('⚠️  ISSUES BY SEVERITY');
  console.log('-'.repeat(80));
  console.log(`🔴 Critical: ${report.categoryCounts.critical}`);
  console.log(`🟠 High: ${report.categoryCounts.high}`);
  console.log(`🟡 Medium: ${report.categoryCounts.medium}`);
  console.log(`🟢 Low: ${report.categoryCounts.low}`);
  console.log(`ℹ️  Info: ${report.categoryCounts.info}`);
  console.log('');

  // Critical issues first
  const criticalRoutes = report.routeAnalyses
    .filter(a => a.issues.some(i => i.severity === 'critical'))
    .sort((a, b) => a.score - b.score);

  if (criticalRoutes.length > 0) {
    console.log('🚨 CRITICAL ISSUES (Immediate Action Required)');
    console.log('-'.repeat(80));
    
    criticalRoutes.forEach(route => {
      const criticalIssues = route.issues.filter(i => i.severity === 'critical');
      console.log(`\n${route.path} [Score: ${route.score}/100]`);
      console.log(`  File: ${route.file}`);
      
      criticalIssues.forEach(issue => {
        console.log(`  🔴 ${issue.category}: ${issue.message}`);
        if (issue.suggestion) {
          console.log(`     💡 ${issue.suggestion}`);
        }
      });
    });
    console.log('');
  }

  // Top issues by category
  console.log('📋 TOP ISSUES BY CATEGORY');
  console.log('-'.repeat(80));
  
  const issuesByCategory = new Map<string, number>();
  report.routeAnalyses.forEach(route => {
    route.issues.forEach(issue => {
      issuesByCategory.set(
        issue.category,
        (issuesByCategory.get(issue.category) || 0) + 1
      );
    });
  });

  Array.from(issuesByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count} occurrences`);
    });

  console.log('');

  // Recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('-'.repeat(80));
  
  if (report.categoryCounts.critical > 0) {
    console.log('1. 🚨 Address all CRITICAL issues immediately');
  }
  
  if (report.summary.withAuth < report.totalRoutes - report.summary.publicRoutes) {
    console.log('2. Add authentication guards to all non-public routes');
  }
  
  if (report.summary.withRLS < report.summary.withAuth) {
    console.log('3. Wrap database operations with withRLSContext()');
  }
  
  if (report.summary.withStandardizedErrors < report.totalRoutes * 0.8) {
    console.log('4. Migrate to standardized error responses');
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Save detailed report
  const reportPath = path.join(process.cwd(), 'route-security-audit.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

function getScoreEmoji(score: number): string {
  if (score >= 95) return '🏆';
  if (score >= 90) return '✅';
  if (score >= 80) return '👍';
  if (score >= 70) return '⚠️';
  return '❌';
}

/**
 * Main execution
 */
async function main() {
  const apiDir = path.join(process.cwd(), 'app', 'api');
  
  if (!fs.existsSync(apiDir)) {
    console.error('❌ API directory not found:', apiDir);
    process.exit(1);
  }

  console.log('🔍 Scanning API routes for security issues...\n');
  
  const routeFiles = findRouteFiles(apiDir);
  console.log(`Found ${routeFiles.length} route files\n`);

  const analyses = routeFiles.map(analyzeRoute);
  const report = generateReport(analyses);

  printReport(report);

  // Exit with error code if critical issues found
  if (report.categoryCounts.critical > 0) {
    console.error('❌ Critical security issues found. Please address immediately.\n');
    process.exit(1);
  }

  if (report.securityScore < 80) {
    console.warn('⚠️  Security score below 80. Improvements recommended.\n');
    process.exit(1);
  }

  console.log('✅ Security audit passed!\n');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});
