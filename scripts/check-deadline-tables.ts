import pg from 'pg';

const { Client } = pg;

async function checkDeadlineTables() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    const r = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%deadline%' 
        AND table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Deadline-related tables:');
    r.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
  } finally {
    await client.end();
  }
}

checkDeadlineTables();
