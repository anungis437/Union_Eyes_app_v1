import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });

async function checkSchema() {
  const sql = postgres(process.env.DATABASE_URL!);

  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'organizations'
    ORDER BY ordinal_position
  `;

  console.log("\nOrganizations table columns:");
  console.table(columns);

  await sql.end();
}

checkSchema();
