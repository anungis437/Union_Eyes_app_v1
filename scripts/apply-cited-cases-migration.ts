import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function applyMigration() {
  try {
    console.log('Connecting to database...');
    
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, '..', 'db', 'migrations', 'add_cited_cases_column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Applying migration: add_cited_cases_column.sql');
    console.log('SQL:', sql);
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('✅ Migration applied successfully');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'arbitration_precedents' 
      AND column_name = 'cited_cases'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column verified:', result.rows[0]);
    } else {
      console.log('❌ Column not found after migration');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
