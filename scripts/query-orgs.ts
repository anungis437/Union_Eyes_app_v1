import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function main() {
  const orgs = await db.execute(sql`SELECT id, name, legacy_tenant_id FROM organizations LIMIT 5`);
  console.log(JSON.stringify(orgs, null, 2));
  process.exit(0);
}

main().catch(console.error);
