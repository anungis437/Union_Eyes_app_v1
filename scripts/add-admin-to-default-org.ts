/**
 * Script to add admin users to the Default Organization
 * 
 * This ensures admin users can access the Default Organization which is used
 * as the fallback organization throughout the app.
 */

import { db } from '../db/db';
import { organizationMembers, organizations } from '../db/schema-organizations';
import { eq, and } from 'drizzle-orm';

const ADMIN_USERS = [
  {
    email: 'a_nungisa@yahoo.ca',
    userId: 'user_37vyDm8LHilksYNuVBcenvdktBW',
    name: 'Aristide Nungisa'
  },
  {
    email: 'michel@nungisalaw.ca',
    userId: 'user_37Zo7OrvP4jy0J0MU5APfkDtE2V',
    name: 'Michel Nungisa'
  }
];

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('\n🔍 Finding Default Organization...');
  
  // First, find the actual Default Organization in the database
  const defaultOrgs = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, 'Default Organization'));
  
  if (defaultOrgs.length === 0) {
    console.error('\n❌ Default Organization not found in database!');
    console.log('Available organizations:');
    const allOrgs = await db.select().from(organizations).limit(10);
    allOrgs.forEach(org => console.log(`  - ${org.name} (${org.id})`));
    process.exit(1);
  }
  
  const defaultOrg = defaultOrgs[0];
  console.log(`\n✅ Found: ${defaultOrg.name}`);
  console.log(`   ID: ${defaultOrg.id}`);
  console.log(`   Type: ${defaultOrg.organizationType}`);
  console.log(`   Slug: ${defaultOrg.slug || 'none'}`);
  
  console.log('\n👥 Adding admin users to Default Organization...\n');
  
  for (const user of ADMIN_USERS) {
    try {
      // Check if user already exists in this organization
      const existing = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, user.userId),
            eq(organizationMembers.organizationId, defaultOrg.id)
          )
        );
      
      if (existing.length > 0) {
        console.log(`⚠️  ${user.email} already in Default Organization`);
        console.log(`   Current role: ${existing[0].role}`);
        console.log(`   Status: ${existing[0].status}`);
        continue;
      }
      
      // Add user to Default Organization with admin role
      await db.insert(organizationMembers).values({
        tenantId: DEFAULT_TENANT_ID,
        organizationId: defaultOrg.id,
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: 'admin',
        status: 'active',
        joinedAt: new Date()
      });
      
      console.log(`✅ Added ${user.email} to Default Organization`);
      console.log(`   Role: admin`);
      console.log(`   Status: active`);
      
    } catch (error) {
      console.error(`\n❌ Error adding ${user.email}:`, error);
    }
  }
  
  console.log('\n📊 Final verification...\n');
  
  // Verify memberships
  for (const user of ADMIN_USERS) {
    const memberships = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.email, user.email));
    
    console.log(`${user.email}: ${memberships.length} organization(s)`);
    for (const membership of memberships) {
      const org = await db
        .select({ name: organizations.name, type: organizations.organizationType })
        .from(organizations)
        .where(eq(organizations.id, membership.organizationId));
      
      console.log(`  - ${org[0].name} (${org[0].type})`);
      console.log(`    Role: ${membership.role} | Status: ${membership.status}`);
    }
    console.log('');
  }
  
  console.log('✅ Complete!\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
