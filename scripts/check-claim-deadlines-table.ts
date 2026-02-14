import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  onnotice: () => {}, // Suppress notices
});
const db = drizzle(client);

async function checkClaimDeadlinesTable() {
  console.log('=== Checking claim_deadlines table ===\n');

  try {
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'claim_deadlines'
      ) as exists
    `);
    
    console.log('Table exists:', tableCheck[0]);

    if (tableCheck[0]?.exists) {
      const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'claim_deadlines'
        ORDER BY ordinal_position
      `);
      
      console.log('\nColumns:');
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('\n❌ Table does not exist!');
    }

  } catch (error: unknown) {
    console.error('\n❌ Error:', (error as Error).message || error);
  } finally {
    await client.end();
  }
}

checkClaimDeadlinesTable();
