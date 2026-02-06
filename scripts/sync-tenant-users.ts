import { db } from "../db";
import { tenantUsers } from "../db/schema/user-management-schema";
import { organizationMembers } from "../db/schema/organization-members-schema";
import { eq, and, sql } from "drizzle-orm";

async function syncTenantUsers() {
  console.log('🔄 Syncing organization_members to tenant_users...\n');

  // Get all organization members
  const members = await db
    .select({
      organizationId: organizationMembers.organizationId,
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      email: organizationMembers.email,
    })
    .from(organizationMembers)
    .where(sql`${organizationMembers.deletedAt} IS NULL`);

  console.log(`📊 Found ${members.length} organization members`);

  let added = 0;
  let existing = 0;

  for (const member of members) {
    // Check if tenant_user already exists
    const existingTenantUser = await db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, member.organizationId),
          eq(tenantUsers.userId, member.userId)
        )
      )
      .limit(1);

    if (existingTenantUser.length === 0) {
      // Add to tenant_users
      await db.insert(tenantUsers).values({
        tenantId: member.organizationId,
        userId: member.userId,
        role: member.role,
        isActive: true,
        joinedAt: new Date(),
      });
      added++;
      console.log(`  ✅ Added: ${member.email} → ${member.organizationId}`);
    } else {
      existing++;
    }
  }

  console.log(`\n✅ Sync complete!`);
  console.log(`   Added: ${added}`);
  console.log(`   Already existed: ${existing}`);
  console.log(`   Total: ${added + existing}`);

  process.exit(0);
}

syncTenantUsers().catch(console.error);
