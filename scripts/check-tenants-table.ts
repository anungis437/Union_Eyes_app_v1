import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function checkTenantsTable() {
  console.log('=== Checking Tenants Table ===\n');

  try {
    // Check if tenant_management schema exists
    const schemaCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata 
        WHERE schema_name = 'tenant_management'
      ) as exists
    `);
    console.log('tenant_management schema exists:', schemaCheck[0]?.exists);

    // Check if tenants table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'tenant_management'
        AND table_name = 'tenants'
      ) as exists
    `);
    console.log('tenant_management.tenants table exists:', tableCheck[0]?.exists);

    if (!tableCheck[0]?.exists) {
      console.log('\n⚠️  tenant_management.tenants table does not exist!');
      
      // Check if dues_transactions foreign key references it
      const fkCheck = await db.execute(sql`
        SELECT
          tc.constraint_name,
          ccu.table_schema AS foreign_schema,
          ccu.table_name AS foreign_table,
          ccu.column_name AS foreign_column
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'dues_transactions' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.column_name = 'tenant_id'
      `);
      
      console.log('\ndues_transactions tenant_id foreign key:');
      console.log(fkCheck);
    } else {
      // Count records
      const count = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM tenant_management.tenants
      `);
      console.log(`\ntenants table has ${count[0]?.count} records`);

      // Sample tenants
      const sample = await db.execute(sql`
        SELECT tenant_id, tenant_name, tenant_slug 
        FROM tenant_management.tenants
        LIMIT 5
      `);
      console.log('\nSample tenants:');
      console.log(sample);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkTenantsTable();
