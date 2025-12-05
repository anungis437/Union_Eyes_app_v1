import postgres from 'postgres';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

async function runFullMigration() {
  console.log('🧹 Cleaning up partial tables...\n');
  
  const sql = postgres(process.env.DATABASE_URL!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // Clean up any partially-created pension/hw/tax/equity/organizing/political/training tables
    await sql`DROP TABLE IF EXISTS 
      pension_plans, pension_hours_banks, pension_contributions, pension_benefit_claims, pension_actuarial_valuations,
      hw_benefit_plans, hw_benefit_enrollments, hw_benefit_claims, trust_compliance_reports,
      tax_year_configurations, tax_slips, cra_xml_batches, cope_contributions,
      member_demographics, pay_equity_complaints, equity_snapshots, statcan_submissions,
      pension_trustee_boards, pension_trustees, pension_trustee_meetings,
      organizing_campaigns, organizing_contacts, organizing_activities, certification_applications, organizing_volunteers,
      political_campaigns, elected_officials, legislation_tracking, political_activities, member_political_participation,
      training_courses, course_sessions, course_registrations, member_certifications, training_programs, program_enrollments
    CASCADE`;
    
    console.log('✅ Cleanup complete\n');
    console.log('🚀 Starting Phase 1-3 migrations...\n');

    const migrations = [
      "043_5_members_stub.sql",
      "047_pension_hw_trust_system.sql",
      "048_cra_tax_compliance.sql",
      "049_equity_demographics.sql",
      "050_organizing_module.sql",
      "051_cope_political_action.sql",
      "052_education_training.sql",
    ];

    for (const migrationFile of migrations) {
      const migrationPath = join(__dirname, "database", "migrations", migrationFile);
      console.log(`\n⏳ Running ${migrationFile}...`);
      
      try {
        let migrationSql = readFileSync(migrationPath, "utf-8");
        
        // Add IF NOT EXISTS to all CREATE INDEX statements
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

    console.log("\n\n🔍 VERIFICATION PHASE\n");
    console.log("=".repeat(80));

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    console.log(`\n📊 Total tables: ${tables.length}`);
    
    const functions = await sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name;
    `;
    console.log(`📝 Total functions: ${functions.length}`);
    
    const views = await sql`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log(`👁️ Total views: ${views.length}`);

    console.log("\n✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY!\n");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runFullMigration();
