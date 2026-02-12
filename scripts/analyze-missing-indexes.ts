/**
 * Database Index Analyzer
 * 
 * Scans the database for missing indexes on:
 * - Foreign key columns
 * - organization_id columns (multi-tenant isolation)
 * - Status/enum columns
 * - Timestamp columns used for sorting
 * 
 * Usage:
 *   pnpm tsx scripts/analyze-missing-indexes.ts
 *   pnpm tsx scripts/analyze-missing-indexes.ts --json
 * 
 * @priority Maintenance tool for index auditing
 */

import { db, client } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

interface MissingIndex {
  table: string;
  column: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

interface IndexReport {
  timestamp: string;
  missingIndexes: MissingIndex[];
  existingIndexes: number;
  recommendations: string[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Get all foreign key columns without indexes
 */
async function getForeignKeysWithoutIndexes(): Promise<MissingIndex[]> {
  const result = await db.execute(sql`
    SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = tc.table_name
          AND indexdef LIKE '%' || kcu.column_name || '%'
      )
    ORDER BY tc.table_name, kcu.column_name
  `);
  
  return (result as any[]).map(row => ({
    table: row.table_name,
    column: row.column_name,
    reason: `Foreign key to ${row.foreign_table_name} without index`,
    priority: 'critical' as const,
    estimatedImpact: 'Cascade operations and joins will be slow'
  }));
}

/**
 * Get organization_id columns without indexes
 */
async function getOrgIdColumnsWithoutIndexes(): Promise<MissingIndex[]> {
  const result = await db.execute(sql`
    SELECT
        c.table_name,
        c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organization_id'
      AND NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = c.table_name
          AND indexdef LIKE '%organization_id%'
      )
    ORDER BY c.table_name
  `);
  
  return (result as any[]).map(row => ({
    table: row.table_name,
    column: row.column_name,
    reason: 'Multi-tenant isolation column without index',
    priority: 'critical' as const,
    estimatedImpact: 'Every query will perform full table scan'
  }));
}

/**
 * Get status/enum columns without indexes
 */
async function getStatusColumnsWithoutIndexes(): Promise<MissingIndex[]> {
  const result = await db.execute(sql`
    SELECT
        c.table_name,
        c.column_name,
        c.udt_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND (c.column_name LIKE '%status%' 
        OR c.column_name LIKE '%type%'
        OR c.udt_name LIKE '%_enum')
      AND NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = c.table_name
          AND indexdef LIKE '%' || c.column_name || '%'
      )
    ORDER BY c.table_name, c.column_name
    LIMIT 50
  `);
  
  return (result as any[]).map(row => ({
    table: row.table_name,
    column: row.column_name,
    reason: 'Frequently filtered column without index',
    priority: 'high' as const,
    estimatedImpact: 'Status filtering queries will be slow'
  }));
}

/**
 * Get created_at/updated_at columns without indexes
 */
async function getTimestampColumnsWithoutIndexes(): Promise<MissingIndex[]> {
  const result = await db.execute(sql`
    SELECT
        c.table_name,
        c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name IN ('created_at', 'updated_at')
      AND c.data_type = 'timestamp with time zone'
      AND NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = c.table_name
          AND indexdef LIKE '%' || c.column_name || '%'
      )
    ORDER BY c.table_name, c.column_name
  `);
  
  return (result as any[]).map(row => ({
    table: row.table_name,
    column: row.column_name,
    reason: 'Timestamp column used for sorting without index',
    priority: 'medium' as const,
    estimatedImpact: 'Time-based queries and sorting will be slow'
  }));
}

/**
 * Count existing indexes
 */
async function countExistingIndexes(): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname NOT LIKE 'pg_%'
  `);
  
  return (result[0] as any).count;
}

/**
 * Main analysis function
 */
export async function analyzeIndexes(): Promise<IndexReport> {
  try {
    logger.info('🔍 Starting index analysis...');
    
    // Gather all missing indexes
    const fkMissing = await getForeignKeysWithoutIndexes();
    const orgIdMissing = await getOrgIdColumnsWithoutIndexes();
    const statusMissing = await getStatusColumnsWithoutIndexes();
    const timestampMissing = await getTimestampColumnsWithoutIndexes();
    
    const allMissing = [
      ...fkMissing,
      ...orgIdMissing,
      ...statusMissing,
      ...timestampMissing
    ];
    
    // Count existing indexes
    const existingCount = await countExistingIndexes();
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (fkMissing.length > 0) {
      recommendations.push(
        `Add indexes to ${fkMissing.length} foreign key column(s) to improve join performance`
      );
    }
    
    if (orgIdMissing.length > 0) {
      recommendations.push(
        `CRITICAL: Add indexes to ${orgIdMissing.length} organization_id column(s) for multi-tenant isolation`
      );
    }
    
    if (statusMissing.length > 5) {
      recommendations.push(
        `Add indexes to status/type columns for faster filtering (${statusMissing.length} found)`
      );
    }
    
    if (allMissing.length === 0) {
      recommendations.push('✅ All critical indexes appear to be in place');
    }
    
    // Generate summary
    const summary = {
      critical: allMissing.filter(m => m.priority === 'critical').length,
      high: allMissing.filter(m => m.priority === 'high').length,
      medium: allMissing.filter(m => m.priority === 'medium').length,
      low: allMissing.filter(m => m.priority === 'low').length
    };
    
    const report: IndexReport = {
      timestamp: new Date().toISOString(),
      missingIndexes: allMissing,
      existingIndexes: existingCount,
      recommendations,
      summary
    };
    
    return report;
    
  } catch (error) {
    logger.error('❌ Error analyzing indexes:', error);
    throw error;
  }
}

/**
 * Display report
 */
function displayReport(report: IndexReport, jsonOutput: boolean = false): void {
  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 DATABASE INDEX ANALYSIS');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Existing Indexes: ${report.existingIndexes}`);
  console.log('');
  
