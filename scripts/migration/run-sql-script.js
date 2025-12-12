const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runSQL() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const sqlPath = path.join(__dirname, 'database', 'migrations', 'add-current-user.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('\n📝 Executing SQL script...\n');
    const result = await client.query(sql);
    
    console.log('✅ SQL executed successfully!');
    console.log('\n📊 Verification results:');
    
    // The last result will be the SELECT query
    if (result.rows) {
      console.table(result.rows);
    }
    
  } catch (error) {
    console.error('❌ Error executing SQL:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

runSQL();
