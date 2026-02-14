/**
 * Check message_participants RLS policies
 */

import { testDb as db } from '../db/test-db';
import { sql } from 'drizzle-orm';

async function checkParticipantPolicies() {
  console.log('🔍 Checking message_participants RLS policies...\n');
  
  try {
    const policies = await db.execute(sql`
      SELECT 
        policyname,
        cmd,
        qual as using_clause,
        with_check
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'message_participants'
      ORDER BY policyname
    `);
    
    const results = Array.isArray(policies) ? policies : [];
    
    console.log(`Found ${results.length} policies:\n`);
    
    results.forEach((row: any) => {
      console.log(`📋 ${row.policyname}`);
      console.log(`   Command: ${row.cmd}`);
      console.log(`   USING: ${(row.using_clause || 'none').substring(0, 200)}...`);
      console.log(`   WITH CHECK: ${(row.with_check || 'none').substring(0, 200)}...`);
      console.log('');
    });
    
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkParticipantPolicies();
