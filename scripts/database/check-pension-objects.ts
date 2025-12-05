import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

async function checkPension() {
  try {
    console.log('\n=== PENSION TABLES ===');
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'pension%' OR table_name LIKE 'hw_%'
      ORDER BY table_name;
    `;
    tables.forEach(t => console.log(`- ${t.table_name}`));
    
    console.log('\n=== PENSION INDEXES ===');
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND (indexname LIKE 'idx_pension%' OR indexname LIKE 'idx_hw%')
      ORDER BY indexname;
    `;
    indexes.forEach(i => console.log(`- ${i.indexname}`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkPension();
