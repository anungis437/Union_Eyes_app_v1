import pg from 'pg';

const { Client } = pg;

async function checkHierarchyPathType() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check column type
    const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        udt_name,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
        AND column_name IN ('id', 'hierarchy_path')
      ORDER BY column_name;
    `);

    console.log('\n📋 Organizations table columns:');
    result.rows.forEach((row) => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.udt_name})`);
    });

    // Check a sample row
    const sampleResult = await client.query(`
      SELECT id, hierarchy_path, pg_typeof(hierarchy_path) as path_type
      FROM organizations 
      LIMIT 1;
    `);

    console.log('\n📊 Sample data:');
    if (sampleResult.rows.length > 0) {
      const row = sampleResult.rows[0];
      console.log(`  id: ${row.id} (${typeof row.id})`);
      console.log(`  hierarchy_path: ${JSON.stringify(row.hierarchy_path)} (${row.path_type})`);
    } else {
      console.log('  No organizations found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkHierarchyPathType();
