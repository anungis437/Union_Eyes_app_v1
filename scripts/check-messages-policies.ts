/**
 * Check messages RLS policies in detail
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkMessagesPolicies() {
  console.log('🔍 Checking messages table RLS policies...\n');
  
  try {
    const policies = await db.execute(sql`
      SELECT 
        policyname,
        cmd,
        permissive,
        qual as using_clause,
        with_check
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'messages'
      ORDER BY policyname
    `);
    
    const results = Array.isArray(policies) ? policies : [];
    
    console.log(`Found ${results.length} policies:\n`);
    
    results.forEach((row: any) => {
      console.log(`📋 ${row.policyname}`);
      console.log(`   Command: ${row.cmd}`);
      console.log(`   Permissive: ${row.permissive}`);
      console.log(`   USING: ${row.using_clause || 'none'}`);
      console.log(`   WITH CHECK: ${row.with_check || 'none'}`);
      console.log('');
    });
    
    // Test the current_user_id() function
    console.log('Testing session context functions...\n');
    
    // Set test context
    await db.execute(sql`
      SELECT set_config('app.current_user_id', 'test-user-123', false)
    `);
    
    const result = await db.execute(sql`
      SELECT current_user_id() as user_id
    `);
    
    const testResults = Array.isArray(result) ? result : [];
    
    if (testResults.length > 0) {
      console.log(`✅ current_user_id() returns: ${(testResults[0] as any).user_id}`);
    } else {
      console.log('❌ current_user_id() function not working');
    }
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Error:');
    console.error(error.message);
    process.exit(1);
  }
}

checkMessagesPolicies();
