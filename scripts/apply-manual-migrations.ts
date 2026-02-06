/**
 * Apply Manual Migrations Script
 * 
 * This script applies manual SQL migrations in the correct order.
 * Manual migrations include RLS policies, triggers, functions, and other
 * database features not handled by Drizzle's schema system.
 * 
 * Usage:
 *   pnpm tsx scripts/apply-manual-migrations.ts
 *   pnpm tsx scripts/apply-manual-migrations.ts --dry-run
 *   pnpm tsx scripts/apply-manual-migrations.ts --from 055
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";

config({ path: ".env.local" });

const MANUAL_MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations", "manual");

// Define the order of manual migrations
const MANUAL_MIGRATION_ORDER = [
  // RLS Policies - Phase 1
  "053_enable_rls_policies.sql",
  "054_fix_rls_policies.sql",
  "055_pension_trustee_rls_policies.sql",
  
  // Critical Business Functions
  "056_critical_business_functions.sql",
  
  // Audit & Timestamps
  "057_add_audit_timestamps.sql",
  
  // Feature Systems
  "058_recognition_rewards_system.sql",
  
  // Advanced Analytics - Q1 2025
  "067_advanced_analytics_q1_2025.sql",
  "067_advanced_analytics_q1_2025_azure.sql",
  "067_advanced_analytics_rls_fix.sql",
  
  // PII Encryption
  "068_add_encrypted_pii_fields.sql",
  
  // Feature Flags
  "069_feature_flags_system.sql",
  
  // Patches (order by dependency)
  "cba_intelligence_manual.sql",
  "phase5b_inter_union_features.sql",
  "apply-feature-flags.sql",
  "add-notification-preferences.sql",
  "add_cited_cases_column.sql",
];

interface MigrationStatus {
  file: string;
  path: string;
  exists: boolean;
  size: number;
  applied?: boolean;
  error?: string;
}

async function checkManualMigrationsTable(db: ReturnType<typeof drizzle>) {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS __manual_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT NOW() NOT NULL,
        checksum TEXT NOT NULL
      );
    `);
    console.log("✓ Manual migrations tracking table ready");
  } catch (error) {
    console.error("❌ Failed to create manual migrations table:", error);
    throw error;
  }
}

async function getMigrationChecksum(filePath: string): Promise<string> {
  const content = fs.readFileSync(filePath, "utf-8");
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function isMigrationApplied(
  db: ReturnType<typeof drizzle>,
  filename: string
): Promise<boolean> {
  try {
    const result = await db.execute(`
      SELECT filename FROM __manual_migrations WHERE filename = '${filename}'
    `);
    return result.length > 0;
  } catch (error) {
    console.error(`❌ Error checking migration status for ${filename}:`, error);
    return false;
  }
}

async function applyMigration(
  db: ReturnType<typeof drizzle>,
  filePath: string,
  filename: string,
  dryRun: boolean = false
): Promise<void> {
  const sql = fs.readFileSync(filePath, "utf-8");
  const checksum = await getMigrationChecksum(filePath);

  if (dryRun) {
    console.log(`  📝 Would apply: ${filename}`);
    console.log(`  📊 Size: ${(sql.length / 1024).toFixed(2)} KB`);
    return;
  }

  try {
    // Execute the migration SQL
    await db.execute(sql);
    
    // Record the migration
    await db.execute(`
      INSERT INTO __manual_migrations (filename, checksum)
      VALUES ('${filename}', '${checksum}')
      ON CONFLICT (filename) DO UPDATE SET
        applied_at = NOW(),
        checksum = '${checksum}'
    `);
    
    console.log(`✅ Applied: ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to apply ${filename}:`, error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fromIndex = args.findIndex((arg) => arg === "--from");
  const startFrom = fromIndex !== -1 ? args[fromIndex + 1] : null;

  console.log("\n🔄 Manual Migrations Application\n");
  console.log("=" .repeat(50));

  if (dryRun) {
    console.log("🏃 DRY RUN MODE - No changes will be made\n");
  }

  // Check database connection
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in environment");
    process.exit(1);
  }

  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  console.log("✓ Connected to database\n");

  // Initialize tracking table
  if (!dryRun) {
    await checkManualMigrationsTable(db);
    console.log("");
  }

  // Gather migration status
  const migrations: MigrationStatus[] = [];
  let startApplying = !startFrom;

  for (const filename of MANUAL_MIGRATION_ORDER) {
    const filePath = path.join(MANUAL_MIGRATIONS_DIR, filename);
    const exists = fs.existsSync(filePath);
    
    const migration: MigrationStatus = {
      file: filename,
      path: filePath,
      exists,
      size: exists ? fs.statSync(filePath).size : 0,
    };

    if (exists && !dryRun) {
      migration.applied = await isMigrationApplied(db, filename);
    }

    migrations.push(migration);

    // Check if we should start applying from this migration
    if (startFrom && filename.includes(startFrom)) {
      startApplying = true;
    }

    // Apply migration if needed
    if (exists && startApplying) {
      if (dryRun || !migration.applied) {
        try {
          await applyMigration(db, filePath, filename, dryRun);
        } catch (error) {
          migration.error = String(error);
          console.error(`\n⚠️  Stopping due to error in ${filename}\n`);
          break;
        }
      } else {
        console.log(`⏭️  Skipping (already applied): ${filename}`);
      }
    } else if (!exists) {
      console.log(`⚠️  File not found: ${filename}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Migration Summary\n");

  const applied = migrations.filter((m) => m.applied && !m.error);
  const pending = migrations.filter((m) => !m.applied && m.exists && !m.error);
  const missing = migrations.filter((m) => !m.exists);
  const errors = migrations.filter((m) => m.error);

  console.log(`✅ Applied:  ${applied.length}`);
  console.log(`⏳ Pending:  ${pending.length}`);
  console.log(`❌ Errors:   ${errors.length}`);
  console.log(`⚠️  Missing:  ${missing.length}`);

  if (pending.length > 0) {
    console.log("\n⏳ Pending Migrations:");
    pending.forEach((m) => console.log(`   - ${m.file}`));
  }

  if (missing.length > 0) {
    console.log("\n⚠️  Missing Files:");
    missing.forEach((m) => console.log(`   - ${m.file}`));
  }

  if (errors.length > 0) {
    console.log("\n❌ Errors:");
    errors.forEach((m) => console.log(`   - ${m.file}: ${m.error}`));
  }

  await client.end();
  console.log("\n✓ Done\n");
}

main().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
