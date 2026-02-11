import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function makeSuperAdmin() {
  const email = 'info@nzilaventures.com';
  console.log(`\n=== Making ${email} a Super Admin ===\n`);
  
  try {
    // Check current Clerk user ID
    const clerkUsers = await db.execute(sql`
      SELECT id, email FROM profiles WHERE email = ${email}
    `);
    console.log('Clerk Users:', JSON.stringify(clerkUsers, null, 2));
    
    if (clerkUsers.length === 0) {
      console.log('\n❌ User not found in profiles table');
      
      // Get the actual Clerk user ID from organization_members
      const orgMembers = await db.execute(sql`
        SELECT DISTINCT user_id FROM organization_members 
        ORDER BY user_id
      `);
      console.log('\nAll organization_members user IDs:');
      console.log(JSON.stringify(orgMembers, null, 2));
      
      return;
    }
    
    const userId = clerkUsers[0].id as string;
    console.log(`\n✅ Found Clerk User ID: ${userId}`);
    
    // Update profiles table to set is_super_admin if column exists
    try {
      await db.execute(sql`
        UPDATE profiles 
        SET role = 'super_admin',
            updated_at = NOW()
        WHERE id = ${userId}
      `);
      console.log('✅ Updated profiles.role to super_admin');
    } catch (error: any) {
      console.log('ℹ️  Could not update profiles (column may not exist):', error.message);
    }
    
    // Update organization_members to make admin role
    await db.execute(sql`
      UPDATE organization_members 
      SET role = 'admin',
          status = 'active'
      WHERE user_id = ${userId}
    `);
    console.log('✅ Updated organization_members.role to admin');
    
    // Check if organization_users table exists and update it
    try {
      await db.execute(sql`
        INSERT INTO user_management.organization_users (organization_id, user_id, role, is_active, joined_at, created_at, updated_at)
        SELECT 
          o.id::uuid as organization_id,
          ${userId}::varchar as user_id,
          'admin' as role,
          true as is_active,
          NOW() as joined_at,
          NOW() as created_at,
          NOW() as updated_at
        FROM organizations o
        WHERE NOT EXISTS (
          SELECT 1 FROM user_management.organization_users tu 
          WHERE tu.user_id = ${userId} AND tu.organization_id = o.id
        )
      `);
      console.log('✅ Added user to organization_users with admin role');
    } catch (error: any) {
      if (error.code === '42P01') {
        console.log('ℹ️  organization_users table does not exist - skipping');
      } else if (error.code === '23505') {
        // Update existing records
        await db.execute(sql`
          UPDATE user_management.organization_users 
          SET role = 'admin', is_active = true, updated_at = NOW()
          WHERE user_id = ${userId}
        `);
        console.log('✅ Updated existing organization_users records');
      } else {
        throw error;
      }
    }
    
    // Verify the changes
    console.log('\n=== Verification ===');
    const verification = await db.execute(sql`
      SELECT 
        p.id,
        p.email,
        p.role as profile_role,
        om.role as org_member_role,
        om.organization_id
      FROM profiles p
      LEFT JOIN organization_members om ON om.user_id = p.id
      WHERE p.email = ${email}
    `);
    console.log(JSON.stringify(verification, null, 2));
    
    console.log('\n✅ Super admin privileges granted successfully!');
    console.log('🔄 Please refresh your browser to see the changes.');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
  
  process.exit(0);
}

makeSuperAdmin().catch(console.error);
