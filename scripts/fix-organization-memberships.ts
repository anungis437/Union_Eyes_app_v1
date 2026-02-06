/**
 * Fix Organization Memberships
 * 
 * This script diagnoses and fixes orphaned organization memberships
 * by ensuring all memberships have valid organization references.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { organizations, organizationMembers } from '../db/schema-organizations';
import { eq } from 'drizzle-orm';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create database connection
const pool = new Pool({
  connectionString: databaseUrl,
});

const db = drizzle(pool);

async function fixOrganizationMemberships() {
  console.log('🔍 Starting organization membership audit...\n');

  try {
    // Step 1: Get all memberships
    console.log('📊 Fetching all organization memberships...');
    const allMemberships = await db
      .select()
      .from(organizationMembers);

    console.log(`Found ${allMemberships.length} total memberships\n`);

    // Step 2: Get all valid organization IDs
    console.log('📊 Fetching all organizations...');
    const allOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        type: organizations.organizationType,
        legacyTenantId: organizations.legacyTenantId,
      })
      .from(organizations);

    console.log(`Found ${allOrgs.length} organizations\n`);

    const validOrgIds = new Set(allOrgs.map(org => org.id));

    // Step 3: Find orphaned memberships
    console.log('🔍 Checking for orphaned memberships...');
    const orphanedMemberships = allMemberships.filter(
      membership => !validOrgIds.has(membership.organizationId)
    );

    if (orphanedMemberships.length === 0) {
      console.log('✅ No orphaned memberships found! All memberships reference valid organizations.');
      
      // Show summary of valid memberships
      console.log('\n📊 MEMBERSHIP SUMMARY:');
      const membershipsByOrg = allMemberships.reduce((acc, m) => {
        acc[m.organizationId] = (acc[m.organizationId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      for (const [orgId, count] of Object.entries(membershipsByOrg)) {
        const org = allOrgs.find(o => o.id === orgId);
        if (org) {
          console.log(`  ${org.name} (${org.slug}): ${count} members`);
        }
      }
      
      return;
    }

    console.log(`\n⚠️  Found ${orphanedMemberships.length} orphaned memberships:`);
    console.log('─'.repeat(80));

    // Group orphaned memberships by organizationId
    const orphanedByOrgId = orphanedMemberships.reduce((acc, membership) => {
      const orgId = membership.organizationId;
      if (!acc[orgId]) {
        acc[orgId] = [];
      }
      acc[orgId].push(membership);
      return acc;
    }, {} as Record<string, typeof orphanedMemberships>);

    for (const [orgId, memberships] of Object.entries(orphanedByOrgId)) {
      console.log(`\n📌 Missing Organization ID: ${orgId}`);
      console.log(`   Affected memberships: ${memberships.length}`);
      console.log(`   User IDs: ${memberships.map(m => m.userId).join(', ')}`);
      
      // Check if there's a tenantId we can use
      const tenantIds = memberships
        .map(m => m.tenantId)
        .filter(id => id !== null);
      
      if (tenantIds.length > 0) {
        const uniqueTenantIds = Array.from(new Set(tenantIds));
        console.log(`   Legacy tenant IDs: ${uniqueTenantIds.join(', ')}`);
      }
    }

    console.log('\n' + '─'.repeat(80));
    console.log('\n🔧 RECOMMENDED ACTIONS:\n');

    console.log('Option 1: Create missing organizations');
    console.log('  - If these organizations should exist, create them in the database');
    console.log('  - Use the organization IDs above as the new organization.id values\n');

    console.log('Option 2: Delete orphaned memberships');
    console.log('  - If these are truly invalid, delete them:');
    console.log('  - DELETE FROM organization_members WHERE organization_id IN (...);\n');

    console.log('Option 3: Map to existing organizations');
    console.log('  - If there are equivalent organizations, update the organizationId:');
    console.log('  - UPDATE organization_members SET organization_id = ? WHERE organization_id = ?;\n');

    // Check if we can auto-fix by looking at legacy tenant IDs
    console.log('📊 Checking if we can auto-fix using legacy tenant IDs...\n');

    for (const [orgId, memberships] of Object.entries(orphanedByOrgId)) {
      const tenantIds = memberships
        .map(m => m.tenantId)
        .filter(id => id !== null);
      const uniqueTenantIds = Array.from(new Set(tenantIds));

      if (uniqueTenantIds.length === 1) {
        const tenantId = uniqueTenantIds[0];
        
        // Check if an organization exists with this legacy tenant ID
        const [orgWithTenantId] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.legacyTenantId, tenantId!))
          .limit(1);

        if (orgWithTenantId) {
          console.log(`✅ Auto-fix available for organization ID ${orgId}:`);
          console.log(`   → Can map to organization: ${orgWithTenantId.name} (${orgWithTenantId.id})`);
          console.log(`   → This would fix ${memberships.length} memberships`);
          console.log(`   → Command: UPDATE organization_members SET organization_id = '${orgWithTenantId.id}' WHERE organization_id = '${orgId}';\n`);
        }
      }
    }

    // Detailed breakdown
    console.log('\n📋 DETAILED BREAKDOWN:\n');
    console.log('Valid Organizations:');
    allOrgs.slice(0, 10).forEach(org => {
      console.log(`  - ${org.name} (${org.slug}) [${org.type}] - ID: ${org.id}`);
    });
    if (allOrgs.length > 10) {
      console.log(`  ... and ${allOrgs.length - 10} more`);
    }

    console.log('\n⚠️  To proceed with fixes, uncomment the appropriate section in this script.\n');

  } catch (error) {
    console.error('❌ Error during membership audit:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
fixOrganizationMemberships()
  .then(() => {
    console.log('✅ Membership audit complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
