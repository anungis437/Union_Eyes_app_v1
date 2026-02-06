import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkColumn() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'arbitration_precedents' 
      AND column_name = 'cited_cases'
    `);
    
    console.log('cited_cases column exists:', result.rows.length > 0);
    console.log('Result:', result.rows);
    
    // Also get all columns
    const allColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'arbitration_precedents'
      ORDER BY ordinal_position
    `);
    
    console.log('\nAll columns in arbitration_precedents:');
    allColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkColumn();
