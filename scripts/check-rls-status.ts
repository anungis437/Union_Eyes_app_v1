/**
 * Check RLS Status
 * 
 * This script checks if RLS is enabled and what policies exist
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkRLS() {
  console.log('🔍 Checking RLS Status...\n');
  
  try {
    // First, let's see ALL tables in public schema
    console.log('0️⃣  Checking all tables in public schema...\n');
    
    const allTablesQuery = sql`
      SELECT tablename
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    
    const allTables = await db.execute(allTablesQuery);
    
    if (allTables.rows && allTables.rows.length > 0) {
      console.log(`Found ${allTables.rows.length} tables in public schema:\n`);
      allTables.rows.forEach((row: any) => {
        console.log(`  - ${row.tablename}`);
      });
    } else {
      console.log('  ⚠️  No tables found in public schema');
    }
    
    // Check if RLS is enabled on tables
    console.log('\n1️⃣  Checking if RLS is enabled on messaging tables...\n');
    
    const rlsEnabledQuery = sql`
      SELECT 
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('messages', 'message_threads', 'message_participants', 
                         'message_read_receipts', 'message_notifications', 'in_app_notifications')
      ORDER BY tablename;
    `;
    
    const tables = await db.execute(rlsEnabledQuery);
    
    if (tables.rows && tables.rows.length > 0) {
      console.log(`Found ${tables.rows.length} tables:\n`);
      tables.rows.forEach((row: any) => {
        const status = row.rls_enabled ? '✅ ENABLED' : '❌ DISABLED';
        console.log(`  ${row.tablename}: ${status}`);
      });
    } else {
      console.log('  ⚠️  No tables found');
    }
    
    // Check which policies exist
    console.log('\n2️⃣  Checking RLS policies...\n');
    
    const policiesQuery = sql`
      SELECT 
        schemaname,
        tablename, 
        policyname,
        cmd as operation
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    const policies = await db.execute(policiesQuery);
    
    if (policies.rows && policies.rows.length > 0) {
      console.log(`Found ${policies.rows.length} RLS policies:\n`);
      
      let currentTable = '';
      policies.rows.forEach((row: any) => {
        if (row.tablename !== currentTable) {
          if (currentTable) console.log('');
          currentTable = row.tablename;
          console.log(`  📋 ${row.tablename}:`);
        }
        console.log(`     - ${row.policyname} (${row.operation})`);
      });
    } else {
      console.log('  ⚠️ No RLS policies found');
    }
    
    // Check helper functions
    console.log('\n3️⃣  Checking helper functions...\n');
    
    const functionsQuery = sql`
      SELECT 
        proname as function_name,
        pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname IN ('current_user_id', 'current_organization_id')
      ORDER BY proname;
    `;
    
    const functions = await db.execute(functionsQuery);
    
    if (functions.rows && functions.rows.length > 0) {
      console.log(`Found ${functions.rows.length} helper functions:\n`);
 functions.rows.forEach((row: any) => {
        console.log(`  ✅ ${row.function_name}()`);
      });
    } else {
      console.log('  ⚠️  No helper functions found');
    }
    
    console.log('\n✨ Check complete!');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Error during check:');
    console.error(error);
    process.exit(1);
  }
}

// Run check
checkRLS();
