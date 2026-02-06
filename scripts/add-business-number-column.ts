import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function addBusinessNumberColumn() {
  try {
    console.log('=== Adding business_number Column to Organizations Table ===\n');

    // Add business_number column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS business_number TEXT
    `);

    console.log('✅ business_number column added successfully!');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

addBusinessNumberColumn();
