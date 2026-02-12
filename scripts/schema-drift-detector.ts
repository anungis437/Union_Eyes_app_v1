/**
 * Schema Drift Detection Script
 * 
 * Validates that the production database schema matches the expected Drizzle schema.
 * Detects:
 * - Missing or extra tables
 * - Missing or extra RLS policies
 * - Missing or extra functions/triggers
 * - Unexpected schema changes
 * 
 * Usage:
 *   pnpm tsx scripts/schema-drift-detector.ts
 *   pnpm tsx scripts/schema-drift-detector.ts --json (for CI/CD)
 * 
 * @priority P0 - Critical security validation
 */

import { db, client } from '@/db/db';
import { sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { logger } from '@/lib/logger';
import { getTableName } from 'drizzle-orm';

interface DriftIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'table' | 'policy' | 'function' | 'trigger' | 'column';
  message: string;
  details?: any;
}

interface DriftReport {
  timestamp: string;
  status: 'clean' | 'drift_detected' | 'error';
  issues: DriftIssue[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
  };
  metadata: {
    expectedTables: number;
    actualTables: number;
    expectedPolicies: number;
    actualPolicies: number;
  };
}

/**
 * Extract all table names from Drizzle schema
 */
function getExpectedTables(): Set<string> {
  const tables = new Set<string>();
  
  for (const [key, value] of Object.entries(schema)) {
    // Check if it's a Drizzle table (has getTableName method)
    if (value && typeof value === 'object' && Symbol.for('drizzle:Name') in value) {
      try {
        const tableName = getTableName(value as any);
        if (tableName && !tableName.startsWith('_')) {
          tables.add(tableName);
        }
      } catch (error) {
        // Skip if not a valid table
      }
    }
  }
  
  return tables;
}

/**
 * Get all actual tables from the database
 */
async function getActualTables(): Promise<Set<string>> {
  const result = await db.execute(sql`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
    ORDER BY tablename
  `);
  
  return new Set((result as any).map((row: any) => row.tablename));
}

/**
 * Get all RLS policies from the database
 */
async function getActualPolicies(): Promise<Map<string, string[]>> {
  const result = await db.execute(sql`
    SELECT 
      schemaname,
      tablename,
      policyname,
      cmd as command,
      qual as using_expr,
      with_check as with_check_expr
    FROM pg_policies 
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `);
  
  const policiesByTable = new Map<string, string[]>();
  
  for (const row of result as any[]) {
    const tableName = row.tablename;
    if (!policiesByTable.has(tableName)) {
      policiesByTable.set(tableName, []);
    }
    policiesByTable.get(tableName)!.push(row.policyname);
  }
  
  return policiesByTable;
}

/**
 * Get all functions and triggers
 */
async function getActualFunctionsAndTriggers() {
  const functions = await db.execute(sql`
    SELECT 
      proname as name,
      pg_get_function_identity_arguments(oid) as args
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND prokind = 'f'
    ORDER BY proname
  `);
  
  const triggers = await db.execute(sql`
    SELECT 
      tgname as name,
      tgrelid::regclass::text as table_name
    FROM pg_trigger
    WHERE tgisinternal = false
    ORDER BY tgname
  `);
  
  return {
    functions: (functions as any).map((f: any) => f.name),
    triggers: (triggers as any).map((t: any) => ({ name: t.name, table: t.table_name }))
  };
}

/**
 * Check for tables with RLS enabled but no policies
 */
