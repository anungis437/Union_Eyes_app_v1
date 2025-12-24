import { db } from '../db/db';
import { sql } from 'drizzle-orm';

(async () => {
  const result = await db.execute(sql`
    SELECT 
      conname, 
      conrelid::regclass AS table_name, 
      confrelid::regclass AS referenced_table, 
      pg_get_constraintdef(oid) AS definition 
    FROM pg_constraint 
    WHERE conname = 'organization_members_tenant_id_fkey'
  `);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
})();
