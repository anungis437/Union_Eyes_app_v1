import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function applyMigration() {
  console.log('=== Applying Migration 0078: FORCE RLS on dues_transactions ===\n');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }

  const migrationPath = path.join(__dirname, '../db/migrations/0078_force_dues_transactions_rls.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  const client = postgres(connectionString, { onnotice: () => {}, max: 1 });
  try {
    console.log('Executing migration...\n');
    await client.unsafe(migrationSQL);
    console.log('✅ Migration 0078 applied successfully!');
  } finally {
    await client.end();
  }
}

applyMigration().catch((error) => {
  console.error('\n❌ Migration failed:', error.message || error);
  process.exitCode = 1;
});
