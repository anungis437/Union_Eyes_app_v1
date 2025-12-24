import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkData() {
  console.log('\n🔍 Checking membership data format...\n');
  
  // Check sample memberships
  const memberships = await db.execute(sql`
    SELECT organization_id, user_id, email 
    FROM organization_members 
    WHERE user_id = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb' 
    LIMIT 5
  `);
  
  console.log('Sample memberships for user_35NlrrNcfTv0DMh2kzBHyXZRtpb:');
  memberships.forEach((m: any) => {
    console.log(`  organization_id: ${m.organization_id} (type: ${typeof m.organization_id})`);
  });
  
  // Check sample organizations
  const orgs = await db.execute(sql`
    SELECT id, slug, name 
    FROM organizations 
    LIMIT 5
  `);
  
  console.log('\nSample organizations:');
  orgs.forEach((o: any) => {
    console.log(`  id: ${o.id}, slug: ${o.slug}, name: ${o.name}`);
  });
  
  // Check if any organization IDs match membership organization_ids
  const firstMembershipOrgId = (memberships[0] as any)?.organization_id;
  if (firstMembershipOrgId) {
    console.log(`\n🔍 Looking for organization with id = '${firstMembershipOrgId}'`);
    
    const byId = await db.execute(sql`
      SELECT id, slug, name 
      FROM organizations 
      WHERE id::text = ${firstMembershipOrgId}
      LIMIT 1
    `);
    
    console.log('Match by ID::text:', byId.length > 0 ? byId[0] : 'NOT FOUND');
    
    const bySlug = await db.execute(sql`
      SELECT id, slug, name 
      FROM organizations 
      WHERE slug = ${firstMembershipOrgId}
      LIMIT 1
    `);
    
    console.log('Match by slug:', bySlug.length > 0 ? bySlug[0] : 'NOT FOUND');
  }
  
  process.exit(0);
}

checkData().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
