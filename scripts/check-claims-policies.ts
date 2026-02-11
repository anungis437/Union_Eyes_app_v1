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
      SELECT policyname, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'claims'
      ORDER BY policyname
    `);
    console.log(policies);
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('\n❌ Error:', error.message || error);
  process.exitCode = 1;
});
