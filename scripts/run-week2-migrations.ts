/**
 * Migration Runner - Apply pending SQL migrations
 * 
 * This script applies migrations 0062 and 0063 created for PRs #10 and #11
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

async function runMigration(filePath: string): Promise<void> {
  const sql = postgres(connectionString!, { max: 1 });
  
  try {
    const migrationSQL = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`\n📄 Running migration: ${path.basename(filePath)}`);
    console.log('━'.repeat(60));
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log(`✅ Migration completed successfully: ${path.basename(filePath)}\n`);
  } catch (error) {
    console.error(`❌ Migration failed: ${path.basename(filePath)}`);
    console.error(error);
    throw error;
  } finally {
    await sql.end();
  }
}

async function main() {
  console.log('🚀 Starting migrations...\n');
  
  const migrations = [
    'db/migrations/0062_add_immutable_transition_history.sql',
    'db/migrations/0063_add_audit_log_archive_support.sql',
  ];
  
  for (const migration of migrations) {
    const fullPath = path.join(process.cwd(), migration);
    
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  Migration file not found: ${migration}`);
      continue;
    }
    
    await runMigration(fullPath);
  }
  
  console.log('━'.repeat(60));
  console.log('✅ All migrations completed successfully!');
  console.log('\n📊 Verification queries:');
  console.log('1. Check grievance approvals: SELECT COUNT(*) FROM grievance_approvals;');
  console.log('2. Check audit log columns: \\d audit_security.audit_logs;');
  console.log('3. Check migrated approvals: SELECT COUNT(*) FROM grievance_approvals WHERE metadata->>\'legacy_migration\' = \'true\';');
}

main().catch((error) => {
  console.error('💥 Migration runner failed:', error);
  process.exit(1);
});
