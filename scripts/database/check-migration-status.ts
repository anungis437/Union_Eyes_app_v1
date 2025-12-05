import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });

async function checkMigrationStatus() {
  const sql = postgres(process.env.DATABASE_URL!);

  console.log("\n=== Checking Phase 1-3 Migration Status ===\n");

  // Check for Phase 1 tables
  const phase1Tables = ['per_capita_remittances', 'transaction_clc_mappings', 'digital_signatures', 'voting_auditors', 'blockchain_audit_anchors'];
  
  // Check for Phase 2 tables
  const phase2Tables = ['pension_plans', 'pension_hours_banks', 'hw_benefit_plans', 'tax_slips', 'cra_xml_batches', 'cope_contributions', 'member_demographics', 'pay_equity_complaints'];
  
  // Check for Phase 3 tables
  const phase3Tables = ['organizing_campaigns', 'organizing_contacts', 'political_campaigns', 'elected_officials', 'training_courses', 'course_sessions'];

  const allTables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;

  const tableNames = allTables.map(t => t.table_name);

  console.log("Phase 1 tables:");
  for (const table of phase1Tables) {
    const exists = tableNames.includes(table);
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  }

  console.log("\nPhase 2 tables:");
  for (const table of phase2Tables) {
    const exists = tableNames.includes(table);
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  }

  console.log("\nPhase 3 tables:");
  for (const table of phase3Tables) {
    const exists = tableNames.includes(table);
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  }

  console.log(`\n Total tables in database: ${allTables.length}`);

  await sql.end();
}

checkMigrationStatus();
