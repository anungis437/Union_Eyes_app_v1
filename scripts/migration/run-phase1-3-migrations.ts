import { config } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";

// Load environment variables
config({ path: ".env" });

async function runPhase1to3Migrations() {
  console.log("🚀 Starting Phase 1-3 migrations...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in environment variables");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // Define migration files in order (only files that exist)
    // Note: 044-046 already completed successfully
    const migrations = [
      // Phase 1: Foundation
      // "044_clc_hierarchy_system.sql", // ✅ Completed
      // "045_pki_digital_signatures.sql", // ✅ Completed
      // "046_e2ee_voting_blockchain.sql", // ✅ Completed
      "043_5_members_stub.sql", // Stub for members table FK references
      
      // Phase 2: Financial & Compliance
      "047_pension_hw_trust_system.sql",
      "048_cra_tax_compliance.sql",
      "049_equity_demographics.sql",
    ];

    // Run each migration
    for (const migrationFile of migrations) {
      const migrationPath = join(__dirname, "database", "migrations", migrationFile);
      console.log(`\n⏳ Running ${migrationFile}...`);
      
      try {
        let migrationSql = readFileSync(migrationPath, "utf-8");
        
        // Add IF NOT EXISTS to all CREATE INDEX statements that don't have it
        migrationSql = migrationSql.replace(
          /CREATE INDEX (?!IF NOT EXISTS )/gi,
          'CREATE INDEX IF NOT EXISTS '
        );
        
        await sql.unsafe(migrationSql);
        console.log(`✅ ${migrationFile} completed successfully`);
      } catch (error) {
        console.error(`❌ Error running ${migrationFile}:`, error);
        throw error;
      }
    }

    // Verify the setup
    console.log("\n\n🔍 VERIFICATION PHASE\n");
    console.log("=".repeat(80));

    // Count tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN (
        'compliance_validations', 'jurisdiction_rules', 
        'jurisdiction_templates', 'statutory_holidays'
      )
      ORDER BY table_name;
    `;
    console.log(`\n📊 Tables created: ${tables.length}`);
    console.log(`✅ Tables: ${tables.map(t => t.table_name).join(", ")}\n`);

    // Count functions
    const functions = await sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
      AND routine_name NOT IN (
        'add_business_days', 'calculate_business_days',
        'calculate_jurisdiction_deadline', 'get_jurisdiction_rules'
      )
      ORDER BY routine_name;
    `;
    console.log(`📊 Functions created: ${functions.length}`);
    console.log(`✅ Functions: ${functions.map(f => f.routine_name).join(", ")}\n`);

    // Count views
    const views = await sql`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log(`📊 Views created: ${views.length}`);
    console.log(`✅ Views: ${views.map(v => v.table_name).join(", ")}\n`);

    // Count enums
    const enums = await sql`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
      AND typname NOT IN (
        'certification_method', 'essential_service_designation',
        'grievance_step_type', 'jurisdiction_rule_type', 'strike_vote_requirement'
      )
      ORDER BY typname;
    `;
    console.log(`📊 Enums created: ${enums.length}`);
    console.log(`✅ Enums: ${enums.map(e => e.typname).join(", ")}\n`);

    console.log("=".repeat(80));
    console.log("🎉 PHASE 1-3 MIGRATIONS COMPLETE!\n");
    console.log("Summary:");
    console.log(`  ✅ ${tables.length} tables created`);
    console.log(`  ✅ ${functions.length} functions created`);
    console.log(`  ✅ ${views.length} views created`);
    console.log(`  ✅ ${enums.length} enums created`);
    console.log("\n🚀 Phase 1-3 database layer is ready!");
    console.log("=".repeat(80));

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runPhase1to3Migrations();
