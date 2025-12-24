import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function fixSchemaIssues() {
  console.log('\n=== Fixing Schema Issues ===\n');
  
  try {
    // 1. Check if user_management.tenant_users table exists
    console.log('1. Checking tenant_users table...');
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'user_management' 
        AND table_name = 'tenant_users'
      ) as exists
    `);
    
    const tenantUsersExists = tableCheck[0].exists;
    console.log(`   tenant_users exists: ${tenantUsersExists}`);
    
    if (tenantUsersExists) {
      // Show tenant_users structure
      const columns = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'user_management' AND table_name = 'tenant_users'
        ORDER BY ordinal_position
      `);
      console.log('\n   tenant_users columns:', columns.map((c: any) => `${c.column_name}(${c.data_type})`).join(', '));
      
      // Synchronize data to tenant_users
      console.log('\n2. Synchronizing organization_members to tenant_users...');
      
      const syncResult = await db.execute(sql`
        INSERT INTO user_management.tenant_users (
          tenant_id, 
          user_id, 
          role, 
          is_active, 
          joined_at, 
          created_at, 
          updated_at
        )
        SELECT 
          COALESCE(
            -- First try to match by organization slug to tenant_management.tenants
            (SELECT t.tenant_id FROM tenant_management.tenants t 
             JOIN organizations o ON o.slug = t.tenant_slug 
             WHERE o.slug = om.organization_id LIMIT 1),
            -- Then try to match if organization_id is already a UUID in tenants
            (SELECT tenant_id FROM tenant_management.tenants WHERE tenant_id::text = om.organization_id LIMIT 1)
          ) as tenant_id,
          om.user_id::varchar,
          COALESCE(om.role, 'member') as role,
          CASE WHEN om.status = 'active' THEN true ELSE false END as is_active,
          COALESCE(om.created_at, NOW()) as joined_at,
          om.created_at,
          om.updated_at
        FROM organization_members om
        WHERE NOT EXISTS (
          SELECT 1 FROM user_management.tenant_users tu 
          WHERE tu.user_id = om.user_id
        )
        AND EXISTS (
          -- Only insert if we can find a matching tenant
          SELECT 1 FROM tenant_management.tenants t
          JOIN organizations o ON o.slug = t.tenant_slug
          WHERE o.slug = om.organization_id
          OR t.tenant_id::text = om.organization_id
        )
        ON CONFLICT DO NOTHING
      `);
      
      console.log('   ✅ Synchronized organization_members to tenant_users');
    } else {
      console.log('   ⚠️  tenant_users table does not exist - will be created by drizzle-kit push');
    }
    
    // 3. Check organizations table for missing columns
    console.log('\n3. Checking organizations table columns...');
    const orgColumns = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'organizations' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log('   Organizations columns:', orgColumns.map((c: any) => c.column_name).join(', '));
    
    const hasLegalName = orgColumns.some((c: any) => c.column_name === 'legal_name');
    if (!hasLegalName) {
      console.log('\n   ⚠️  Missing "legal_name" column - adding it...');
      await db.execute(sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255)`);
      console.log('   ✅ Added legal_name column');
    }
    
    // 4. Check for v_critical_deadlines view
    console.log('\n4. Checking v_critical_deadlines view...');
    const viewCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_name = 'v_critical_deadlines'
      ) as exists
    `);
    
    if (!viewCheck[0].exists) {
      console.log('   ⚠️  v_critical_deadlines view does not exist');
      
      // Check if deadlines table exists first
      const deadlinesCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'deadlines' AND table_schema = 'public'
        ) as exists
      `);
      
      if (deadlinesCheck[0].exists) {
        console.log('   Creating view...');
        await db.execute(sql`
          CREATE OR REPLACE VIEW v_critical_deadlines AS
          SELECT 
            id,
            title,
            deadline_date,
            organization_id,
            created_at
          FROM deadlines
          WHERE deadline_date >= CURRENT_DATE
          AND deadline_date <= CURRENT_DATE + INTERVAL '30 days'
          ORDER BY deadline_date ASC
        `);
        console.log('   ✅ Created v_critical_deadlines view');
      } else {
        console.log('   ⚠️  Deadlines table does not exist - skipping view creation');
      }
    } else {
      console.log('   ✅ v_critical_deadlines view exists');
    }
    
    console.log('\n✅ Schema fixes complete!');
    console.log('🔄 Please restart the dev server for changes to take effect.');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  }
  process.exit(0);
}

fixSchemaIssues().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
