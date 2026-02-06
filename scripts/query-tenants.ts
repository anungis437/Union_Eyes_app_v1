import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function main() {
  // Check tenants table - use tenant_id not id
  const tenants = await db.execute(sql`SELECT tenant_id, name FROM tenants LIMIT 10`);
  console.log('All tenants:');
  console.log(JSON.stringify(tenants, null, 2));
  
  process.exit(0);
}

main().catch(console.error);
