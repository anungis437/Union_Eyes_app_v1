/**
 * Add super admin user to all organizations
 * Email: info@nzilaventures.com
 */

import { db } from '../db/db';
import { organizationMembers } from '../db/schema-organizations';
import { sql } from 'drizzle-orm';

// Super admin user - you'll need to get the actual Clerk user_id
// You can find this by logging in as info@nzilaventures.com and checking the console
const SUPER_ADMIN_EMAIL = 'info@nzilaventures.com';

async function addSuperAdmin() {
  try {
    console.log(`\n🔑 Setting up super admin: ${SUPER_ADMIN_EMAIL}\n`);
    
    // Check for environment variable or use current logged-in user
    let userId = process.env.SUPER_ADMIN_USER_ID || '';
    
    if (!userId) {
      // Try to find the most recent Clerk user (likely the logged-in one)
      console.log(`ℹ️  No SUPER_ADMIN_USER_ID provided, checking for logged-in user...`);
      const recentUsers = await db.execute(sql`
        SELECT DISTINCT user_id 
        FROM organization_members 
        WHERE user_id LIKE 'user_%'
        ORDER BY user_id DESC
        LIMIT 5
      `);
      
      if (recentUsers.length > 0) {
        console.log(`\n📋 Found recent users:`);
        recentUsers.forEach((u: any, i: number) => {
          console.log(`   ${i + 1}. ${u.user_id}`);
        });
        
        // Use the first one that looks like a Clerk ID (longer format)
        const clerkUser = recentUsers.find((u: any) => u.user_id.length > 20);
        if (clerkUser) {
          userId = clerkUser.user_id as string;
          console.log(`\n✅ Using existing Clerk user: ${userId}`);
          console.log(`   (If this is wrong, set $env:SUPER_ADMIN_USER_ID="user_xxx" and re-run)\n`);
        }
      }
    } else {
      console.log(`✅ Using provided user_id: ${userId}\n`);
    }
    
    if (!userId) {
      console.log(`❌ Could not determine user_id.`);
      console.log(`\nPlease provide the Clerk user_id for ${SUPER_ADMIN_EMAIL}:`);
      console.log(`   1. Log in as ${SUPER_ADMIN_EMAIL}`);
      console.log(`   2. Open browser console`);
      console.log(`   3. Look for user_id (starts with "user_")`);
      console.log(`\nThen run:`);
      console.log(`   $env:SUPER_ADMIN_USER_ID="user_xxxx"; npx tsx scripts/add-super-admin.ts\n`);
      process.exit(1);
    }
    
    // Clear existing memberships for this user
    const existing = await db.execute(sql`
      SELECT COUNT(*) as count FROM organization_members WHERE user_id = ${userId}
    `);
    
    if (Number(existing[0].count) > 0) {
      console.log(`ℹ️  User has ${existing[0].count} existing memberships. Clearing...`);
      await db.execute(sql`DELETE FROM organization_members WHERE user_id = ${userId}`);
    }
    
    // Get all organizations
    const orgs = await db.execute(sql`
      SELECT id, name, slug 
      FROM organizations 
      ORDER BY created_at
    `);
    
    console.log(`📋 Found ${orgs.length} organizations\n`);
    
    let addedCount = 0;
    const timestamp = Date.now();
    
    // Add user to ALL organizations as admin
    for (const org of orgs) {
      // Use unique email per org with timestamp to avoid constraint violation
      const uniqueEmail = `super.admin.${org.slug}.${timestamp}@nzilaventures.com`;
      
      await db.insert(organizationMembers).values({
        organizationId: org.slug as string, // TEXT slug
        tenantId: org.id as string, // UUID
        userId: userId,
        name: 'Super Admin',
        email: uniqueEmail,
        phone: '555-000-0000',
        role: 'admin',
        status: 'active',
        isPrimary: addedCount === 0, // First org is primary
        department: 'Administration',
        position: 'Super Administrator',
        membershipNumber: `SUPER${1000 + addedCount}`,
        seniority: 10,
        unionJoinDate: new Date('2020-01-01'),
        preferredContactMethod: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      addedCount++;
      console.log(`  ✅ Added as ADMIN to "${org.name}"`);
    }
    
    // Verify
    const memberships = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM organization_members
      WHERE user_id = ${userId} AND role = 'admin'
    `);
    
    console.log(`\n✅ Successfully added super admin to ${addedCount} organizations!`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`   Role: ADMIN on all ${memberships[0].count} organizations\n`);
    console.log(`🎉 Super admin setup complete!`);
    console.log(`   Refresh the browser to see all organizations.\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addSuperAdmin();
