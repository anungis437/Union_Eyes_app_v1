/**
 * RLS (Row-Level Security) Usage Scanner v2 - Investor-Grade Taxonomy
 * 
 * Classifies database queries by route context and enforces RLS for tenant-isolated operations
 * 
 * Context Classification:
 * - TENANT: User-facing APIs that must enforce tenant isolation (app/api/**, actions/**)
 * - WEBHOOK: Signature-verified external callbacks (app/api/webhooks/**)
 * - ADMIN: Cross-tenant admin operations (app/api/admin/**, app/api/governance/dashboard/**)
 * - SYSTEM: Internal operations (cron/**, jobs/**, scripts/**)
 * 
 * Usage:
 *   pnpm tsx scripts/scan-rls-usage-v2.ts
 *   pnpm tsx scripts/scan-rls-usage-v2.ts --scope=tenant --max-violations=0
 *   pnpm tsx scripts/scan-rls-usage-v2.ts --json > rls-report.json
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// ============================================================================
// TAXONOMY CONFIGURATION
// ============================================================================

enum QueryContext {
  TENANT = 'TENANT',     // Must use RLS
  ADMIN = 'ADMIN',       // Authorized cross-tenant
  SYSTEM = 'SYSTEM',     // Internal operations
  WEBHOOK = 'WEBHOOK',   // Signature-verified
  UNKNOWN = 'UNKNOWN',   // Must be classified
}

// Critical tenant-isolated tables that MUST use RLS in TENANT context
const CRITICAL_TENANT_TABLES = [
  'claims',
  'grievances',
  'members',
  'member_profiles',
  'organization_members',
  'votes',
  'elections',
  'election_votes',
  'election_candidates',
  'messages',
  'notifications',
];

// Path patterns for context classification
const CONTEXT_PATTERNS: Record<QueryContext, RegExp[]> = {
  [QueryContext.TENANT]: [
    /app\/api\/.+/,
    /actions\/.+/,
  ],
  [QueryContext.WEBHOOK]: [
    /app\/api\/webhooks\/.+/,
  ],
  [QueryContext.ADMIN]: [
    /app\/api\/admin\/.+/,
    /app\/api\/governance\/dashboard\/.+/,
  ],
  [QueryContext.SYSTEM]: [
    /scripts\/.+/,
    /cron\/.+/,
    /jobs\/.+/,
    /tools\/.+/,
  ],
  [QueryContext.UNKNOWN]: [],
};

// Allowlist for non-tenant operations with justifications
interface AllowlistEntry {
  file: string;
  context: QueryContext.ADMIN | QueryContext.SYSTEM | QueryContext.WEBHOOK;
  justification: string;
}

const ALLOWLIST: AllowlistEntry[] = [
  {
    file: 'app/api/admin/users/route.ts',
    context: QueryContext.ADMIN,
    justification: 'Admin panel - requires super_admin role check in middleware',
  },
  {
    file: 'app/api/webhooks/stripe/route.ts',
    context: QueryContext.WEBHOOK,
    justification: 'Stripe webhook - signature verified before database access',
  },
  {
    file: 'scripts/seed-database.ts',
    context: QueryContext.SYSTEM,
    justification: 'Database seeding script - internal tooling',
  },
  // Add more allowlisted operations as needed
];

// ============================================================================
// SCANNER CONFIGURATION
// ============================================================================

const FILES_TO_SCAN = [
  'app/api/**/*.ts',
  'app/api/**/*.tsx',
  'lib/**/*.ts',
  'actions/**/*.ts',
  'services/**/*.ts',
  'scripts/**/*.ts',
];

const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/with-rls-context.ts',
  '**/db.ts',
  '**/schema/**',
  '**/migrations/**',
];

