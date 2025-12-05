const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name IN ('claims', 'members', 'strike_funds', 'dues_payments', 
                           'deadlines', 'documents', 'analytics_events', 'organization_members')
      ORDER BY table_name
    `);
    
    console.log('Existing tables:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
  } finally {
    await client.end();
  }
}

main().catch(console.error);
