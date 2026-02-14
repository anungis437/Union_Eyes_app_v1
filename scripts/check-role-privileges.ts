/**
 * Check database role and RLS bypass
 */

import { testDb as db } from '../db/test-db';
import { sql } from 'drizzle-orm';

async function checkRole() {
  console.log('🔍 Checking database role privileges...\n');
  
  try {
    // Check current role
    const roleInfo = await db.execute(sql`
      SELECT 
        current_user as role_name,
        usesuper as is_superuser,
        usecreatedb as can_create_db,
        usebypassrls as can_bypass_rls
      FROM pg_user
      WHERE usename = current_user
    `);
    
    const role = (Array.isArray(roleInfo) ? roleInfo[0] : null) as any;
    
    if (role) {
      console.log(`Role: ${role.role_name}`);
      console.log(`Superuser: ${role.is_superuser ? '✅ YES (bypasses RLS!)' : '❌ NO'}`);
      console.log(`Can bypass RLS: ${role.can_bypass_rls ? '✅ YES (bypasses RLS!)' : '❌ NO'}`);
      console.log(`Can create DB: ${role.can_create_db ? '✅ YES' : '❌ NO'}\n`);
      
      if (role.is_superuser || role.can_bypass_rls) {
        console.log('⚠️  CRITICAL ISSUE: Current role bypasses RLS!');
        console.log('   RLS policies will NOT be enforced for this connection.\n');
        console.log('💡 Solution: Use a non-superuser role for testing');
        console.log('   or revoke BYPASSRLS from the current role:\n');
        console.log('   ALTER ROLE unionadmin NOBYPASSRLS;');
      } else {
        console.log('✅ Role is not superuser and cannot bypass RLS');
        console.log('   RLS should be enforced.\n');
      }
    }
    
    // Check RLS status on messages table
    console.log('Checking messages table RLS status:');
    const tableRLS = await db.execute(sql`
      SELECT 
        tablename,
        rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = 'messages'
    `);
    
    const table = (Array.isArray(tableRLS) ? tableRLS[0] : null) as any;
    console.log(`  RLS enabled: ${table?.rowsecurity ? '✅ YES' : '❌ NO'}\n`);
    
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkRole();
