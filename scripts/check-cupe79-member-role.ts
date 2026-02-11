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
    const rows = await db.execute(sql`
      SELECT user_id, organization_id, role, status
      FROM organization_members
      WHERE user_id = (
        SELECT user_id
        FROM organization_members
        WHERE role = 'member'
        LIMIT 1
      )
      LIMIT 5
    `);
    console.log(rows);
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('\n❌ Error:', error.message || error);
  process.exitCode = 1;
});
