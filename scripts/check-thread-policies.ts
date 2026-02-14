/**
 * Check message_threads RLS policies
 */

import { testDb as db } from '../db/test-db';
import { sql } from 'drizzle-orm';

async function checkThreadPolicies() {
  console.log('🔍 Checking message_threads RLS policies...\n');
  
  try {
    const policies = await db.execute(sql`
      SELECT 
        policyname,
        cmd,
        qual as using_clause,
        with_check
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'message_threads'
      ORDER BY policyname
    `);
    
    const results = Array.isArray(policies) ? policies : [];
    
    console.log(`Found ${results.length} policies:\n`);
    
    results.forEach((row: any) => {
      console.log(`📋 ${row.policyname}`);
      console.log(`   Command: ${row.cmd}`);
      console.log(`   USING: ${row.using_clause || 'none'}`);
      console.log(`   WITH CHECK: ${row.with_check || 'none'}`);
      console.log('');
    });
    
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkThreadPolicies();
