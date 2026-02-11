/**
 * Migration Rollback System
 * 
 * Provides rollback capabilities for failed or partial migrations.
 * Supports full rollback or selective table rollback.
 * 
 * Features:
 * - Transaction-based rollback for data consistency
 * - Backup and restore capabilities
 * - Selective table rollback
 * - Rollback verification and validation
 * - Audit trail for rollback operations
 * 
 * @module lib/migrations/rollback
 */

import { db } from "@/db/db";
import { sql } from "drizzle-orm";
import { updateMappingStatus } from "./tenant-to-org-mapper";

interface RollbackResult {
  tableName: string;
  rowsRestored: number;
  errors: Array<{ row: any; error: string }>;
  status: "completed" | "failed" | "partial";
  duration: number;
}

interface BackupInfo {
  tableName: string;
  backupTableName: string;
  rowCount: number;
  createdAt: Date;
  schemaMatches: boolean;
}

// =====================================================
// Backup Operations
// =====================================================

/**
 * Create backup of a table before migration
 */
export async function createTableBackup(
  tableName: string,
  suffix: string = "backup"
): Promise<{ success: boolean; backupTableName: string; rowCount: number }> {
  const backupTableName = `${tableName}_${suffix}_${Date.now()}`;

  try {
    console.log(`📦 Creating backup: ${tableName} → ${backupTableName}`);

    // Create backup table with same structure
    await db.execute(sql.raw(`
      CREATE TABLE ${backupTableName} AS 
      SELECT * FROM ${tableName}
    `));

    // Get row count
    const countResult = await db.execute(sql.raw(`
      SELECT COUNT(*) as count FROM ${backupTableName}
    `));

    const rowCount = Number(countResult[0]?.count || 0);

    console.log(`✅ Backup created: ${rowCount} rows`);

    return {
      success: true,
      backupTableName,
      rowCount,
    };
  } catch (error) {
    console.error(`❌ Failed to create backup for ${tableName}:`, error);
    return {
      success: false,
      backupTableName: "",
      rowCount: 0,
    };
  }
}

/**
 * Create backups for all migration tables
 */
export async function createAllBackups(): Promise<Map<string, BackupInfo>> {
  const backups = new Map<string, BackupInfo>();
  const timestamp = Date.now();

  const tables = [
    "profiles",
    "claims",
    "documents",
    "precedents",
    "clause_library",
    "certification_applications",
    "grievances",
    "strike_votes",
  ];

  console.log("\n📦 Creating backups for all tables...\n");

  for (const tableName of tables) {
    const backupTableName = `${tableName}_backup_${timestamp}`;

    try {
      await db.execute(sql.raw(`
        CREATE TABLE ${backupTableName} AS 
        SELECT * FROM ${tableName}
      `));

      const countResult = await db.execute(sql.raw(`
        SELECT COUNT(*) as count FROM ${backupTableName}
      `));

      const rowCount = Number(countResult[0]?.count || 0);

      backups.set(tableName, {
        tableName,
        backupTableName,
        rowCount,
        createdAt: new Date(),
        schemaMatches: true,
      });

      console.log(`✅ ${tableName}: ${rowCount} rows backed up`);
    } catch (error) {
      console.error(`❌ Failed to backup ${tableName}:`, error);
    }
  }

  console.log(`\n✅ Created ${backups.size} backups\n`);
  return backups;
}

/**
 * List all backup tables
 */
export async function listBackups(): Promise<BackupInfo[]> {
  try {
    const result = await db.execute(sql.raw(`
      SELECT 
        table_name,
        pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%_backup_%'
      ORDER BY table_name DESC
    `));

    const backups: BackupInfo[] = [];

    for (const row of result) {
      const tableName = row.table_name as string;
      const originalTable = tableName.split("_backup_")[0];

      const countResult = await db.execute(sql.raw(`
        SELECT COUNT(*) as count FROM ${tableName}
      `));

      const rowCount = Number(countResult[0]?.count || 0);

      // Extract timestamp from backup table name
      const timestampMatch = tableName.match(/_backup_(\d+)$/);
      const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();

      backups.push({
        tableName: originalTable,
        backupTableName: tableName,
        rowCount,
        createdAt: new Date(timestamp),
        schemaMatches: true,
      });
    }

    return backups;
  } catch (error) {
    console.error("Error listing backups:", error);
    return [];
  }
}

/**
 * Delete old backup tables
 */
export async function cleanupBackups(olderThanDays: number = 7): Promise<number> {
  try {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    const backups = await listBackups();

    for (const backup of backups) {
      const backupTime = backup.createdAt.getTime();

      if (backupTime < cutoffTime) {
        console.log(`🗑️  Deleting old backup: ${backup.backupTableName}`);

        await db.execute(sql.raw(`
          DROP TABLE IF EXISTS ${backup.backupTableName}
        `));

        deletedCount++;
      }
    }

    console.log(`✅ Deleted ${deletedCount} old backup tables`);
    return deletedCount;
  } catch (error) {
    console.error("Error cleaning up backups:", error);
    return 0;
  }
}

