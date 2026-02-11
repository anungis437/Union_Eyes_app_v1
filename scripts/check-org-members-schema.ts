import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'organization_members' 
    ORDER BY ordinal_position
  `);
  
  console.log('\norganization_members table columns:');
  result.rows.forEach(c => {
    console.log(`  ${c.column_name}: ${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
  });
  
  await pool.end();
}

checkSchema();
