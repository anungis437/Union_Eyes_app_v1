/**
 * Add current logged-in user to organizations
 * This ensures the user can see and access organizations in the UI
 */

import { db } from '../db/db';
import { organizationMembers } from '../db/schema-organizations';
import { sql } from 'drizzle-orm';

// The user ID from the console logs
const CURRENT_USER_ID = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb';

async function addUserToOrganizations() {
  try {
    console.log(`\n👤 Adding user ${CURRENT_USER_ID} to organizations...\n`);
    
    // Get all organizations
    const orgs = await db.execute(sql`SELECT id, name, slug FROM organizations ORDER BY created_at LIMIT 5`);
    
    if (orgs.length === 0) {
      console.log('❌ No organizations found!');
      process.exit(1);
    }
    
    console.log(`📋 Found ${orgs.length} organizations\n`);
    
    // Check if user already has memberships
    const existing = await db.execute(sql`
      SELECT COUNT(*) FROM organization_members 
      WHERE user_id = ${CURRENT_USER_ID}
    `);
    
    if (Number(existing[0].count) > 0) {
      console.log(`ℹ️  User already has ${existing[0].count} memberships. Clearing...`);
      await db.execute(sql`DELETE FROM organization_members WHERE user_id = ${CURRENT_USER_ID}`);
    }
    
    let addedCount = 0;
    
    // Add user to first 3 organizations as admin
    for (let i = 0; i < Math.min(3, orgs.length); i++) {
      const org = orgs[i];
      
      await db.insert(organizationMembers).values({
        organizationId: org.slug as string, // TEXT slug
        tenantId: org.id as string, // UUID
        userId: CURRENT_USER_ID,
        name: 'Test Admin User',
        email: `testadmin.${i}@unioneyes.com`,
        phone: '555-123-4567',
        role: i === 0 ? 'admin' : 'officer', // First org as admin, others as officer
        status: 'active',
        isPrimary: i === 0, // First org is primary
        department: 'Administration',
        position: 'System Administrator',
        membershipNumber: `ADM${1000 + i}`,
        seniority: 5,
        unionJoinDate: new Date('2020-01-01'),
        preferredContactMethod: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      addedCount++;
      console.log(`  ✅ Added to "${org.name}" as ${i === 0 ? 'admin' : 'officer'}`);
    }
    
    // Verify memberships
    const final = await db.execute(sql`
      SELECT om.role, om.is_primary, o.name as org_name
      FROM organization_members om
      JOIN organizations o ON om.organization_id = o.id::text
      WHERE om.user_id = ${CURRENT_USER_ID}
      ORDER BY om.is_primary DESC, om.created_at
    `);
    
    console.log(`\n✅ Successfully added user to ${addedCount} organizations!\n`);
    console.log('📊 User Memberships:');
    final.forEach((row: any) => {
      console.log(`   ${row.is_primary ? '★' : ' '} ${row.org_name} - ${row.role.toUpperCase()}`);
    });
    
    console.log('\n🎉 User is now ready to use the application!');
    console.log('   Refresh the browser to see organizations.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addUserToOrganizations();
