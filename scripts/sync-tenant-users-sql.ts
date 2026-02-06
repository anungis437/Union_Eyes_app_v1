import { db } from "../db";
import { sql } from "drizzle-orm";

async function syncDirectSQL() {
  console.log('🔄 Syncing organization_members to tenant_users using raw SQL...\n');

  // Insert all organization_members into tenant_users where they don't exist
  const result = await db.execute(sql`
    INSERT INTO user_management.tenant_users (tenant_id, user_id, role, is_active, joined_at, created_at, updated_at)
    SELECT 
      om.organization_id::uuid,
      om.user_id,
      om.role,
      true,
      NOW(),
      NOW(),
      NOW()
    FROM organization_members om
    WHERE om.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM user_management.tenant_users tu 
      WHERE tu.tenant_id::text = om.organization_id 
      AND tu.user_id = om.user_id
    )
    ON CONFLICT DO NOTHING
  `);

  console.log(`✅ Inserted ${result.count} new tenant_users records`);

  // Show updated count for our user
  const userCount = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM user_management.tenant_users
    WHERE user_id = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb'
  `);

  console.log(`📊 User now has ${userCount[0].count} tenant_users entries`);

  process.exit(0);
}

syncDirectSQL().catch(console.error);