  console.log('📈 Summary:');
  console.log(`  Missing Indexes: ${report.missingIndexes.length}`);
  console.log(`  ├─ Critical: ${report.summary.critical}`);
  console.log(`  ├─ High:     ${report.summary.high}`);
  console.log(`  ├─ Medium:   ${report.summary.medium}`);
  console.log(`  └─ Low:      ${report.summary.low}`);
  console.log('');
  
  if (report.missingIndexes.length > 0) {
    console.log('🔍 Missing Indexes:');
    console.log('');
    
    const critical = report.missingIndexes.filter(m => m.priority === 'critical');
    const high = report.missingIndexes.filter(m => m.priority === 'high');
    const medium = report.missingIndexes.filter(m => m.priority === 'medium');
    
    if (critical.length > 0) {
      console.log('  🚨 CRITICAL:');
      critical.forEach(idx => {
        console.log(`    • ${idx.table}.${idx.column}`);
        console.log(`      ${idx.reason}`);
      });
      console.log('');
    }
    
    if (high.length > 0) {
      console.log('  ⚠️  HIGH:');
      high.slice(0, 10).forEach(idx => {
        console.log(`    • ${idx.table}.${idx.column} - ${idx.reason}`);
      });
      if (high.length > 10) {
        console.log(`    ... and ${high.length - 10} more`);
      }
      console.log('');
    }
    
    if (medium.length > 0) {
      console.log(`  ℹ️  MEDIUM: ${medium.length} indexes (run with --json for full list)`);
      console.log('');
    }
  }
  
  if (report.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    report.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
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
    const report = await analyzeIndexes();
    displayReport(report, jsonOutput);
    
    // Exit with error code if critical issues found
    if (report.summary.critical > 0) {
      logger.warn(`Found ${report.summary.critical} critical missing indexes`);
      process.exit(1);
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
