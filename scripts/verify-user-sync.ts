import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function verifyUserSync() {
  console.log('\n=== Verifying User Sync ===\n');
  
  try {
    const userId = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb';
    const email = 'info@nzilaventures.com';
    
    // Check profiles
    console.log('1. Checking profiles table...');
    const profile = await db.execute(sql`
      SELECT user_id, email, role, is_system_admin 
      FROM profiles 
      WHERE email = ${email}
    `);
    console.log('Profile:', JSON.stringify(profile, null, 2));
    
    // Check organization_members
    console.log('\n2. Checking organization_members...');
    const orgMembers = await db.execute(sql`
      SELECT organization_id, role, status 
      FROM organization_members 
      WHERE user_id = ${userId}
    `);
    console.log('Organization Memberships:', JSON.stringify(orgMembers, null, 2));
    
    // Check tenant_users
    console.log('\n3. Checking tenant_users...');
    const tenantUsers = await db.execute(sql`
      SELECT 
        tu.tenant_user_id, 
        tu.tenant_id, 
        tu.user_id, 
        tu.role,
        tu.is_active,
        t.tenant_name,
        t.tenant_slug
      FROM user_management.tenant_users tu
      LEFT JOIN tenant_management.tenants t ON t.tenant_id = tu.tenant_id
      WHERE tu.user_id = ${userId}
    `);
    console.log('Tenant Users:', JSON.stringify(tenantUsers, null, 2));
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

verifyUserSync();
