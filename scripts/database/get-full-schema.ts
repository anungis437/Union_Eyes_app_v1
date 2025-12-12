import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });

async function getFullSchema() {
  const sql = postgres(process.env.DATABASE_URL!);

  // Get organizations table structure
  const orgColumns = await sql`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'organizations'
    ORDER BY ordinal_position
  `;

  console.log("\n=== ORGANIZATIONS TABLE SCHEMA ===\n");
  console.table(orgColumns);

  // Get members table structure
  const memberColumns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'members'
    ORDER BY ordinal_position
  `;

  console.log("\n=== MEMBERS TABLE SCHEMA ===\n");
  console.table(memberColumns);

  // Get all existing enums
  const enums = await sql`
    SELECT t.typname as enum_name, e.enumlabel as enum_value
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typtype = 'e'
    ORDER BY t.typname, e.enumsortorder
  `;

  console.log("\n=== EXISTING ENUMS ===\n");
  const enumsByType = enums.reduce((acc, row) => {
    if (!acc[row.enum_name]) acc[row.enum_name] = [];
    acc[row.enum_name].push(row.enum_value);
    return acc;
  }, {} as Record<string, string[]>);
  
  for (const [enumName, values] of Object.entries(enumsByType)) {
    console.log(`${enumName}:`);
    console.log(`  ${values.join(', ')}\n`);
  }

  await sql.end();
}

getFullSchema();
