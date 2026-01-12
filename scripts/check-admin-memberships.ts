/**
 * Check Organization Memberships for Admin Users
 * This script verifies that admin users are properly set up in organizationMembers table
 */

import { db } from '../db/db';
import { organizationMembers, organizations } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

async function checkAdminMemberships() {
  try {
    console.log('🔍 Checking admin user organization memberships...\n');

    const adminEmails = ['a_nungisa@yahoo.ca', 'michel@nungisalaw.ca'];

    for (const email of adminEmails) {
      console.log(`\n📧 Checking ${email}:`);
      
      // Check organizationMembers table
      const members = await db.select().from(organizationMembers).where(eq(organizationMembers.email, email));
      
      if (members.length === 0) {
        console.log(`   ❌ No organization memberships found`);
      } else {
        for (const member of members) {
          console.log(`   ✅ Member of organization: ${member.organizationId}`);
          console.log(`      Role: ${member.role}`);
          console.log(`      Status: ${member.status}`);
          console.log(`      Tenant ID: ${member.tenantId}`);
          console.log(`      User ID: ${member.userId}`);
          
          // Get organization details
          const [org] = await db.select()
            .from(organizations)
            .where(eq(organizations.id, member.organizationId))
            .limit(1);
          
          if (org) {
            console.log(`      Org Name: ${org.name}`);
            console.log(`      Org Type: ${org.organizationType || 'N/A'}`);
          }
        }
      }
    }

    console.log('\n\n📊 All organizations:');
    const allOrgs = await db.select().from(organizations).limit(10);
    for (const org of allOrgs) {
      console.log(`   - ${org.name} (${org.id})`);
      console.log(`     Type: ${org.organizationType || 'N/A'}`);
      console.log(`     Slug: ${org.slug || 'N/A'}`);
      
      // Count members
      const memberCount = await db.select({ count: sql<number>`count(*)` })
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, org.id));
      
      console.log(`     Members: ${memberCount[0]?.count || 0}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

checkAdminMemberships();
