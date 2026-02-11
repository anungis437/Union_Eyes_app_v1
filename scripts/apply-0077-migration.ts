import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function applyMigration() {
  console.log('=== Applying Migration 0077: Migrate claim_deadlines to organization_id ===\n');

  try {
    const migrationPath = path.join(__dirname, '../db/migrations/0077_migrate_claim_deadlines_to_org_id.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set.');
    }

    const client = postgres(connectionString, { onnotice: () => {}, max: 1 });
    try {
      console.log('Executing migration...\n');
      await client.unsafe(migrationSQL);
    } finally {
      await client.end();
    }

    console.log('✅ Migration 0077 applied successfully!');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message || error);
    throw error;
  }
}

applyMigration();
