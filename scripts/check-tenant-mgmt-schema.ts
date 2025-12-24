import { db } from '../db/db';
import { sql } from 'drizzle-orm';

(async () => {
  const result = await db.execute(sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'tenant_management' AND table_name = 'tenants'
    ORDER BY ordinal_position
  `);
  console.log('Columns in tenant_management.tenants:');
  result.forEach((col: any) => {
    console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
  });
  process.exit(0);
})();
