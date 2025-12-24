import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkAndFix() {
  console.log('\n=== Checking User and Database State ===\n');
  
  try {
    // 1. Check profiles table structure
    console.log('1. Checking profiles table...');
    const profiles = await db.execute(sql`SELECT * FROM profiles LIMIT 1`);
    console.log('Profiles columns:', profiles.length > 0 ? Object.keys(profiles[0]) : 'NO DATA');
    
    // 2. Find info@nzilaventures.com
    const userSearch = await db.execute(sql`
      SELECT user_id, email, role, is_system_admin FROM profiles WHERE email = 'info@nzilaventures.com'
    `);
    
    if (userSearch.length > 0) {
      const userId = userSearch[0].user_id;
      console.log(`\n✅ Found user: ${userSearch[0].email} (ID: ${userId})`);
      console.log(`   Current role: ${userSearch[0].role}`);
      console.log(`   is_system_admin: ${userSearch[0].is_system_admin}`);
      
      // 3. Update role to super_admin and set is_system_admin
      await db.execute(sql`
        UPDATE profiles 
        SET role = 'super_admin', is_system_admin = true 
        WHERE user_id = ${userId}
      `);
      console.log('\n✅ Updated profile role to super_admin and is_system_admin = true');
      
      // 4. Check organization_members
      const orgMembers = await db.execute(sql`
        SELECT organization_id, role, status FROM organization_members WHERE user_id = ${userId}
      `);
      console.log('\nOrganization Memberships:', JSON.stringify(orgMembers, null, 2));
      
      // 5. Update organization_members to admin
      await db.execute(sql`
        UPDATE organization_members SET role = 'admin', status = 'active' WHERE user_id = ${userId}
      `);
      console.log('✅ Updated organization_members role to admin');
      
      // 6. Verify changes
      const verification = await db.execute(sql`
        SELECT user_id, email, role, is_system_admin FROM profiles WHERE user_id = ${userId}
      `);
      console.log('\n=== Verification ===');
      console.log(JSON.stringify(verification, null, 2));
      
    } else {
      console.log('\n❌ User info@nzilaventures.com NOT FOUND in profiles table');
      
      // Show all users
      const allUsers = await db.execute(sql`SELECT user_id, email, role FROM profiles`);
      console.log('\nAll users in profiles:');
      allUsers.forEach((u: any) => console.log(`  - ${u.email} (${u.user_id}) - role: ${u.role}`));
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

checkAndFix().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