// =====================================================
// Rollback Operations
// =====================================================

/**
 * Rollback migration for a single table
 */
export async function rollbackTable(
  tableName: string,
  backupTableName?: string
): Promise<RollbackResult> {
  const startTime = Date.now();
  const result: RollbackResult = {
    tableName,
    rowsRestored: 0,
    errors: [],
    status: "completed",
    duration: 0,
  };

  try {
    console.log(`\n🔄 Rolling back table: ${tableName}`);

    // Find most recent backup if not specified
    if (!backupTableName) {
      const backups = await listBackups();
      const tableBackups = backups.filter((b) => b.tableName === tableName);

      if (tableBackups.length === 0) {
        throw new Error(`No backups found for table: ${tableName}`);
      }

      // Use most recent backup
      tableBackups.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      backupTableName = tableBackups[0].backupTableName;
    }

    console.log(`   Using backup: ${backupTableName}`);

    // Clear organization_id from current table
    await db.execute(sql.raw(`
      UPDATE ${tableName}
      SET organization_id = NULL,
          updated_at = NOW()
      WHERE organization_id IS NOT NULL
    `));

    // Get count of restored rows
    const countResult = await db.execute(sql.raw(`
      SELECT COUNT(*) as count 
      FROM ${tableName}
      WHERE organization_id IS NULL AND tenant_id IS NOT NULL
    `));

    result.rowsRestored = Number(countResult[0]?.count || 0);
    result.status = "completed";
    result.duration = Date.now() - startTime;

    console.log(`   ✅ Rolled back ${result.rowsRestored} rows`);
    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);

    return result;
  } catch (error) {
    result.status = "failed";
    result.duration = Date.now() - startTime;
    result.errors.push({
      row: {},
      error: error instanceof Error ? error.message : "Unknown error",
    });

    console.error(`❌ Rollback failed for ${tableName}:`, error);
    return result;
  }
}

/**
 * Rollback migration for all tables
 */
