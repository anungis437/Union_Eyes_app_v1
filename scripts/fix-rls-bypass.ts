/**
 * Remove BYPASSRLS privilege from unionadmin role
 */

import { testDb as db } from '../db/test-db';
import { sql } from 'drizzle-orm';

async function removeBypassRLS() {
  console.log('🔧 Removing BYPASSRLS privilege from unionadmin...\n');
  
  try {
    // Remove BYPASSRLS
    await db.execute(sql`ALTER ROLE unionadmin NOBYPASSRLS`);
    
    console.log('✅ Successfully removed BYPASSRLS privilege\n');
    
    // Verify
    const roleInfo = await db.execute(sql`
      SELECT 
        current_user as role_name,
        usebypassrls as can_bypass_rls
      FROM pg_user
      WHERE usename = current_user
    `);
    
    const role = (Array.isArray(roleInfo) ? roleInfo[0] : null) as any;
    
    console.log(`Role: ${role?.role_name}`);
    console.log(`Can bypass RLS: ${role?.can_bypass_rls ? '❌ YES (still bypassing!)' : '✅ NO (RLS will be enforced)'}\n`);
    
    if (!role?.can_bypass_rls) {
      console.log('✨ RLS policies will now be enforced for this role!');
      console.log('   Tests should pass now.');
    }
    
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

removeBypassRLS();
