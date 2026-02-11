import pg from 'pg';

const { Client } = pg;

async function checkClaimsForeignKeys() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    const r = await client.query(`
      SELECT 
        conname, 
        contype, 
        confrelid::regclass AS foreign_table, 
        a.attname AS column_name
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
      WHERE c.conrelid = 'claims'::regclass AND contype = 'f'
    `);
    
    console.log('Claims foreign keys:');
    r.rows.forEach(row => console.log(`  ${row.conname}: ${row.column_name} -> ${row.foreign_table}`));
    
  } finally {
    await client.end();
  }
}

checkClaimsForeignKeys();
