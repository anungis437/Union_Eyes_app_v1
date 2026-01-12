/**
 * Setup Master Admin Organization
 * Ensures specified admin users are part of the master admin organization
 * Run with: pnpm exec tsx scripts/setup-master-admin-org.ts
 */

import { db } from "@/db/db";
import { organizations, organizationMembers, profiles } from "@/db/schema";
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const ADMIN_EMAILS = [
  'a_nungisa@yahoo.ca',
  'michel@nungisalaw.ca'
];

async function setupMasterAdminOrg() {
  try {
    console.log('🔧 Setting up Master Admin Organization...\n');

    // Step 1: Get or create master admin organization
    console.log('Step 1: Checking for master admin organization...');
    let [masterOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, 'master-admin'))
      .limit(1);

    if (!masterOrg) {
      console.log('  Creating master admin organization...');
      const orgId = uuidv4();
      await db.insert(organizations).values({
        id: orgId,
        name: 'Master Admin',
        slug: 'master-admin',
        organizationType: 'congress', // Top-level organization type
        hierarchyPath: ['master-admin'],
        hierarchyLevel: 0,
        adminEmail: ADMIN_EMAILS[0],
        settings: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      [masterOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      
      console.log(`  ✅ Created organization: ${masterOrg.name} (${masterOrg.id})\n`);
    } else {
      console.log(`  ✅ Found existing organization: ${masterOrg.name} (${masterOrg.id})\n`);
    }

    // Step 2: Process each admin user
    for (const email of ADMIN_EMAILS) {
      console.log(`Step 2: Processing ${email}...`);
      
      // Get Clerk user
      const users = await clerkClient.users.getUserList({
        emailAddress: [email]
      });

      if (users.data.length === 0) {
        console.log(`  ❌ User not found in Clerk: ${email}\n`);
        continue;
      }

      const clerkUser = users.data[0];
      console.log(`  ✅ Found in Clerk: ${clerkUser.id}`);

      // Get or create profile
      let [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, clerkUser.id))
        .limit(1);

      if (!profile) {
        console.log('  Creating profile...');
        const firstName = clerkUser.firstName || email.split('@')[0].split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        const lastName = clerkUser.lastName || '';
        
        await db.insert(profiles).values({
          userId: clerkUser.id,
          email: email,
          membership: 'pro',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        [profile] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, clerkUser.id))
          .limit(1);
        
        console.log(`  ✅ Created profile: ${profile.userId}`);
      } else {
        console.log(`  ✅ Found profile: ${profile.userId}`);
      }

      // Check if already a member
      const [existingMember] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, masterOrg.id),
            eq(organizationMembers.userId, profile.userId)
          )
        )
        .limit(1);

      if (existingMember) {
        console.log(`  ✅ Already a member with role: ${existingMember.role}`);
        
        // Update to admin if not already
        if (existingMember.role !== 'admin') {
          await db
            .update(organizationMembers)
            .set({ role: 'admin' })
            .where(eq(organizationMembers.id, existingMember.id));
          console.log(`  ✅ Updated role to: admin`);
        }
      } else {
        console.log('  Adding to organization...');
        const firstName = clerkUser.firstName || email.split('@')[0];
        const lastName = clerkUser.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        await db.insert(organizationMembers).values({
          id: uuidv4(),
          tenantId: '00000000-0000-0000-0000-000000000001',  // Use default tenant ID
          organizationId: masterOrg.id,
          userId: profile.userId,
          name: fullName || email,
          email: email,
          role: 'admin',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`  ✅ Added as admin`);
      }
      
      console.log('');
    }

    // Step 3: Summary
    console.log('📊 Summary:');
    const members = await db
      .select({
        name: organizationMembers.name,
        email: organizationMembers.email,
        role: organizationMembers.role,
        createdAt: organizationMembers.createdAt
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, masterOrg.id));

    console.log(`\n   Organization: ${masterOrg.name} (${masterOrg.id})`);
    console.log(`   Total Members: ${members.length}\n`);
    
    members.forEach(member => {
      console.log(`   • ${member.email} (${member.name}) - ${member.role} (added ${new Date(member.createdAt).toLocaleDateString()})`);
    });

    console.log('\n✨ Master admin organization setup complete!\n');

  } catch (error) {
    console.error('❌ Error setting up organization:', error);
    throw error;
  }
}

// Run the setup
setupMasterAdminOrg()
  .then(() => {
    console.log('✅ Setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