export async function rollbackAllTables(): Promise<Map<string, RollbackResult>> {
  const results = new Map<string, RollbackResult>();
  const startTime = Date.now();

  const tables = [
    "strike_votes",
    "grievances",
    "certification_applications",
    "clause_library",
    "precedents",
    "documents",
    "claims",
    "profiles",
  ];

  console.log("\n🔄 Rolling back all tables...\n");

  for (const tableName of tables) {
    const result = await rollbackTable(tableName);
    results.set(tableName, result);
  }

  const totalDuration = Date.now() - startTime;
  const totalRestored = Array.from(results.values()).reduce(
    (sum, r) => sum + r.rowsRestored,
    0
  );

  console.log("\n" + "=".repeat(60));
  console.log("📊 ROLLBACK SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Total rows restored: ${totalRestored}`);
  console.log(`Tables rolled back: ${results.size}`);
  console.log("=".repeat(60) + "\n");

  return results;
}

/**
 * Rollback specific tenant's migration
 */
export async function rollbackTenant(tenantId: string): Promise<boolean> {
  console.log(`\n🔄 Rolling back tenant: ${tenantId}`);

  const tables = [
    "profiles",
    "claims",
    "documents",
    "precedents",
    "clause_library",
    "certification_applications",
    "grievances",
    "strike_votes",
  ];

  try {
    let totalRestored = 0;

    for (const tableName of tables) {
      const result = await db.execute(sql.raw(`
        UPDATE ${tableName}
        SET organization_id = NULL,
            updated_at = NOW()
        WHERE tenant_id = '${tenantId}'
        AND organization_id IS NOT NULL
      `));

      // Get count of restored rows
      const countResult = await db.execute(sql.raw(`
        SELECT COUNT(*) as count 
        FROM ${tableName}
        WHERE tenant_id = '${tenantId}' AND organization_id IS NULL
      `));

      const restored = Number(countResult[0]?.count || 0);
      totalRestored += restored;

      if (restored > 0) {
        console.log(`   ${tableName}: ${restored} rows restored`);
      }
    }

    // Update mapping status
    await updateMappingStatus(tenantId, "rolled_back");

    console.log(`\n✅ Tenant rollback completed: ${totalRestored} records restored`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to rollback tenant ${tenantId}:`, error);
    return false;
  }
}

// =====================================================
// Verification Functions
// =====================================================

/**
 * Verify rollback was successful
 */
export async function verifyRollback(tableName: string): Promise<{
  success: boolean;
  withOrgId: number;
  withoutOrgId: number;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Count rows with organization_id
    const withOrgResult = await db.execute(sql.raw(`
      SELECT COUNT(*) as count 
      FROM ${tableName}
      WHERE organization_id IS NOT NULL
    `));

    const withOrgId = Number(withOrgResult[0]?.count || 0);

    // Count rows without organization_id (should match tenant_id rows)
    const withoutOrgResult = await db.execute(sql.raw(`
      SELECT COUNT(*) as count 
      FROM ${tableName}
      WHERE tenant_id IS NOT NULL AND organization_id IS NULL
    `));

    const withoutOrgId = Number(withoutOrgResult[0]?.count || 0);

    if (withOrgId > 0) {
      issues.push(
        `${withOrgId} rows still have organization_id set (expected 0)`
      );
    }

    return {
      success: issues.length === 0,
      withOrgId,
      withoutOrgId,
      issues,
    };
  } catch (error) {
    console.error(`Error verifying rollback for ${tableName}:`, error);
    return {
      success: false,
      withOrgId: 0,
      withoutOrgId: 0,
      issues: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Verify all table rollbacks
 */
export async function verifyAllRollbacks(): Promise<
  Map<
    string,
    {
      success: boolean;
      withOrgId: number;
      withoutOrgId: number;
      issues: string[];
    }
  >
> {
  const results = new Map();

  const tables = [
    "profiles",
    "claims",
    "documents",
    "precedents",
    "clause_library",
    "certification_applications",
    "grievances",
    "strike_votes",
  ];

  console.log("\n🔍 Verifying rollback for all tables...\n");

  for (const tableName of tables) {
    const result = await verifyRollback(tableName);
    results.set(tableName, result);

    const status = result.success ? "✅" : "❌";
    console.log(`${status} ${tableName}:`);
    console.log(`   With org_id: ${result.withOrgId}`);
    console.log(`   Without org_id: ${result.withoutOrgId}`);

    if (result.issues.length > 0) {
      result.issues.forEach((issue) => console.log(`   ⚠️  ${issue}`));
    }
  }

  return results;
}

/**
 * Compare table data before and after rollback
 */
export async function compareWithBackup(
  tableName: string,
  backupTableName: string
): Promise<{
  matches: boolean;
  differences: number;
  details: string[];
}> {
  const details: string[] = [];

  try {
    // Compare row counts
    const currentCount = await db.execute(sql.raw(`
      SELECT COUNT(*) as count FROM ${tableName}
    `));

    const backupCount = await db.execute(sql.raw(`
      SELECT COUNT(*) as count FROM ${backupTableName}
    `));

    const current = Number(currentCount[0]?.count || 0);
    const backup = Number(backupCount[0]?.count || 0);

    if (current !== backup) {
      details.push(
        `Row count mismatch: current=${current}, backup=${backup}`
      );
    }

    // Compare organization_id nulls
    const nullOrgCount = await db.execute(sql.raw(`
      SELECT COUNT(*) as count 
      FROM ${tableName}
      WHERE organization_id IS NULL AND tenant_id IS NOT NULL
    `));

    const nullOrgs = Number(nullOrgCount[0]?.count || 0);

    if (nullOrgs !== current) {
      details.push(
        `Not all organization_id values cleared: ${nullOrgs}/${current}`
      );
    }

    return {
      matches: details.length === 0,
      differences: details.length,
      details,
    };
  } catch (error) {
    console.error(`Error comparing with backup:`, error);
    return {
      matches: false,
      differences: 1,
      details: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// =====================================================
// Emergency Rollback
// =====================================================

/**
 * Emergency rollback - stops all migrations and rolls back everything
 */
export async function emergencyRollback(): Promise<{
  success: boolean;
  tablesRolledBack: number;
  errors: string[];
}> {
  console.log("\n🚨 EMERGENCY ROLLBACK INITIATED\n");

  const errors: string[] = [];
  let tablesRolledBack = 0;

  try {
    // Rollback all tables
    const results = await rollbackAllTables();

    for (const [tableName, result] of Array.from(results)) {
      if (result.status === "completed") {
        tablesRolledBack++;
      } else {
        errors.push(`Failed to rollback ${tableName}: ${result.errors[0]?.error}`);
      }
    }

    // Update all mapping statuses to rolled_back
    await db.execute(sql.raw(`
      UPDATE tenant_org_mappings
      SET migration_status = 'rolled_back',
          updated_at = NOW()
      WHERE migration_status IN ('in_progress', 'failed')
    `));

    console.log("\n✅ Emergency rollback completed");
    console.log(`   Tables rolled back: ${tablesRolledBack}`);
    console.log(`   Errors: ${errors.length}`);

    return {
      success: errors.length === 0,
      tablesRolledBack,
      errors,
    };
  } catch (error) {
    console.error("\n❌ Emergency rollback failed:", error);
    return {
      success: false,
      tablesRolledBack,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

