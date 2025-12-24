import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkTenants() {
  console.log('\n=== Checking Tenants Table ===\n');
  
  try {
    const tenants = await db.execute(sql`
      SELECT tenant_id, tenant_name, tenant_slug 
      FROM user_management.tenants 
      LIMIT 10
    `);
    
    console.log('Tenants:', JSON.stringify(tenants, null, 2));
    
    const organizations = await db.execute(sql`
      SELECT id, name, slug 
      FROM organizations 
      LIMIT 10
    `);
    
    console.log('\nOrganizations:', JSON.stringify(organizations, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTenants();
