import { db } from "../db";
import { sql } from "drizzle-orm";

async function checkTenantUserMapping() {
  const userId = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb';
  const targetTenantId = '903ab6db-7e36-4457-a41e-45b3c75374ca';

  console.log(`\n🔍 Checking tenant_users mapping for user: ${userId}`);
  console.log(`🎯 Target tenant: ${targetTenantId}\n`);

  // Check tenant_users table
  const tenantUsersResult = await db.execute(sql`
    SELECT tenant_id, user_id, role, created_at
    FROM user_management.tenant_users
    WHERE user_id = ${userId}
    ORDER BY created_at
  `);

  console.log(`📊 Found ${tenantUsersResult.length} tenant_users records:\n`);
  tenantUsersResult.forEach((row: any) => {
    const isTarget = row.tenant_id === targetTenantId;
    console.log(`  ${isTarget ? '✅' : '  '} tenant_id: ${row.tenant_id}`);
    console.log(`     role: ${row.role}`);
    console.log(`     created_at: ${row.created_at}\n`);
  });

  // Check organization_members table
  const orgMembersResult = await db.execute(sql`
    SELECT organization_id, user_id, role, email
    FROM organization_members
    WHERE user_id = ${userId}
    ORDER BY organization_id
  `);

  console.log(`\n📊 Found ${orgMembersResult.length} organization_members records:\n`);
  orgMembersResult.forEach((row: any) => {
    const isTarget = row.organization_id === targetTenantId;
    console.log(`  ${isTarget ? '✅' : '  '} organization_id: ${row.organization_id}`);
    console.log(`     email: ${row.email}`);
    console.log(`     role: ${row.role}\n`);
  });

  // Check if target tenant exists in tenants table
  const tenantResult = await db.execute(sql`
    SELECT id, slug, name
    FROM organizations
    WHERE id = ${targetTenantId}
  `);

  console.log(`\n🏢 Target tenant in tenants table:`);
  if (tenantResult.length > 0) {
    console.log(`  ✅ Found: ${tenantResult[0].name} (${tenantResult[0].slug})`);
  } else {
    console.log(`  ❌ NOT FOUND`);
  }

  process.exit(0);
}

checkTenantUserMapping().catch(console.error);
