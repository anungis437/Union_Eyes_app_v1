/**
 * Create tenants table and populate from organizations
 * This aligns tenantId with organizationId
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🔧 Creating tenants table and syncing with organizations...\n');
  
  // Create schema if it doesn't exist
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS tenant_management`);
  
  // Create tenants table in tenant_management schema if it doesn't exist
  console.log('📋 Creating tenants table in tenant_management schema...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tenant_management.tenants (
      tenant_id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  console.log('  ✅ Tenants table created');
  
  // Get all organizations with slug
  const orgs = await db.execute(sql`SELECT id, slug, name FROM organizations`);
  console.log(`\n📋 Found ${orgs.length} organizations`);
  
  // Insert tenants from organizations
  console.log('\n🔄 Syncing organizations to tenants...');
  let syncedCount = 0;
  
  for (const org of orgs) {
    try {
      await db.execute(sql`
        INSERT INTO tenant_management.tenants (
          tenant_id, 
          tenant_slug, 
          tenant_name, 
          subscription_tier, 
          status
        )
        VALUES (
          ${org.id}, 
          ${org.slug || (org.id as string).substring(0, 8)}, 
          ${org.name},
          'free',
          'active'
        )
        ON CONFLICT (tenant_id) DO UPDATE SET
          tenant_name = EXCLUDED.tenant_name,
          updated_at = NOW();
      `);
      syncedCount++;
    } catch (e: unknown) {
      // Skip if there's a constraint violation (tenant already exists with that slug)
      if (e.code !== '23505') {
        throw e;
      }
    }
  }
  console.log(`  ✅ Synced ${syncedCount} tenants`);
  
  // Verify count
  const tenantCount = await db.execute(sql`SELECT COUNT(*) as count FROM tenant_management.tenants`);
  console.log(`\n✅ Total tenants in database: ${tenantCount[0].count}`);
  
  console.log('\n========================================================');
  console.log('✅ Tenants table setup complete!');
  console.log('   Now you can seed data using organizationId as tenantId\n');
  
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
