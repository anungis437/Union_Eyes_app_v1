/**
 * Check Messages Tables and RLS Status
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkMessagingRLS() {
  console.log('🔍 Checking messaging tables and RLS status...\n');
  
  try {
    // Check for messaging tables
    console.log('1️⃣  Messaging Tables:\n');
    
    const messageTables = await db.execute(sql`
      SELECT 
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN (
        'message_threads',
        'messages',
        'message_participants',
        'message_read_receipts',
        'message_notifications',
        'in_app_notifications'
      )
      ORDER BY tablename;
    `);
    
    const tableResults = Array.isArray(messageTables) ? messageTables : [];
    
    if (tableResults.length > 0) {
      tableResults.forEach((row: any) => {
        const rlsStatus = row.rowsecurity ? '✅ RLS ON' : '❌ RLS OFF';
        console.log(`  ${row.tablename}: ${rlsStatus}`);
      });
    } else {
      console.log('  ⚠️  No messaging tables found?!');
    }
    
    // Check for RLS policies
    console.log('\n2️⃣  RLS Policies:\n');
    
    const policies = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        policyname,
        cmd,
        qual
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename IN (
        'message_threads',
        'messages',
        'message_participants',
        'message_read_receipts',
        'message_notifications',
        'in_app_notifications'
      )
      ORDER BY tablename, policyname;
    `);
    
    const policyResults = Array.isArray(policies) ? policies : [];
    
    if (policyResults.length > 0) {
      console.log(`Found ${policyResults.length} policies:\n`);
      let currentTable = '';
      policyResults.forEach((row: any) => {
        if (row.tablename !== currentTable) {
          currentTable = row.tablename;
          console.log(`\n  📁 ${currentTable}:`);
        }
        console.log(`     - ${row.policyname} (${row.cmd})`);
      });
    } else {
      console.log('  ⚠️  No RLS policies found on messaging tables');
    }
    
    // Check helper functions
    console.log('\n3️⃣  Helper Functions:\n');
    
    const functions = await db.execute(sql`
      SELECT 
        proname,
        prosrc
      FROM pg_proc 
      WHERE proname IN ('current_user_id', 'current_organization_id');
    `);
    
    const functionResults = Array.isArray(functions) ? functions : [];
    
    if (functionResults.length > 0) {
      functionResults.forEach((row: any) => {
        console.log(`  ✅ ${row.proname}()`);
        console.log(`     ${row.prosrc.substring(0, 100)}...`);
      });
    } else {
      console.log('  ⚠️  Helper functions not found');
    }
    
    console.log('\n✨ Check complete!');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Error:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkMessagingRLS();
