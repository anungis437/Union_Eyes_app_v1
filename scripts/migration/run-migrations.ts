import { config } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";

// Load environment variables from .env.local
config({ path: ".env.local" });

async function runMigrations() {
  console.log("🚀 Starting database migrations...\n");

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
    // Read migration files
    const migration1Path = join(__dirname, "..", "database", "migrations", "001_enterprise_foundation.sql");
    const migration2Path = join(__dirname, "..", "database", "migrations", "002_voting_system.sql");

    console.log("📄 Reading migration files...");
    const migration1 = readFileSync(migration1Path, "utf-8");
    const migration2 = readFileSync(migration2Path, "utf-8");

    // Run first migration
    console.log("\n⏳ Running 001_enterprise_foundation.sql...");
    await sql.unsafe(migration1);
    console.log("✅ 001_enterprise_foundation.sql completed successfully");

    // Run second migration
    console.log("\n⏳ Running 002_voting_system.sql...");
    await sql.unsafe(migration2);
    console.log("✅ 002_voting_system.sql completed successfully");

    // Verify schemas created
    console.log("\n🔍 Verifying schemas...");
    const schemas = await sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name IN ('tenant_management', 'user_management', 'audit_security', 'public')
      ORDER BY schema_name;
    `;
    
    console.log("\n📊 Created schemas:");
    schemas.forEach(row => {
      console.log(`  ✅ ${row.schema_name}`);
    });

    // Verify tables in tenant_management
    console.log("\n🔍 Verifying tables in tenant_management...");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'tenant_management'
      ORDER BY table_name;
    `;
    
    console.log("\n📊 Created tables in tenant_management:");
    tables.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    // Check for seed data
    console.log("\n🔍 Checking seed data...");
    const tenants = await sql`
      SELECT tenant_slug, tenant_name, subscription_tier 
      FROM tenant_management.tenants;
    `;
    
    console.log("\n📊 Seed tenants:");
    tenants.forEach(tenant => {
      console.log(`  ✅ ${tenant.tenant_slug} - ${tenant.tenant_name} (${tenant.subscription_tier})`);
    });

    console.log("\n✅ All migrations completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("  1. Test database connection with: npx tsx test-database-connection.ts");
    console.log("  2. Begin migrating pages and components");

  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
