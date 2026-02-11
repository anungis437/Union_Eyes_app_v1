import pg from 'pg';

const { Client } = pg;

async function checkClaimDeadlinesSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if table exists
    const tableExists = await client.query(`
      SELECT 1
      FROM information_schema.tables 
      WHERE table_name = 'claim_deadlines'
    `);

    if (tableExists.rows.length === 0) {
      console.log('❌ claim_deadlines table does not exist');
      return;
    }

    // Check column details
    const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        udt_name,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'claim_deadlines' 
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 claim_deadlines table columns:');
    result.rows.forEach((row) => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = row.column_default || 'no default';
      console.log(`  ${row.column_name}: ${row.data_type} (${row.udt_name}) ${nullable} - default: ${defaultVal}`);
    });

    console.log(`\n Total columns: ${result.rows.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkClaimDeadlinesSchema();
