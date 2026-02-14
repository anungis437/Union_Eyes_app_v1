/**
 * Check what current_user_id() returns in different contexts
 */

import { testDb as db } from '../db/test-db';
import { sql } from 'drizzle-orm';

async function checkFunction() {
  console.log('🔍 Testing current_user_id() function...\n');
  
  try {
    // Test 1: Without setting context
    console.log('1️⃣  Without setting context:');
    const result1 = await db.execute(sql`
      SELECT current_user_id() as user_id,
             current_user_id() IS NULL as is_null,
             current_user_id() = 'test' as equals_test
    `);
    
    const r1 = (Array.isArray(result1) ? result1[0] : null) as any;
    console.log(`   user_id: "${r1?.user_id}"`);
    console.log(`   is_null: ${r1?.is_null}`);
    console.log(`   equals_test: ${r1?.equals_test}\n`);
    
    // Test 2: After setting context
    console.log('2️⃣  After setting context to "test-user":'   );
    await db.execute(sql`
      SELECT set_config('app.current_user_id', 'test-user', false)
    `);
    
    const result2 = await db.execute(sql`
      SELECT current_user_id() as user_id,
             current_user_id() IS NULL as is_null,
             current_user_id() = 'test-user' as equals_test
    `);
    
    const r2 = (Array.isArray(result2) ? result2[0] : null) as any;
    console.log(`   user_id: "${r2?.user_id}"`);
    console.log(`   is_null: ${r2?.is_null}`);
    console.log(`   equals_test: ${r2?.equals_test}\n`);
    
    // Test 3: Check function definition
    console.log('3️⃣  Function definition:');
    const funcDef = await db.execute(sql`
      SELECT prosrc, prorettype::regtype as return_type
      FROM pg_proc
      WHERE proname = 'current_user_id'
    `);
    
    const func = (Array.isArray(funcDef) ? funcDef[0] : null) as any;
    if (func) {
      console.log(`   Return type: ${func.return_type}`);
      console.log(`   Source:\n   ${func.prosrc}\n`);
    }
    
    // Test 4: Test RLS policy logic
    console.log('4️⃣  Testing RLS policy logic:');
    
    // Clear context
    await db.execute(sql`
      SELECT set_config('app.current_user_id', NULL, false)
    `);
    
    const result3 = await db.execute(sql`
      SELECT 
        current_setting('app.current_user_id', true) as raw_setting,
        current_user_id() as func_result,
        'user-123' = current_user_id() as would_match
    `);
    
    const r3 = (Array.isArray(result3) ? result3[0] : null) as any;
    console.log(`   Raw setting: "${r3?.raw_setting}"`);
    console.log(`   Function result: "${r3?.func_result}"`);
    console.log(`   Would match "user-123": ${r3?.would_match}\n`);
    
    console.log('✨ Check complete!');
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkFunction();
