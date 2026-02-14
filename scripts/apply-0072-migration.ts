/**
 * Apply Migration 0072 - in_app_notifications RLS Policies
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  console.log('🚀 Applying migration 0072: in_app_notifications RLS...\n');
  console.log('Working directory:', process.cwd());
  
  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'db', 'migrations', '0072_update_in_app_notifications_rls.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found!');
      console.error('   Expected:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log(`📊 Size: ${migrationSQL.length} characters\n`);
    
    console.log('⚙️  Executing migration...\n');
    
    // Execute the entire migration as one transaction
    const result = await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Migration executed successfully!\n');
    
    // Verify RLS is enabled with policies
    console.log('🔍 Verifying RLS status...\n');
    
    const verification = await db.execute(sql`
      SELECT 
        t.tablename,
        t.rowsecurity,
        COUNT(p.policyname) as policy_count
      FROM pg_tables t
      LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
      WHERE t.schemaname = 'public' 
      AND t.tablename = 'in_app_notifications'
      GROUP BY t.tablename, t.rowsecurity;
    `);
    
    const results = Array.isArray(verification) ? verification : [];
    
    if (results.length > 0) {
      const info = results[0] as any;
      console.log(`  Table: ${info.tablename}`);
      console.log(`  RLS Enabled: ${info.rowsecurity ? '✅ YES' : '❌ NO'}`);
      console.log(`  Policies: ${info.policy_count}`);
    }
    
    console.log('\n✨ Migration complete!');
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

applyMigration();
