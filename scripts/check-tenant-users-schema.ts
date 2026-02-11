import { db } from "../db";
import { sql } from "drizzle-orm";

async function checkSchema() {
  const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'user_management' 
    AND table_name = 'organization_users'
    ORDER BY ordinal_position
  `);

  console.log('📋 Actual columns in user_management.organization_users:\n');
  result.forEach((row: any) => {
    console.log(`  ${row.column_name} (${row.data_type})`);
  });

  process.exit(0);
}

checkSchema().catch(console.error);
