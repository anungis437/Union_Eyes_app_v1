/**
 * Verify User Access to Organizations
 * 
 * This script checks that users have proper access to organizations
 * by querying the organization_members table.
 * 
 * Run: npx tsx scripts/verify-user-access.ts [userId]
 */

import { db } from '../db/db';
import { organizationMembers } from '../db/schema-organizations';
import { organizations } from '../db/schema-organizations';
import { eq, sql } from 'drizzle-orm';

async function verifyUserAccess(userId?: string) {
  console.log('🔍 Verifying User Access to Organizations\n');
  console.log('===========================================\n');

  if (userId) {
    // Check specific user
    console.log(`Checking access for user: ${userId}\n`);
    
    const memberships = await db
      .select({
        orgId: organizationMembers.organizationId,
        orgName: organizations.name,
        role: organizationMembers.role,
        status: organizationMembers.status,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .leftJoin(organizations, sql`${organizationMembers.organizationId}::uuid = ${organizations.id}`)
      .where(eq(organizationMembers.userId, userId));

    if (memberships.length === 0) {
      console.log('❌ No organization memberships found for this user!');
      console.log('\nThis user will not be able to access any data.');
      console.log('Run the seed script to create proper organization memberships.\n');
      return;
    }

    console.log(`✅ Found ${memberships.length} organization membership(s):\n`);
    
    memberships.forEach((membership, i) => {
      console.log(`${i + 1}. Organization: ${membership.orgName || membership.orgId}`);
      console.log(`   - Role: ${membership.role}`);
      console.log(`   - Status: ${membership.status}`);
      console.log(`   - Joined: ${membership.joinedAt}\n`);
    });
  } else {
    // Check all memberships
    console.log('Checking all organization memberships...\n');
    
    const allMemberships = await db
      .select({
        userId: organizationMembers.userId,
        orgId: organizationMembers.organizationId,
        orgName: organizations.name,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .leftJoin(organizations, sql`${organizationMembers.organizationId}::uuid = ${organizations.id}`)
      .limit(50);

    if (allMemberships.length === 0) {
      console.log('❌ No organization memberships found in database!');
      console.log('\nRun the seed script to populate organization memberships:\n');
      console.log('   npx tsx scripts/seed-full-platform.ts\n');
      return;
    }

    console.log(`✅ Found ${allMemberships.length} organization memberships (showing first 50):\n`);
    
    // Group by organization
    const byOrg = allMemberships.reduce((acc, m) => {
      const orgKey = m.orgName || m.orgId || 'unknown';
      if (!acc[orgKey]) acc[orgKey] = [];
      acc[orgKey].push(m);
      return acc;
    }, {} as Record<string, typeof allMemberships>);

    Object.entries(byOrg).forEach(([orgName, members]) => {
      console.log(`📊 ${orgName}: ${members.length} members`);
      const roleCounts = members.reduce((acc, m) => {
        acc[m.role] = (acc[m.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`   - ${role}: ${count}`);
      });
      console.log('');
    });
  }

  console.log('===========================================');
  console.log('✅ Verification complete\n');
}

// Run verification
const userId = process.argv[2];
verifyUserAccess(userId).catch(console.error);