// Database operation patterns
const DB_OPERATION_PATTERNS = [
  { pattern: /db\.query\./g, operation: 'query' },
  { pattern: /db\.select\(/g, operation: 'select' },
  { pattern: /db\.insert\(/g, operation: 'insert' },
  { pattern: /db\.update\(/g, operation: 'update' },
  { pattern: /db\.delete\(/g, operation: 'delete' },
];

// Safe RLS patterns
const SAFE_RLS_PATTERNS = [
  /withRLSContext\(/,
  /useRLSContext\(/,
];

// ============================================================================
// TYPES
// ============================================================================

interface ScanResult {
  file: string;
  line: number;
  column: number;
  code: string;
  operation: string;
  context: QueryContext;
  criticalTable: boolean;
  hasRLSWrapper: boolean;
  isAllowlisted: boolean;
  allowlistJustification?: string;
}

interface ScanReport {
  summary: {
    totalFiles: number;
    totalQueries: number;
    tenantViolations: number;
    tenantCriticalTableViolations: number;
    adminQueries: number;
    webhookQueries: number;
    systemQueries: number;
    unknownContextQueries: number;
  };
  violations: ScanResult[];
  allQueries: ScanResult[];
  commit: string;
  timestamp: string;
}

// ============================================================================
// CONTEXT CLASSIFICATION
// ============================================================================

function classifyFileContext(filePath: string): QueryContext {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Webhook takes precedence (subset of app/api/**)
  if (CONTEXT_PATTERNS[QueryContext.WEBHOOK].some(p => p.test(normalizedPath))) {
    return QueryContext.WEBHOOK;
  }
  
  // Admin takes precedence (subset of app/api/**)
  if (CONTEXT_PATTERNS[QueryContext.ADMIN].some(p => p.test(normalizedPath))) {
    return QueryContext.ADMIN;
  }
  
  // System operations
  if (CONTEXT_PATTERNS[QueryContext.SYSTEM].some(p => p.test(normalizedPath))) {
    return QueryContext.SYSTEM;
  }
  
  // Tenant operations (catch-all for app/api/** and actions/**)
  if (CONTEXT_PATTERNS[QueryContext.TENANT].some(p => p.test(normalizedPath))) {
    return QueryContext.TENANT;
  }
  
  return QueryContext.UNKNOWN;
}

function isAllowlisted(filePath: string, context: QueryContext): AllowlistEntry | undefined {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return ALLOWLIST.find(entry => 
    normalizedPath.includes(entry.file) && entry.context === context
  );
}

function detectsCriticalTable(code: string): boolean {
  return CRITICAL_TENANT_TABLES.some(table => 
    new RegExp(`\\b${table}\\b`, 'i').test(code)
  );
}

// ============================================================================
// FILE SCANNING
// ============================================================================

async function scanFile(filePath: string): Promise<ScanResult[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: ScanResult[] = [];
  
  const context = classifyFileContext(filePath);
  const hasRLSImport = SAFE_RLS_PATTERNS.some(pattern => pattern.test(content));
  const allowlistEntry = isAllowlisted(filePath, context);
  
  lines.forEach((line, index) => {
    DB_OPERATION_PATTERNS.forEach(({ pattern, operation }) => {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        const hasRLSWrapper = hasRLSImport && isSafeContext(lines, index);
        const criticalTable = detectsCriticalTable(line);
        
        results.push({
          file: path.relative(process.cwd(), filePath),
          line: index + 1,
          column: match.index || 0,
          code: line.trim(),
          operation,
          context,
          criticalTable,
          hasRLSWrapper,
          isAllowlisted: !!allowlistEntry,
          allowlistJustification: allowlistEntry?.justification,
        });
      }
    });
  });
  
  return results;
}

function isSafeContext(lines: string[], lineIndex: number): boolean {
  const contextWindow = 20;
  const startIndex = Math.max(0, lineIndex - contextWindow);
  
  let braceDepth = 0;
  for (let i = lineIndex; i >= startIndex; i--) {
    const line = lines[i];
    braceDepth += (line.match(/{/g) || []).length;
    braceDepth -= (line.match(/}/g) || []).length;
    
    if (SAFE_RLS_PATTERNS.some(p => p.test(line)) && braceDepth > 0) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// MAIN SCANNER
// ============================================================================

async function scanAllFiles(): Promise<ScanResult[]> {
  const files = await glob(FILES_TO_SCAN, {
    ignore: EXCLUDE_PATTERNS,
    absolute: true,
  });
  
  const allResults: ScanResult[] = [];
  
  for (const file of files) {
    const results = await scanFile(file);
    allResults.push(...results);
  }
  
  return allResults;
}

// ============================================================================
// REPORTING
// ============================================================================

function generateReport(allQueries: ScanResult[]): ScanReport {
  // Compute violations (TENANT context without RLS wrapper and not allowlisted)
  const violations = allQueries.filter(q => 
    q.context === QueryContext.TENANT && 
    !q.hasRLSWrapper && 
    !q.isAllowlisted
  );
  
  const tenantCriticalViolations = violations.filter(v => v.criticalTable);
  
  return {
    summary: {
      totalFiles: new Set(allQueries.map(q => q.file)).size,
      totalQueries: allQueries.length,
      tenantViolations: violations.length,
      tenantCriticalTableViolations: tenantCriticalViolations.length,
      adminQueries: allQueries.filter(q => q.context === QueryContext.ADMIN).length,
      webhookQueries: allQueries.filter(q => q.context === QueryContext.WEBHOOK).length,
      systemQueries: allQueries.filter(q => q.context === QueryContext.SYSTEM).length,
      unknownContextQueries: allQueries.filter(q => q.context === QueryContext.UNKNOWN).length,
    },
    violations,
    allQueries,
    commit: process.env.GITHUB_SHA || 'unknown',
    timestamp: new Date().toISOString(),
  };
}

function printReport(report: ScanReport, options: { json?: boolean; scope?: string }) {
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  
  console.log('🔒 RLS Usage Scanner v2 - Investor-Grade Taxonomy');
  console.log('━'.repeat(80));
  console.log('');
  console.log(`📊 Summary (Commit: ${report.commit})`);
  console.log('─'.repeat(80));
  console.log(`  Total Files:              ${report.summary.totalFiles}`);
  console.log(`  Total Queries:            ${report.summary.totalQueries}`);
  console.log('');
  console.log(`  TENANT Violations:        ${report.summary.tenantViolations} ❌`);
  console.log(`  Critical Table Violations: ${report.summary.tenantCriticalTableViolations} 🚨`);
  console.log(`  ADMIN Queries:            ${report.summary.adminQueries}`);
  console.log(`  WEBHOOK Queries:          ${report.summary.webhookQueries}`);
  console.log(`  SYSTEM Queries:           ${report.summary.systemQueries}`);
  console.log(`  UNKNOWN Context:          ${report.summary.unknownContextQueries}`);
  console.log('');
  
  if (report.violations.length > 0) {
    console.log('🚨 TENANT Context Violations (RLS Required)');
    console.log('─'.repeat(80));
    console.log('');
    
    const byFile = report.violations.reduce((acc, v) => {
      if (!acc[v.file]) acc[v.file] = [];
      acc[v.file].push(v);
      return acc;
    }, {} as Record<string, ScanResult[]>);
    
    Object.entries(byFile).forEach(([file, fileViolations]) => {
      console.log(`📁 ${file} (${fileViolations.length} violations)`);
      fileViolations.forEach(v => {
        const critical = v.criticalTable ? '🚨 CRITICAL TABLE' : '';
        console.log(`  Line ${v.line}: ${v.operation} ${critical}`);
        console.log(`  ${v.code}`);
        console.log('');
      });
    });
  }
  
  if (report.summary.unknownContextQueries > 0) {
    console.log('⚠️  UNKNOWN Context Files (Must Classify)');
    console.log('─'.repeat(80));
    const unknownFiles = [...new Set(
      report.allQueries
        .filter(q => q.context === QueryContext.UNKNOWN)
        .map(q => q.file)
    )];
    unknownFiles.forEach(f => console.log(`  ${f}`));
    console.log('');
  }
  
  if (report.summary.tenantViolations === 0 && report.summary.unknownContextQueries === 0) {
    console.log('✅ SUCCESS: All TENANT queries use RLS context wrapper');
    console.log('🛡️  Tenant isolation verified');
  }
  console.log('');
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const options = {
    json: args.includes('--json'),
    scope: args.find(a => a.startsWith('--scope='))?.split('=')[1],
    maxViolations: parseInt(args.find(a => a.startsWith('--max-violations='))?.split('=')[1] || '999999'),
  };
  
  try {
    const allQueries = await scanAllFiles();
    const report = generateReport(allQueries);
    
    printReport(report, options);
    
    // Exit with error if violations exceed threshold
    const criticalCheck = options.scope === 'tenant' 
      ? report.summary.tenantCriticalTableViolations
      : report.summary.tenantViolations;
    
    if (criticalCheck > options.maxViolations || report.summary.unknownContextQueries > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Scanner error:', error);
    process.exit(1);
  }
}

main();
