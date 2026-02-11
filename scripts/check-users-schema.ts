import pg from 'pg';

const { Client } = pg;

async function checkUsersSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    const r = await client.query(`
      SELECT 
        column_name, 
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'user_management' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('user_management.users columns:');
    r.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`));
    
    // Check constraints
    const constraints = await client.query(`
      SELECT 
        conname,
        contype,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'user_management.users'::regclass
    `);
    
    console.log('\nConstraints:');
    constraints.rows.forEach(row => console.log(`  ${row.conname} (${row.contype}): ${row.definition}`));
    
  } finally {
    await client.end();
  }
}

checkUsersSchema();
