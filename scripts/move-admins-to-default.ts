/**
 * Move admin users from Master Admin to Default Organization
 */

import { db } from '../db/db';
import { organizations, organizationMembers } from '../db/schema-organizations';
import { eq } from 'drizzle-orm';

const ADMINS = [
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

async function main() {
  console.log('\n=== MOVING ADMINS TO DEFAULT ORGANIZATION ===\n');
  
  // Find Default Organization
  const [defaultOrg] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, 'Default Organization'));
  
  if (!defaultOrg) {
    console.error('❌ Default Organization not found!');
    process.exit(1);
  }
  
  console.log('Target Organization:', defaultOrg.name);
  console.log('ID:', defaultOrg.id);
  console.log('Type:', defaultOrg.organizationType);
  console.log('Slug:', defaultOrg.slug);
  
  console.log('\n📋 Updating memberships...\n');
  
  for (const admin of ADMINS) {
    // Delete existing membership
    await db
      .delete(organizationMembers)
      .where(eq(organizationMembers.email, admin.email));
    
    console.log(`  ✓ Deleted old membership for ${admin.email}`);
    
    // Add to Default Organization
    await db.insert(organizationMembers).values({
      tenantId: defaultOrg.id,
      organizationId: defaultOrg.id,
      userId: admin.userId,
      email: admin.email,
      name: admin.name,
      role: 'super_admin',  // Changed from 'admin' to 'super_admin'
      status: 'active',
      joinedAt: new Date()
    });
    
    console.log(`  ✓ Added ${admin.email} to Default Organization as super_admin`);
  }
  
  console.log('\n✅ Migration complete!\n');
  console.log('DEFAULT_ORGANIZATION_ID should be:', defaultOrg.id);
  
  process.exit(0);
}

main().catch((error) => {
  console.error('\n💥 Error:', error);
  process.exit(1);
});
