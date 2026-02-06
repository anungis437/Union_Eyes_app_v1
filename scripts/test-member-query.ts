import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function testQuery() {
  const tenantId = '903ab6db-7e36-4457-a41e-45b3c75374ca'; // UFCW Local 1006A
  
  console.log('\n🔍 Testing member count query for tenant:', tenantId);
  console.log('Organization: UFCW Local 1006A\n');
  
  // Test the exact query from the API
  const memberCountResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM organization_members
    WHERE organization_id = ${tenantId}
    AND deleted_at IS NULL
  `);
  
  console.log('Query result:', memberCountResult[0]);
  console.log('Count:', Number(memberCountResult[0]?.count || 0));
  
  // Also check what organization_id values exist
  console.log('\n📋 Sample organization_members records:\n');
  const samples = await db.execute(sql`
    SELECT organization_id, user_id, name, email
    FROM organization_members
    WHERE deleted_at IS NULL
    LIMIT 5
  `);
  
  samples.forEach((m: any) => {
    console.log(`  org_id: ${m.organization_id}`);
    console.log(`  name: ${m.name}`);
    console.log('');
  });
  
  process.exit(0);
}

testQuery().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
