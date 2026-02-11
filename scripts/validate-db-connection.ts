import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function validateDbConnection() {
  if (!connectionString) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = postgres(connectionString, {
    onnotice: () => {},
  });
  const db = drizzle(client);

  try {
    const result = await db.execute(sql`SELECT 1 AS ok`);
    const row = result[0] as { ok?: number } | undefined;
    if (row?.ok === 1) {
      console.log('✅ Database connection OK');
    } else {
      console.log('⚠️ Database connection returned unexpected result:', result);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Database connection failed:', message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

validateDbConnection();
