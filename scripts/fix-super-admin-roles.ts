import { db } from '../db/db';
import { organizationMembers } from '../db/schema-organizations';
import { eq, and } from 'drizzle-orm';

const DEFAULT_ORG_ID = '458a56cb-251a-4c91-a0b5-81bb8ac39087';

const SUPER_ADMINS = [
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

async function fixSuperAdminRoles() {
  console.log('🔧 Fixing super admin roles in Default Organization...\n');

  for (const admin of SUPER_ADMINS) {
    console.log(`Updating ${admin.name} (${admin.email})...`);
    
    const result = await db
      .update(organizationMembers)
      .set({
        role: 'super_admin',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(organizationMembers.userId, admin.userId),
          eq(organizationMembers.organizationId, DEFAULT_ORG_ID)
        )
      );

    console.log(`  ✓ Updated to super_admin\n`);
  }

  // Verify the changes
  console.log('📋 Verifying super admin roles:\n');
  
  for (const admin of SUPER_ADMINS) {
    const [membership] = await db
      .select({
        name: organizationMembers.name,
        email: organizationMembers.email,
        role: organizationMembers.role,
        status: organizationMembers.status
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, admin.userId),
          eq(organizationMembers.organizationId, DEFAULT_ORG_ID)
        )
      )
      .limit(1);

    if (membership) {
      console.log(`${membership.name} (${membership.email})`);
      console.log(`  Role: ${membership.role}`);
      console.log(`  Status: ${membership.status}\n`);
    }
  }

  console.log('✅ Super admin roles fixed!\n');
  console.log('🚀 Next steps:');
  console.log('   1. Hard refresh browser (Ctrl+Shift+R)');
  console.log('   2. Admin navigation should now be visible');
  console.log('   3. Admin API endpoints should return 200 instead of 403\n');
}

fixSuperAdminRoles()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
