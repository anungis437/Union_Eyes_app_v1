const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'tenant_management'
        AND table_name = 'tenants'
      ORDER BY ordinal_position
    `);
    
    console.log('tenant_management.tenants columns:');
    console.log(JSON.stringify(result.rows, null, 2));
    
  } finally {
    await client.end();
  }
}

main().catch(console.error);
