import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function checkDeadlineColumns() {
  console.log('=== Checking Deadline Tables ===\n');

  try {
    const columns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'claim_deadlines'
      ORDER BY ordinal_position
    `);
    
    console.log('claim_deadlines columns:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check if view exists
    const viewCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'v_critical_deadlines'
      ) as view_exists
    `);
    
    console.log('\nv_critical_deadlines view exists:', viewCheck[0]?.view_exists);

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkDeadlineColumns();
