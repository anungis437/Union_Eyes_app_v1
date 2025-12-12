/**
 * Migration Runner - Execute all missing database migrations
 * Connects to Azure PostgreSQL and creates all required tables
 */

import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('🔗 Connecting to database...');
const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1,
});

async function runMigration(filePath: string, fileName: string) {
  try {
    console.log(`\n📄 Running migration: ${fileName}`);
    const migrationSQL = fs.readFileSync(filePath, 'utf-8');
    
    await sql.unsafe(migrationSQL);
    
    console.log(`✅ Successfully executed: ${fileName}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error in ${fileName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database migrations...\n');
  
  const migrationsDir = path.join(__dirname, '../../database/migrations');
  
  const migrations = [
    '013_dues_management_adapted.sql',
    '014_strike_fund_adapted.sql',
    '015_notification_system.sql',
  ];

  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Migration file not found: ${migration}`);
      continue;
    }

    const success = await runMigration(filePath, migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('='.repeat(60));

  await sql.end();
  
  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed. Review errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All migrations completed successfully!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
