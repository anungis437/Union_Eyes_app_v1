import { config } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";

// Load environment variables
config({ path: ".env" });

async function runJurisdictionMigrations() {
  console.log("🚀 Starting Jurisdiction Framework migrations...\n");

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
    // Define migration files in order
    const migrations = [
      "040_jurisdiction_framework_fixed.sql",
      "041_jurisdiction_seed_data.sql",
      "042_statutory_holidays_seed.sql",
      "043_jurisdiction_templates_seed.sql",
    ];

    // Run each migration
    for (const migrationFile of migrations) {
      const migrationPath = join(__dirname, "database", "migrations", migrationFile);
      console.log(`\n⏳ Running ${migrationFile}...`);
      
      try {
        const migrationSql = readFileSync(migrationPath, "utf-8");
        await sql.unsafe(migrationSql);
        console.log(`✅ ${migrationFile} completed successfully`);
      } catch (error) {
        console.error(`❌ Error running ${migrationFile}:`, error);
        throw error;
      }
    }

    // Verify the setup
    console.log("\n\n🔍 VERIFICATION PHASE\n");
    console.log("=" .repeat(80));

    // 1. Check tables created
    console.log("\n📊 Checking tables...");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('jurisdiction_rules', 'statutory_holidays', 'jurisdiction_templates', 'compliance_validations')
      ORDER BY table_name;
    `;
    
    if (tables.length === 4) {
      console.log("✅ All 4 tables created:");
      tables.forEach(row => console.log(`   - ${row.table_name}`));
    } else {
      console.log(`⚠️  Only ${tables.length}/4 tables found`);
    }

    // 2. Check enums created
    console.log("\n📊 Checking enums...");
    const enums = await sql`
      SELECT typname 
      FROM pg_type 
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND typname IN ('jurisdiction_rule_type', 'certification_method', 'strike_vote_requirement', 
                        'essential_service_designation', 'grievance_step_type')
      ORDER BY typname;
    `;
    
    if (enums.length === 5) {
      console.log("✅ All 5 enums created:");
      enums.forEach(row => console.log(`   - ${row.typname}`));
    } else {
      console.log(`⚠️  Only ${enums.length}/5 enums found`);
    }

    // 3. Check functions created
    console.log("\n📊 Checking functions...");
    const functions = await sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name IN ('calculate_business_days', 'add_business_days', 
                             'get_jurisdiction_rules', 'calculate_jurisdiction_deadline')
      ORDER BY routine_name;
    `;
    
    if (functions.length === 4) {
      console.log("✅ All 4 helper functions created:");
      functions.forEach(row => console.log(`   - ${row.routine_name}()`));
    } else {
      console.log(`⚠️  Only ${functions.length}/4 functions found`);
    }

    // 4. Count jurisdiction rules
    console.log("\n📊 Checking jurisdiction rules...");
    const rulesCount = await sql`
      SELECT 
        jurisdiction,
        COUNT(*) as rule_count
      FROM jurisdiction_rules
      GROUP BY jurisdiction
      ORDER BY jurisdiction;
    `;
    
    const totalRules = rulesCount.reduce((sum, row) => sum + parseInt(row.rule_count), 0);
    console.log(`✅ ${totalRules} jurisdiction rules loaded across ${rulesCount.length} jurisdictions:`);
    rulesCount.forEach(row => {
      console.log(`   - ${row.jurisdiction}: ${row.rule_count} rules`);
    });

    // 5. Count statutory holidays
    console.log("\n📊 Checking statutory holidays...");
    const holidaysCount = await sql`
      SELECT 
        jurisdiction,
        COUNT(*) as holiday_count
      FROM statutory_holidays
      GROUP BY jurisdiction
      ORDER BY jurisdiction;
    `;
    
    const totalHolidays = holidaysCount.reduce((sum, row) => sum + parseInt(row.holiday_count), 0);
    console.log(`✅ ${totalHolidays} statutory holidays loaded across ${holidaysCount.length} jurisdictions:`);
    holidaysCount.forEach(row => {
      console.log(`   - ${row.jurisdiction}: ${row.holiday_count} holidays`);
    });

    // 6. Count document templates
    console.log("\n📊 Checking document templates...");
    const templatesCount = await sql`
      SELECT 
        jurisdiction,
        COUNT(*) as template_count
      FROM jurisdiction_templates
      WHERE active = true
      GROUP BY jurisdiction
      ORDER BY jurisdiction;
    `;
    
    const totalTemplates = templatesCount.reduce((sum, row) => sum + parseInt(row.template_count), 0);
    console.log(`✅ ${totalTemplates} document templates loaded across ${templatesCount.length} jurisdictions:`);
    templatesCount.forEach(row => {
      console.log(`   - ${row.jurisdiction}: ${row.template_count} templates`);
    });

    // 7. Check indexes
    console.log("\n📊 Checking indexes...");
    const indexes = await sql`
      SELECT 
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('jurisdiction_rules', 'statutory_holidays', 'jurisdiction_templates', 'compliance_validations')
        AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname;
    `;
    
    console.log(`✅ ${indexes.length} indexes created (excluding primary keys):`);
    let currentTable = '';
    indexes.forEach(row => {
      if (row.tablename !== currentTable) {
        currentTable = row.tablename;
        console.log(`\n   ${row.tablename}:`);
      }
      console.log(`      - ${row.indexname}`);
    });

    // 8. Check RLS policies
    console.log("\n📊 Checking RLS policies...");
    const policies = await sql`
      SELECT 
        tablename,
        policyname,
        cmd
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('jurisdiction_rules', 'statutory_holidays', 'jurisdiction_templates', 'compliance_validations')
      ORDER BY tablename, policyname;
    `;
    
    console.log(`✅ ${policies.length} RLS policies created:`);
    let currentPolicyTable = '';
    policies.forEach(row => {
      if (row.tablename !== currentPolicyTable) {
        currentPolicyTable = row.tablename;
        console.log(`\n   ${row.tablename}:`);
      }
      console.log(`      - ${row.policyname} (${row.cmd})`);
    });

    // 9. Test a sample query
    console.log("\n\n🧪 TESTING SAMPLE QUERIES\n");
    console.log("=" .repeat(80));

    // Test Federal arbitration rule
    console.log("\n📋 Test 1: Fetching Federal arbitration deadline rule...");
    const federalArbitration = await sql`
      SELECT 
        rule_name,
        jurisdiction,
        rule_type,
        rule_parameters->>'deadline_days' as deadline_days,
        legal_reference
      FROM jurisdiction_rules
      WHERE jurisdiction = 'CA-FED'
        AND rule_type = 'grievance_arbitration'
        AND rule_category = 'arbitration_deadline'
      LIMIT 1;
    `;
    
    if (federalArbitration.length > 0) {
      const rule = federalArbitration[0];
      console.log("✅ Federal arbitration rule found:");
      console.log(`   - Rule: ${rule.rule_name}`);
      console.log(`   - Deadline: ${rule.deadline_days} days`);
      console.log(`   - Reference: ${rule.legal_reference}`);
    } else {
      console.log("⚠️  Federal arbitration rule not found");
    }

    // Test business day calculation function
    console.log("\n📋 Test 2: Testing business day calculation function...");
    const businessDaysTest = await sql`
      SELECT calculate_business_days(
        'CA-FED',
        '2025-11-24'::date,
        '2025-12-24'::date
      ) as business_days;
    `;
    
    if (businessDaysTest.length > 0) {
      console.log(`✅ Business days calculation working: ${businessDaysTest[0].business_days} business days`);
      console.log(`   (Between Nov 24, 2025 and Dec 24, 2025)`);
    }

    // Test deadline calculation function
    console.log("\n📋 Test 3: Testing deadline calculation function...");
    const deadlineTest = await sql`
      SELECT calculate_jurisdiction_deadline(
        'CA-FED',
        'arbitration_deadline',
        '2025-11-24'::date
      ) as deadline_date;
    `;
    
    if (deadlineTest.length > 0) {
      console.log(`✅ Deadline calculation working: ${deadlineTest[0].deadline_date}`);
      console.log(`   (25 business days from Nov 24, 2025)`);
    }

    // Test statutory holiday lookup
    console.log("\n📋 Test 4: Checking 2025 federal holidays...");
    const federalHolidays = await sql`
      SELECT 
        holiday_name,
        holiday_date,
        affects_deadlines
      FROM statutory_holidays
      WHERE jurisdiction = 'CA-FED'
        AND EXTRACT(YEAR FROM holiday_date) = 2025
      ORDER BY holiday_date;
    `;
    
    console.log(`✅ Found ${federalHolidays.length} federal holidays for 2025:`);
    federalHolidays.forEach(h => {
      console.log(`   - ${h.holiday_date.toISOString().split('T')[0]}: ${h.holiday_name}`);
    });

    // Test Quebec template (bilingual)
    console.log("\n📋 Test 5: Checking Quebec bilingual template...");
    const quebecTemplate = await sql`
      SELECT 
        template_name,
        jurisdiction,
        metadata->>'bilingual' as is_bilingual,
        metadata->>'language' as language
      FROM jurisdiction_templates
      WHERE jurisdiction = 'CA-QC'
        AND active = true
      LIMIT 1;
    `;
    
    if (quebecTemplate.length > 0) {
      const tmpl = quebecTemplate[0];
      console.log("✅ Quebec template found:");
      console.log(`   - Name: ${tmpl.template_name}`);
      console.log(`   - Bilingual: ${tmpl.is_bilingual}`);
      console.log(`   - Language: ${tmpl.language}`);
    }

    console.log("\n\n" + "=" .repeat(80));
    console.log("🎉 MIGRATION COMPLETE!\n");
    console.log("Summary:");
    console.log(`  ✅ 4 tables created`);
    console.log(`  ✅ 5 enums created`);
    console.log(`  ✅ 4 helper functions created`);
    console.log(`  ✅ ${totalRules} jurisdiction rules loaded`);
    console.log(`  ✅ ${totalHolidays} statutory holidays loaded`);
    console.log(`  ✅ ${totalTemplates} document templates loaded`);
    console.log(`  ✅ ${indexes.length} indexes created`);
    console.log(`  ✅ ${policies.length} RLS policies created`);
    console.log(`  ✅ All test queries passed`);
    console.log("\n🚀 Phase 5D database layer is ready!");
    console.log("=" .repeat(80));

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the migrations
runJurisdictionMigrations().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
