import { db } from '../db/index';
import { sql } from 'drizzle-orm';

async function verifyTenantMappings() {
  try {
    // Check orgs without tenants
    const missing = await db.execute(sql`
      SELECT COUNT(*) FROM organizations o
      WHERE NOT EXISTS (
        SELECT 1 FROM tenant_management.tenants t WHERE t.tenant_id = o.id
      )
    `);
    
    console.log('Organizations without tenants:', missing[0].count);
    
    // Total counts
    const orgCount = await db.execute(sql`SELECT COUNT(*) FROM organizations`);
    const tenantCount = await db.execute(sql`SELECT COUNT(*) FROM tenant_management.tenants`);
    
    console.log('\n📊 Summary:');
    console.log(`   Organizations: ${orgCount[0].count}`);
    console.log(`   Tenants: ${tenantCount[0].count}`);
    
    if (missing[0].count === '0' || missing[0].count === 0) {
      console.log('\n✅ All organizations have tenant records!');
    } else {
      console.log('\n⚠️ Some organizations still missing tenant records');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyTenantMappings();
