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
    const policies = await db.execute(sql`
      SELECT tablename, policyname, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND policyname IN (
          'claim_deadlines_insert_policy',
          'claim_deadlines_update_policy',
          'dues_transactions_insert_policy'
        )
      ORDER BY tablename, policyname
    `);

    for (const policy of policies) {
      console.log(`\n${policy.tablename}.${policy.policyname} (${policy.cmd})`);
      console.log('QUAL:', policy.qual || '(none)');
      console.log('WITH CHECK:', policy.with_check || '(none)');
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('\n❌ Error:', error.message || error);
  process.exitCode = 1;
});
