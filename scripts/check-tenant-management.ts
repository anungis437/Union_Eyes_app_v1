import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkTenantManagement() {
  console.log('\n=== Checking tenant_management.tenants ===\n');
  
  try {
    const tenants = await db.execute(sql`
      SELECT tenant_id, tenant_name, tenant_slug 
      FROM tenant_management.tenants 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('Tenants:', JSON.stringify(tenants, null, 2));
    
    const organizations = await db.execute(sql`
      SELECT id, name, slug, organization_type
      FROM organizations 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\nOrganizations:', JSON.stringify(organizations, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTenantManagement();
