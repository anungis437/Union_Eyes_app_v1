/**
 * Migration Integrity Validator
 * 
 * Validates that all migration files have been properly applied to the database
 * and that the database is in the expected state.
 * 
 * Checks:
 * - All migration files exist in the database
 * - No missing migrations
 * - No out-of-order migrations
 * - Migration checksums match (if available)
 * - No orphaned migrations in database
 * 
 * Usage:
 *   pnpm tsx scripts/validate-migrations.ts
 *   pnpm tsx scripts/validate-migrations.ts --json (for CI/CD)
 * 
 * @priority P1 - Critical for migration integrity
 */

import { db, client } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface MigrationFile {
  filename: string;
  fullPath: string;
  number: number | null;
  content: string;
  checksum: string;
}

interface AppliedMigration {
  id: string;
  checksum: string | null;
  executed_at: Date;
  execution_time: number | null;
  success: boolean;
}

interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info';
  type: 'missing_migration' | 'orphaned_migration' | 'checksum_mismatch' | 'order_issue' | 'incomplete_migration';
  message: string;
  details?: any;
}

interface ValidationReport {
  timestamp: string;
  status: 'valid' | 'invalid' | 'error';
  issues: ValidationIssue[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
  };
  metadata: {
    totalMigrationFiles: number;
    appliedMigrations: number;
    missingMigrations: number;
    orphanedMigrations: number;
  };
}

/**
 * Get all migration files from the db/migrations directory
 */
function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
  const files: MigrationFile[] = [];
  
  if (!fs.existsSync(migrationsDir)) {
    logger.error(`Migrations directory not found: ${migrationsDir}`);
    return files;
  }
  
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  
  for (const entry of entries) {
    // Only process .sql files
    if (!entry.isFile() || !entry.name.endsWith('.sql')) {
      continue;
    }
    
    // Skip certain files
    if (entry.name.startsWith('.') || 
        entry.name.includes('rollback') || 
        entry.name === 'README.md') {
      continue;
    }
    
    const fullPath = path.join(migrationsDir, entry.name);
    const content = fs.readFileSync(fullPath, 'utf8');
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    
    // Extract migration number if present
    const numberMatch = entry.name.match(/^(\d+)/);
    const number = numberMatch ? parseInt(numberMatch[1], 10) : null;
    
    files.push({
      filename: entry.name,
      fullPath,
      number,
      content,
      checksum
    });
  }
  
  // Sort by migration number (nulls last)
  files.sort((a, b) => {
    if (a.number === null && b.number === null) return a.filename.localeCompare(b.filename);
    if (a.number === null) return 1;
    if (b.number === null) return -1;
    return a.number - b.number;
  });
  
  return files;
}

/**
 * Get applied migrations from the database
 * Supports both Drizzle's __drizzle_migrations and custom tracking
 */
async function getAppliedMigrations(): Promise<AppliedMigration[]> {
  try {
    // First, try Drizzle's migration table
    const drizzleResult = await db.execute(sql`
      SELECT 
        id,
        hash as checksum,
        created_at as executed_at,
        0 as execution_time,
        TRUE as success
      FROM __drizzle_migrations
      ORDER BY created_at
    `).catch(() => null);
    
    if (drizzleResult && drizzleResult.length > 0) {
      logger.info('Using Drizzle migration tracking table');
      return drizzleResult as any[];
    }
    
    // Fallback: Check for schema_migrations table (common pattern)
    const genericResult = await db.execute(sql`
      SELECT 
        version as id,
        checksum,
        applied_at as executed_at,
        execution_time,
        success
      FROM schema_migrations
      ORDER BY applied_at
    `).catch(() => null);
    
    if (genericResult && genericResult.length > 0) {
      logger.info('Using schema_migrations tracking table');
      return genericResult as any[];
    }
    
    // If no migration table exists, we can't validate
    logger.warn('No migration tracking table found');
    return [];
    
  } catch (error) {
    logger.error('Error fetching applied migrations:', error);
    return [];
  }
}

/**
 * Check if migration tracking table exists
 */
