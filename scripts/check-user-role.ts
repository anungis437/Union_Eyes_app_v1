import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkUser() {
  console.log('\n=== Checking User: info@nzilaventures.com ===\n');
  
  // Check profiles table
  const profiles = await db.execute(sql`
    SELECT id, email, role, is_super_admin, created_at 
    FROM profiles 
    WHERE email = 'info@nzilaventures.com'
  `);
  console.log('Profiles:', JSON.stringify(profiles, null, 2));
  
  // Check organization_members
  const orgMembers = await db.execute(sql`
    SELECT user_id, organization_id, role, status 
    FROM organization_members 
    WHERE user_id LIKE '%info@nzilaventures.com%' OR user_id IN (
      SELECT id FROM profiles WHERE email = 'info@nzilaventures.com'
    )
  `);
  console.log('\nOrganization Members:', JSON.stringify(orgMembers, null, 2));
  
  // Check organizations
  const orgs = await db.execute(sql`
    SELECT id, name, slug, organization_type 
    FROM organizations 
    LIMIT 5
  `);
  console.log('\nOrganizations:', JSON.stringify(orgs, null, 2));
  
  process.exit(0);
}

checkUser().catch(console.error);
