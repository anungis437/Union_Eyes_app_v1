import { db } from '../database';
import { sql } from 'drizzle-orm';

async function checkRLSBypass() {
  console.log('\n=== Checking RLS Bypass Status ===\n');

  // Check current database user
  const currentUser = await db.execute(sql`SELECT current_user, session_user`);
  console.log('1. Current database user:', JSON.stringify(currentUser, null, 2));

  // Check if user is superuser
  const superuserCheck = await db.execute(sql`
    SELECT rolname, rolsuper, rolbypassrls
    FROM pg_roles
    WHERE rolname = current_user
  `);
  console.log('\n2. User privileges:', JSON.stringify(superuserCheck, null, 2));

  // Check table ownership
  const tableOwner = await db.execute(sql`
    SELECT 
      schemaname, 
      tablename, 
      tableowner,
      rowsecurity
    FROM pg_tables
    WHERE tablename IN ('claims', 'claim_deadlines')
  `);
  console.log('\n3. Table ownership and RLS status:', JSON.stringify(tableOwner, null, 2));

  // Check if RLS is being enforced
  const rlsEnforcement = await db.execute(sql`
    SELECT
      tablename,
      tablename || ' RLS enabled: ' || 
      CASE WHEN rowsecurity THEN 'YES' ELSE 'NO' END as status
    FROM pg_tables
    WHERE tablename IN ('claims', 'claim_deadlines')
  `);
  console.log('\n4. RLS enforcement:', JSON.stringify(rlsEnforcement, null, 2));

  // Test if RLS policies are actually applied
  console.log('\n5. Testing RLS policy application (without session context):');
  try {
    const testQuery = await db.execute(sql`
      SELECT COUNT(*) as claim_count
      FROM claims
    `);
    console.log('Claims visible without session context:', JSON.stringify(testQuery, null, 2));
  } catch (error) {
    console.log('RLS blocked query:', error);
  }

  // Test with session context
  console.log('\n6. Testing RLS policy application (with session context):');
  try {
    await db.execute(sql`SET app.current_user_id = '00000000-0000-0000-0000-000000000003'`);
    const testQuery = await db.execute(sql`
      SELECT COUNT(*) as claim_count
      FROM claims
    `);
    console.log('Claims visible with session context:', JSON.stringify(testQuery, null, 2));
    await db.execute(sql`RESET app.current_user_id`);
  } catch (error) {
    console.log('Query failed:', error);
  }

  console.log('\n=== Check Complete ===\n');
  process.exit(0);
}

checkRLSBypass().catch(console.error);
