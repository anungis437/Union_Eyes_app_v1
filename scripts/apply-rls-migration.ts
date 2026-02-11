/**
 * Apply RLS Migration 0071
 * 
 * This script applies the RLS policies migration directly to the database
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function applyMigration() {
  console.log('🚀 Starting RLS migration application...\n');
  
  try {
    // Read migration file
    const migrationPath = join(process.cwd(), 'db', 'migrations', '0073_update_documents_reports_calendar_rls.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration file loaded successfully');
    console.log(`   File: ${migrationPath}`);
    console.log(`   Size: ${migrationSQL.length} characters\n`);
    
    // Execute entire SQL file as one transaction
    console.log('⚙️  Executing migration SQL...\n');
    
    try {
      await db.execute(sql.raw(migrationSQL));
      console.log('✅ Migration executed successfully!\n');
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error(`❌ Error executing migration: ${errorMsg}\n`);
      
      // Try to get more details
      if (error.position) {
        const position = parseInt(error.position);
        const snippet = migrationSQL.substring(Math.max(0, position - 100), Math.min(migrationSQL.length, position + 100));
        console.error(`Error near position ${position}:`);
        console.error(snippet);
      }
      
      throw error;
    }
    
    // Verify RLS is enabled
    console.log('🔍 Verifying RLS policies...\n');
    
    const verifyQuery = sql`
      SELECT 
        tablename, 
        policyname,
        cmd as operation,
        qual as using_clause
      FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename IN ('messages', 'message_threads', 'message_participants', 
                         'message_read_receipts', 'message_notifications', 'in_app_notifications')
      ORDER BY tablename, policyname;
    `;
    
    const policies = await db.execute(verifyQuery);
    
    if (policies.rows && policies.rows.length > 0) {
      console.log(`✅ Found ${policies.rows.length} RLS policies:`);
      
      const policyCount: Record<string, number> = {};
      for (const row of policies.rows) {
        const table = row.tablename as string;
        policyCount[table] = (policyCount[table] || 0) + 1;
      }
      
      Object.entries(policyCount).forEach(([table, count]) => {
        console.log(`   - ${table}: ${count} policies`);
      });
    } else {
      console.log('⚠️  Warning: No RLS policies found. Migration may need manual review.');
    }
    
    console.log('\n✨ Migration application complete!');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Fatal error during migration:');
    console.error(error);
    process.exit(1);
  }
}

// Run migration
applyMigration();
