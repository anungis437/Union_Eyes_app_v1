import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkMigrations() {
  try {
    // Try both possible migration table names
    let migrations;
    try {
      migrations = await pool.query(`
        SELECT * FROM __drizzle_migrations 
        ORDER BY created_at DESC
      `);
      console.log('Using __drizzle_migrations table');
    } catch (e1) {
      try {
        migrations = await pool.query(`
          SELECT * FROM drizzle_migrations 
          ORDER BY created_at DESC
        `);
        console.log('Using drizzle_migrations table');
      } catch (e2) {
        console.log('No migration tracking table found');
        return;
      }
    }
    
    console.log('\nApplied migrations:', migrations.rows.length);
    migrations.rows.forEach(row => {
      console.log(`  - ${row.hash} (${row.created_at})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkMigrations();
