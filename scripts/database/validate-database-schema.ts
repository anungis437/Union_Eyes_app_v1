/**
 * Database Schema Validation and Migration Script
 * 
 * This script:
 * 1. Adds missing organization_id column to clause_comparisons_history
 * 2. Validates database connection
 * 3. Checks for missing tables
 * 4. Checks for missing columns in existing tables
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "../../db/schema";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in environment variables");
  console.error("   Check .env or .env.local files");
  process.exit(1);
}

console.log("📌 Using database:", process.env.DATABASE_URL.split('@')[1]?.split('?')[0] || 'unknown');

// Create database connection
const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  idle_timeout: 10,
  connect_timeout: 10,
});

const db = drizzle(client, { schema });

interface TableColumn {
  table: string;
  column: string;
  type: string;
  nullable: boolean;
}

async function validateAndMigrate() {
  console.log("🔍 Database Schema Validation & Migration");
  console.log("=" .repeat(60));
  
  // Step 1: Check database connection
  console.log("\n📡 Checking database connection...");
  try {
    await client`SELECT 1`;
    console.log("✅ Database connection successful");
  } catch (error) {
    console.error("❌ Database connection failed:", error instanceof Error ? error.message : error);
    console.error("\n💡 Troubleshooting:");
    console.error("   - Check your DATABASE_URL in .env");
    console.error("   - Verify network connectivity");
    console.error("   - Confirm database credentials are correct");
    process.exit(1);
  }
  
  // Step 2: Get database info
  console.log("\n📊 Database Information:");
  const dbInfo = await client`
    SELECT 
      current_database() as database,
      current_user as user,
      inet_server_addr() as host,
      version() as version
  `;
  
  if (dbInfo.length > 0) {
    const info = dbInfo[0] as any;
    console.log(`   Database: ${info.database}`);
    console.log(`   User: ${info.user}`);
    console.log(`   Host: ${info.host || 'localhost'}`);
    console.log(`   Version: ${info.version.split(',')[0]}`);
  }
  
  // Step 3: Run migration for clause_comparisons_history
  console.log("\n🔧 Running Migration: Add organization_id to clause_comparisons_history");
  
  try {
    // Check if column already exists
    const columnCheck = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clause_comparisons_history' 
        AND column_name = 'organization_id'
    `;
    
    if (columnCheck.length > 0) {
      console.log("   ℹ️  Column organization_id already exists, skipping...");
    } else {
      // Add the column
      await client`
        ALTER TABLE clause_comparisons_history 
        ADD COLUMN organization_id uuid NOT NULL REFERENCES organizations(id)
      `;
      console.log("   ✅ Added organization_id column");
      
      // Add index
      await client`
        CREATE INDEX IF NOT EXISTS idx_clause_comparisons_org 
        ON clause_comparisons_history(organization_id)
      `;
      console.log("   ✅ Created index on organization_id");
    }
  } catch (error) {
    console.error("   ⚠️  Migration warning:", error instanceof Error ? error.message : error);
    console.log("   💡 This may be expected if the column already exists or table is missing");
  }
  
  // Step 4: Get all tables in the database
  console.log("\n📋 Validating Tables...");
  const tables = await client`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  
  console.log(`   Found ${tables.length} tables in database`);
  
  // Step 5: Check for critical tables
  const criticalTables = [
    'organizations',
    'claims',
    'cba',
    'cba_clause',
    'shared_clause_library',
    'clause_library_tags',
    'clause_comparisons_history',
    'organization_members',
    'profiles',
    'user_uuid_mapping'
  ];
  
  console.log("\n🔍 Checking Critical Tables:");
  const tableNames = tables.map((r: any) => r.tablename);
  const missingTables: string[] = [];
  
  for (const table of criticalTables) {
    const exists = tableNames.includes(table);
    if (exists) {
      console.log(`   ✅ ${table}`);
    } else {
      console.log(`   ❌ ${table} - MISSING`);
      missingTables.push(table);
    }
  }
  
  // Step 6: Validate column completeness for key tables
  console.log("\n🔍 Validating Column Completeness:");
  
  const tableColumnChecks = {
    'clause_comparisons_history': ['id', 'user_id', 'organization_id', 'clause_ids', 'comparison_notes', 'created_at'],
    'shared_clause_library': ['id', 'source_organization_id', 'clause_title', 'clause_text', 'sharing_level', 'comparison_count'],
    'organizations': ['id', 'organization_name', 'slug', 'organization_type', 'jurisdiction'],
    'claims': ['id', 'claim_number', 'tenant_id', 'claimant_id', 'claim_type', 'status'],
  };
  
  for (const [table, expectedColumns] of Object.entries(tableColumnChecks)) {
    if (!tableNames.includes(table)) {
      console.log(`\n   ⚠️  Skipping ${table} - table doesn't exist`);
      continue;
    }
    
    console.log(`\n   📋 ${table}:`);
    
    const columns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = ${table}
      ORDER BY ordinal_position
    `;
    
    const columnNames = columns.map((r: any) => r.column_name);
    const missingColumns: string[] = [];
    
    for (const col of expectedColumns) {
      if (columnNames.includes(col)) {
        console.log(`      ✅ ${col}`);
      } else {
        console.log(`      ❌ ${col} - MISSING`);
        missingColumns.push(col);
      }
    }
    
    if (missingColumns.length > 0) {
      console.log(`      ⚠️  Missing ${missingColumns.length} column(s): ${missingColumns.join(', ')}`);
    }
  }
  
  // Step 7: Check for enum types
  console.log("\n🔍 Checking Enum Types:");
  const enums = await client`
    SELECT typname 
    FROM pg_type 
    WHERE typtype = 'e'
    ORDER BY typname
  `;
  
  console.log(`   Found ${enums.length} enum types:`);
  enums.forEach((row: any) => {
    console.log(`      • ${row.typname}`);
  });
  
  // Step 8: Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Validation Summary:");
  console.log("=".repeat(60));
  
  if (missingTables.length > 0) {
    console.log(`\n⚠️  Missing Tables (${missingTables.length}):`);
    missingTables.forEach(t => console.log(`   - ${t}`));
    console.log("\n💡 Run 'pnpm drizzle-kit push' to create missing tables");
  } else {
    console.log("\n✅ All critical tables present");
  }
  
  console.log("\n✅ Database validation complete!");
  console.log("\n💡 Next steps:");
  console.log("   1. Review any warnings or missing items above");
  console.log("   2. If needed, run: pnpm drizzle-kit push");
  console.log("   3. Re-enable history logging in compare endpoint if migration succeeded");
}

// Run the validation
validateAndMigrate()
  .then(() => {
    console.log("\n✨ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    console.error("\nError details:", error instanceof Error ? error.stack : error);
    process.exit(1);
  });
