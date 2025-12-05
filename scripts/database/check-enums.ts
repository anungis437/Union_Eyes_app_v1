import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

async function checkEnums() {
  try {
    const enums = await sql`
      SELECT typname as enum_name
      FROM pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typtype = 'e'
      AND n.nspname = 'public'
      AND typname IN ('pension_plan_type', 'pension_plan_status', 'pension_claim_type', 'hw_plan_type', 'hw_claim_status')
      ORDER BY typname;
    `;
    
    console.log('\nExisting enums in database:');
    enums.forEach(e => console.log(`- ${e.enum_name}`));
    
    if (enums.length === 0) {
      console.log('None of the expected enums exist yet');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkEnums();