async function hasMigrationTracking(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('__drizzle_migrations', 'schema_migrations')
      ) as exists
    `);
    
    return (result[0] as any)?.exists || false;
  } catch (error) {
    return false;
  }
}

/**
 * Validate migration integrity
 */
export async function validateMigrations(): Promise<ValidationReport> {
  const issues: ValidationIssue[] = [];
  
  try {
    logger.info('🔍 Starting migration validation...');
    
    // Check if migration tracking exists
    const hasTracking = await hasMigrationTracking();
    
    if (!hasTracking) {
      return {
        timestamp: new Date().toISOString(),
        status: 'error',
        issues: [{
          severity: 'critical',
          type: 'missing_migration',
          message: 'No migration tracking table found. Run migrations to initialize.',
          details: { 
            expected_tables: ['__drizzle_migrations', 'schema_migrations']
          }
        }],
        summary: {
          totalIssues: 1,
          criticalIssues: 1,
          warningIssues: 0,
          infoIssues: 0
        },
        metadata: {
          totalMigrationFiles: 0,
          appliedMigrations: 0,
          missingMigrations: 0,
          orphanedMigrations: 0
        }
      };
    }
    
    // Get migration files and applied migrations
    const migrationFiles = getMigrationFiles();
    const appliedMigrations = await getAppliedMigrations();
    
    logger.info(`📁 Migration files found: ${migrationFiles.length}`);
    logger.info(`✅ Applied migrations: ${appliedMigrations.length}`);
    
    // Create lookup maps
    const filesByName = new Map(migrationFiles.map(f => [f.filename, f]));
    const appliedByName = new Map(appliedMigrations.map(m => [m.id, m]));
    
    // Check for missing migrations (files not applied)
    const missingMigrations: string[] = [];
    for (const file of migrationFiles) {
      // Check both with and without .sql extension
      const baseName = file.filename.replace(/\.sql$/, '');
      
      if (!appliedByName.has(file.filename) && !appliedByName.has(baseName)) {
        missingMigrations.push(file.filename);
        issues.push({
          severity: 'warning',
          type: 'missing_migration',
          message: `Migration file not applied: ${file.filename}`,
          details: { file: file.filename }
        });
      }
    }
    
    // Check for orphaned migrations (applied but file missing)
    const orphanedMigrations: string[] = [];
    for (const applied of appliedMigrations) {
      const withSql = applied.id.endsWith('.sql') ? applied.id : `${applied.id}.sql`;
      const withoutSql = applied.id.replace(/\.sql$/, '');
      
      if (!filesByName.has(applied.id) && !filesByName.has(withSql)) {
        orphanedMigrations.push(applied.id);
        issues.push({
          severity: 'warning',
          type: 'orphaned_migration',
          message: `Applied migration has no file: ${applied.id}`,
          details: { 
            migration: applied.id,
            executed_at: applied.executed_at
          }
        });
      }
    }
    
    // Check for checksum mismatches (if checksums are stored)
    for (const file of migrationFiles) {
      const baseName = file.filename.replace(/\.sql$/, '');
      const applied = appliedByName.get(file.filename) || appliedByName.get(baseName);
      
      if (applied && applied.checksum && applied.checksum !== file.checksum) {
        issues.push({
          severity: 'critical',
          type: 'checksum_mismatch',
          message: `Migration checksum mismatch: ${file.filename}`,
          details: {
            file: file.filename,
            expected: applied.checksum,
            actual: file.checksum
          }
        });
      }
    }
    
    // Check for migration order issues (numbered migrations only)
    const numberedFiles = migrationFiles.filter(f => f.number !== null);
    for (let i = 1; i < numberedFiles.length; i++) {
      const prev = numberedFiles[i - 1];
      const curr = numberedFiles[i];
      
      if (prev.number! >= curr.number!) {
        issues.push({
          severity: 'warning',
          type: 'order_issue',
          message: `Migration numbering issue: ${prev.filename} (${prev.number}) >= ${curr.filename} (${curr.number})`,
          details: {
            previous: { file: prev.filename, number: prev.number },
            current: { file: curr.filename, number: curr.number }
          }
        });
      }
    }
    
    // Check for failed migrations
    const failedMigrations = appliedMigrations.filter(m => m.success === false);
    for (const failed of failedMigrations) {
      issues.push({
        severity: 'critical',
        type: 'incomplete_migration',
        message: `Migration failed: ${failed.id}`,
        details: {
          migration: failed.id,
          executed_at: failed.executed_at
        }
      });
    }
    
    // Generate summary
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const warningIssues = issues.filter(i => i.severity === 'warning');
    const infoIssues = issues.filter(i => i.severity === 'info');
    
    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      status: criticalIssues.length > 0 ? 'invalid' : 
              warningIssues.length > 0 ? 'invalid' : 'valid',
      issues,
      summary: {
        totalIssues: issues.length,
        criticalIssues: criticalIssues.length,
        warningIssues: warningIssues.length,
        infoIssues: infoIssues.length
      },
      metadata: {
        totalMigrationFiles: migrationFiles.length,
        appliedMigrations: appliedMigrations.length,
        missingMigrations: missingMigrations.length,
        orphanedMigrations: orphanedMigrations.length
      }
    };
    
    return report;
    
  } catch (error) {
    logger.error('❌ Error validating migrations:', error);
    
    return {
      timestamp: new Date().toISOString(),
      status: 'error',
      issues: [{
        severity: 'critical',
        type: 'missing_migration',
        message: `Error during validation: ${error instanceof Error ? error.message : String(error)}`,
        details: { error }
      }],
      summary: {
        totalIssues: 1,
        criticalIssues: 1,
        warningIssues: 0,
        infoIssues: 0
      },
      metadata: {
        totalMigrationFiles: 0,
        appliedMigrations: 0,
        missingMigrations: 0,
        orphanedMigrations: 0
      }
    };
  }
}

/**
 * Format and display the validation report
 */
function displayReport(report: ValidationReport, jsonOutput: boolean = false): void {
  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🔧 MIGRATION INTEGRITY VALIDATION');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Status: ${report.status.toUpperCase()}`);
  console.log('');
  
  console.log('📊 Summary:');
  console.log(`  Total Issues: ${report.summary.totalIssues}`);
  console.log(`  ├─ Critical: ${report.summary.criticalIssues}`);
  console.log(`  ├─ Warning:  ${report.summary.warningIssues}`);
  console.log(`  └─ Info:     ${report.summary.infoIssues}`);
  console.log('');
  
  console.log('📋 Metadata:');
  console.log(`  Migration Files: ${report.metadata.totalMigrationFiles}`);
  console.log(`  Applied Migrations: ${report.metadata.appliedMigrations}`);
  console.log(`  Missing Migrations: ${report.metadata.missingMigrations}`);
  console.log(`  Orphaned Migrations: ${report.metadata.orphanedMigrations}`);
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
    console.log('✅ All migrations are valid and properly applied!');
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
    const report = await validateMigrations();
    displayReport(report, jsonOutput);
    
    // Exit with error code if critical issues or warnings found
    if (report.summary.criticalIssues > 0) {
      process.exit(1);
    }
    
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
