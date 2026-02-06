import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function check() {
  const r = await db.execute(sql`SELECT user_id, organization_id, role, status FROM organization_members LIMIT 10`);
  console.log('Organization Members:');
  console.log(JSON.stringify(r, null, 2));
  
  const orgs = await db.execute(sql`SELECT id, name, slug FROM organizations LIMIT 10`);
  console.log('\nOrganizations:');
  console.log(JSON.stringify(orgs, null, 2));
}

check().catch(console.error);
