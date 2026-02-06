import { config } from "dotenv";
import { db, checkDatabaseConnection } from "../../db/db";
import { tenants } from "../../db/schema/tenant-management-schema";
import { users } from "../../db/schema/user-management-schema";
import { votingSessions } from "../../db/schema/voting-schema";
import { sql } from "drizzle-orm";

// Load environment variables from .env.local
config({ path: ".env.local" });

async function testDatabaseConnection() {
  console.log("🔍 Testing database connection...\n");
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✅ Loaded" : "❌ Not found");
  console.log("");

  try {
    // Check basic connection
    const connectionResult = await checkDatabaseConnection();
    console.log("✅", connectionResult.message);

    // Check if schemas exist
    console.log("\n🔍 Checking for existing schemas...");
    
    const schemaCheck = await db.execute(sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name IN ('tenant_management', 'user_management', 'audit_security', 'public')
      ORDER BY schema_name;
    `);
    
    console.log("\n📊 Found schemas:");
    schemaCheck.forEach(row => {
      console.log(`  - ${row.schema_name}`);
    });

    // Check if tables exist in tenant_management schema
    console.log("\n🔍 Checking for existing tables in tenant_management schema...");
    
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'tenant_management'
      ORDER BY table_name;
    `);
    
    if (tableCheck.length > 0) {
      console.log("\n📊 Found tables in tenant_management:");
      tableCheck.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });

      // Try to count records in tenants table
      const tenantsCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM tenant_management.tenants;
      `);
      console.log(`\n📈 Tenants in database: ${tenantsCount[0].count}`);
    } else {
      console.log("\n⚠️  No tables found in tenant_management schema");
      console.log("💡 You may need to run the SQL migrations from database/migrations/");
    }

    // Check voting_sessions table
    console.log("\n🔍 Checking for voting_sessions table...");
    const votingCheck = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'voting_sessions';
    `);
    
    if ((votingCheck[0] as any).count > 0) {
      console.log("✅ voting_sessions table exists");
    } else {
      console.log("⚠️  voting_sessions table not found - migrations may be needed");
    }

    console.log("\n✅ Database schema verification complete!");
    console.log("\n📝 Next steps:");
    console.log("  1. If schemas/tables don't exist, run migrations from database/migrations/");
    console.log("  2. If tables exist, begin migrating pages and components");
    
  } catch (error) {
    console.error("\n❌ Database connection test failed:");
    console.error(error);
    
    if (error instanceof Error) {
      if (error.message.includes("does not exist")) {
        console.log("\n💡 Tip: Run the SQL migrations to create the required schemas and tables");
      } else if (error.message.includes("connection")) {
        console.log("\n💡 Tip: Check DATABASE_URL in .env.local is correct");
      }
    }
  }

  process.exit(0);
}

testDatabaseConnection();