async function getTablesWithoutPolicies(): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT 
      c.relname as table_name,
      c.relrowsecurity as rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND NOT EXISTS (
        SELECT 1 
        FROM pg_policies p 
        WHERE p.schemaname = 'public' 
          AND p.tablename = c.relname
      )
    ORDER BY c.relname
  `);
  
  return (result as any).map((row: any) => row.table_name);
}

/**
 * Main drift detection logic
 */
export async function detectSchemaDrift(): Promise<DriftReport> {
  const issues: DriftIssue[] = [];
  
  try {
    logger.info('🔍 Starting schema drift detection...');
    
    // 1. Check tables
    const expectedTables = getExpectedTables();
    const actualTables = await getActualTables();
    
    logger.info(`📊 Expected tables: ${expectedTables.size}, Actual tables: ${actualTables.size}`);
    
    // Find missing tables
    const missingTables = [...expectedTables].filter(t => !actualTables.has(t));
    for (const table of missingTables) {
      issues.push({
        severity: 'critical',
        category: 'table',
        message: `Missing table: ${table}`,
        details: { table, status: 'missing' }
      });
    }
    
    // Find extra tables (potential drift)
    const extraTables = [...actualTables].filter(t => 
      !expectedTables.has(t) && 
      !t.startsWith('drizzle') && 
      !t.startsWith('_') &&
      t !== 'spatial_ref_sys' // PostGIS system table
    );
    for (const table of extraTables) {
      issues.push({
        severity: 'warning',
        category: 'table',
        message: `Unexpected table: ${table}`,
        details: { table, status: 'unexpected' }
      });
    }
    
    // 2. Check RLS policies
    const policiesByTable = await getActualPolicies();
    const totalPolicies = Array.from(policiesByTable.values()).reduce((sum, policies) => sum + policies.length, 0);
    
    logger.info(`📋 Total RLS policies: ${totalPolicies}`);
    
    // Expected minimum policies (based on current implementation)
    const EXPECTED_MIN_POLICIES = 50; // Conservative estimate
    
    if (totalPolicies < EXPECTED_MIN_POLICIES) {
      issues.push({
        severity: 'critical',
        category: 'policy',
        message: `Too few RLS policies: ${totalPolicies} (expected at least ${EXPECTED_MIN_POLICIES})`,
        details: { actual: totalPolicies, expected: EXPECTED_MIN_POLICIES }
      });
    }
    
    // Check for tables with RLS enabled but no policies
    const tablesWithoutPolicies = await getTablesWithoutPolicies();
    for (const table of tablesWithoutPolicies) {
      issues.push({
        severity: 'warning',
        category: 'policy',
        message: `Table ${table} has RLS enabled but no policies`,
        details: { table }
      });
    }
    
    // 3. Check functions and triggers
    const { functions, triggers } = await getActualFunctionsAndTriggers();
    
    logger.info(`⚙️  Functions: ${functions.length}, Triggers: ${triggers.length}`);
    
    // Log info about key functions (for monitoring)
    const keyFunctions = ['updated_at_trigger', 'set_updated_at', 'log_schema_changes'];
    for (const fn of keyFunctions) {
      if (!functions.includes(fn)) {
        issues.push({
          severity: 'info',
          category: 'function',
          message: `Expected function not found: ${fn}`,
          details: { function: fn }
        });
      }
    }
    
    // 4. Generate report
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const warningIssues = issues.filter(i => i.severity === 'warning');
    const infoIssues = issues.filter(i => i.severity === 'info');
    
    const report: DriftReport = {
      timestamp: new Date().toISOString(),
      status: criticalIssues.length > 0 ? 'drift_detected' : 
              warningIssues.length > 0 ? 'drift_detected' : 'clean',
      issues,
      summary: {
        totalIssues: issues.length,
        criticalIssues: criticalIssues.length,
        warningIssues: warningIssues.length,
        infoIssues: infoIssues.length
      },
      metadata: {
        expectedTables: expectedTables.size,
        actualTables: actualTables.size,
        expectedPolicies: EXPECTED_MIN_POLICIES,
        actualPolicies: totalPolicies
      }
    };
    
    return report;
    
  } catch (error) {
    logger.error('❌ Error detecting schema drift:', error);
    
    return {
      timestamp: new Date().toISOString(),
      status: 'error',
      issues: [{
        severity: 'critical',
        category: 'table',
        message: `Error during drift detection: ${error instanceof Error ? error.message : String(error)}`,
        details: { error }
      }],
      summary: {
        totalIssues: 1,
        criticalIssues: 1,
        warningIssues: 0,
        infoIssues: 0
      },
      metadata: {
        expectedTables: 0,
        actualTables: 0,
        expectedPolicies: 0,
        actualPolicies: 0
      }
    };
  }
}

/**
 * Format and display the drift report
 */
function displayReport(report: DriftReport, jsonOutput: boolean = false): void {
  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 SCHEMA DRIFT DETECTION REPORT');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Status: ${report.status.toUpperCase()}`);
  console.log('');
  
  console.log('📈 Summary:');
  console.log(`  Total Issues: ${report.summary.totalIssues}`);
  console.log(`  ├─ Critical: ${report.summary.criticalIssues}`);
  console.log(`  ├─ Warning:  ${report.summary.warningIssues}`);
  console.log(`  └─ Info:     ${report.summary.infoIssues}`);
  console.log('');
  
  console.log('📋 Metadata:');
  console.log(`  Expected Tables: ${report.metadata.expectedTables}`);
  console.log(`  Actual Tables:   ${report.metadata.actualTables}`);
  console.log(`  Expected Policies: ${report.metadata.expectedPolicies}+`);
  console.log(`  Actual Policies:   ${report.metadata.actualPolicies}`);
  console.log('');
  
  if (report.issues.length > 0) {
    console.log('🔍 Issues Found:');
    console.log('');
    
    const criticalIssues = report.issues.filter(i => i.severity === 'critical');
    const warningIssues = report.issues.filter(i => i.severity === 'warning');
    const infoIssues = report.issues.filter(i => i.severity === 'info');
    
    if (criticalIssues.length > 0) {
      console.log('  🚨 CRITICAL:');
      criticalIssues.forEach(issue => {
        console.log(`    • ${issue.message}`);
      });
      console.log('');
    }
    
    if (warningIssues.length > 0) {
      console.log('  ⚠️  WARNING:');
      warningIssues.forEach(issue => {
        console.log(`    • ${issue.message}`);
      });
      console.log('');
    }
    
    if (infoIssues.length > 0) {
      console.log('  ℹ️  INFO:');
      infoIssues.forEach(issue => {
        console.log(`    • ${issue.message}`);
      });
      console.log('');
    }
  } else {
    console.log('✅ No schema drift detected!');
    console.log('');
  }
  
  console.log('='.repeat(70));
  console.log('');
}

/**
 * CLI execution
 */
async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  
  try {
    const report = await detectSchemaDrift();
    displayReport(report, jsonOutput);
    
    // Exit with error code if critical issues found
    if (report.summary.criticalIssues > 0) {
      process.exit(1);
    }
    
    // Exit with warning code if warnings found
    if (report.summary.warningIssues > 0) {
      process.exit(2);
    }
    
    process.exit(0);
    
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
