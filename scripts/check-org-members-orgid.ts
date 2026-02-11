import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkOrgMemberOrgId() {
  const rows = await db.execute(sql`
    SELECT organization_id, pg_typeof(organization_id) as org_type
    FROM organization_members
    LIMIT 5
  `);

  console.log(rows);
  process.exit(0);
}

checkOrgMemberOrgId().catch((error) => {
  console.error(error);
  process.exit(1);
});
