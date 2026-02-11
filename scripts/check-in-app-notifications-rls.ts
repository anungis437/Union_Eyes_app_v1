/**
 * Check in_app_notifications RLS status
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkInAppNotifications() {
  console.log('🔍 Checking in_app_notifications...\n');
  
  try {
    // Check table RLS status
    const table = await db.execute(sql`
      SELECT 
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'in_app_notifications';
    `);
    
    const tableResults = Array.isArray(table) ? table : [];
    
    if (tableResults.length > 0) {
      const row = tableResults[0] as any;
      console.log(`Table: ${row.tablename}`);
      console.log(`RLS: ${row.rowsecurity ? '✅ ON' : '❌ OFF'}`);
    } else {
      console.log('⚠️  in_app_notifications table not found!');
      process.exit(1);
    }
    
    // Check policies
    const policies = await db.execute(sql`
      SELECT 
        policyname,
        cmd,
        permissive,
        qual,
        with_check
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'in_app_notifications'
      ORDER BY policyname;
    `);
    
    const policyResults = Array.isArray(policies) ? policies : [];
    
    console.log(`\nPolicies: ${policyResults.length} found\n`);
    
    if (policyResults.length > 0) {
      policyResults.forEach((row: any) => {
        console.log(`  📋 ${row.policyname}`);
        console.log(`     Command: ${row.cmd}`);
        console.log(`     Permissive: ${row.permissive}`);
        console.log(`     USING: ${row.qual || 'none'}`);
        console.log(`     WITH CHECK: ${row.with_check || 'none'}`);
        console.log('');
      });
    } else {
      console.log('  ⚠️  No policies found on in_app_notifications');
      console.log('  This table needs RLS policies!');
    }
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Error:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkInAppNotifications();
