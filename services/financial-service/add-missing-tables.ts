/**
 * Add Missing Tables Migration
 */

import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

console.log('🔗 Connecting to database...');
const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

async function main() {
  try {
    console.log('📄 Running migration: add-missing-tables.sql\n');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'add-missing-tables.sql'),
      'utf-8'
    );
    
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n🔍 Verifying tables...\n');
    
    // Verify tables
    const tables = ['donations', 'picket_tracking', 'arrears'];
    for (const table of tables) {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        ) as exists
      `;
      console.log(`${result[0].exists ? '✅' : '❌'} ${table}`);
    }
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
