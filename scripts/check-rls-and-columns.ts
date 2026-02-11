import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}

const client = postgres(connectionString, { onnotice: () => {}, max: 1 });
const db = drizzle(client);

async function run() {
  try {
    const tables = ['claim_deadlines', 'dues_transactions'];

    for (const table of tables) {
      console.log(`\n=== ${table} columns ===`);
      const columns = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = ${table}
        ORDER BY ordinal_position
      `);
      for (const col of columns) {
        console.log(`- ${col.column_name} (${col.data_type})`);
      }

      console.log(`\n=== ${table} RLS policies ===`);
      const policies = await db.execute(sql`
        SELECT policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = ${table}
        ORDER BY policyname
      `);

      if (policies.length === 0) {
        console.log('(none)');
      } else {
        for (const policy of policies) {
          console.log(`- ${policy.policyname} (${policy.cmd})`);
        }
      }
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('\n❌ Error:', error.message || error);
  process.exitCode = 1;
});
