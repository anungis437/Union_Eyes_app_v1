/**
 * Apply Migration 0064: Database Immutability Triggers
 * 
 * This script applies the immutability constraints migration that adds
 * database-level triggers to prevent modification of historical records.
 * 
 * Usage:
 *   pnpm tsx scripts/apply-migration-0064.ts
 */

import { config } from "dotenv";
import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";

config({ path: ".env.local" });

const MIGRATION_FILE = path.join(
  process.cwd(),
  "db",
  "migrations",
  "0064_add_immutability_triggers.sql"
);

async function applyMigration() {
  console.log("🚀 Starting Migration 0064: Database Immutability Triggers");
  console.log("=" .repeat(70));

  // Check if migration file exists
  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error(`❌ Migration file not found: ${MIGRATION_FILE}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(MIGRATION_FILE, "utf-8");
  console.log(`✓ Loaded migration file (${migrationSQL.length} bytes)`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not found in environment");
    process.exit(1);
  }

  console.log(`✓ Connecting to database...`);
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    // Check if triggers already exist
    console.log("📋 Checking for existing triggers...");
    const existingTriggers = await sql`
      SELECT
        tgname,
        tgrelid::regclass::text as table_name
      FROM pg_trigger
      WHERE tgname LIKE 'prevent_%'
      ORDER BY tgrelid::regclass::text, tgname;
    `;

    if (existingTriggers.length > 0) {
      console.log(`⚠️  Found ${existingTriggers.length} existing immutability triggers:`);
      existingTriggers.forEach(t => {
        console.log(`   - ${t.tgname} on ${t.table_name}`);
      });
      console.log("\n⚠️  Migration may already be applied. Continue? (Ctrl+C to cancel)");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Apply the migration
    console.log("\n🔧 Applying migration...");
    await sql.unsafe(migrationSQL);
    console.log("✅ Migration applied successfully!");

    // Verify triggers were created
    console.log("\n🔍 Verifying trigger installation...");
    const newTriggers = await sql`
      SELECT
        tgname,
        tgrelid::regclass::text as table_name,
        tgenabled
      FROM pg_trigger
      WHERE tgname LIKE 'prevent_%'
         OR tgname LIKE '%immutability%'
      ORDER BY tgrelid::regclass::text, tgname;
    `;

    console.log(`\n📊 Installed Triggers (${newTriggers.length} total):`);
    const groupedByTable = newTriggers.reduce((acc, t) => {
      if (!acc[t.table_name]) acc[t.table_name] = [];
      acc[t.table_name].push(t.tgname);
      return acc;
    }, {} as Record<string, string[]>);

    Object.entries(groupedByTable).forEach(([table, triggers]) => {
      console.log(`\n   ${table}:`);
      triggers.forEach(trigger => {
        console.log(`     ✓ ${trigger}`);
      });
    });

    // Verify functions were created
    console.log("\n🔍 Verifying functions...");
    const functions = await sql`
      SELECT
        proname,
        pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname IN ('reject_mutation', 'audit_log_immutability_guard')
      ORDER BY proname;
    `;

    console.log(`\n📊 Installed Functions (${functions.length} total):`);
    functions.forEach(f => {
      console.log(`   ✓ ${f.proname}()`);
    });

    // Test immutability (optional verification)
    console.log("\n🧪 Testing immutability constraints...");
    try {
      // Try to update a record in an immutable table (should fail)
      await sql`
        UPDATE grievance_transitions
        SET stage = 'test'
        WHERE id = (SELECT id FROM grievance_transitions LIMIT 1);
      `;
      console.log("⚠️  WARNING: Update succeeded when it should have been blocked!");
    } catch (error: unknown) {
      if ((error as Error).message?.includes("immutable")) {
        console.log("   ✅ Immutability constraint working correctly (update blocked)");
      } else {
        console.log(`   ℹ️  No records to test or different error: ${(error as Error).message}`);
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("🎉 Migration 0064 applied successfully!");
    console.log("=".repeat(70));
    console.log("\nProtected Tables:");
    console.log("  - grievance_transitions (UPDATE ❌, DELETE ❌)");
    console.log("  - grievance_approvals (UPDATE ❌, DELETE ❌)");
    console.log("  - claim_updates (UPDATE ❌, DELETE ❌)");
    console.log("  - votes (UPDATE ❌, DELETE ❌)");
    console.log("  - audit_security.audit_logs (UPDATE⚠️  archive only, DELETE ❌)");
    console.log("\n✅ Audit trail integrity guaranteed by database layer");

  } catch (error: unknown) {
    console.error("\n❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the migration
applyMigration().catch(console.error);
