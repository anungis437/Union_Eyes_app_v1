import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Check ml_predictions table
    console.log('=== ml_predictions table ===');
    const mlResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'ml_predictions'
      ORDER BY ordinal_position
    `);
    
    mlResult.rows.forEach((row: any) => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n=== model_metadata table ===');
    const mdResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'model_metadata'
      ORDER BY ordinal_position
    `);
    
    mdResult.rows.forEach((row: any) => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check if we have data
    console.log('\n=== Data counts ===');
    const countResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM ml_predictions WHERE prediction_type = 'workload_forecast') as prediction_count,
        (SELECT COUNT(*) FROM model_metadata WHERE model_type = 'workload_forecast') as model_count
    `);
    
    console.log(`  ml_predictions (workload_forecast): ${countResult.rows[0].prediction_count}`);
    console.log(`  model_metadata (workload_forecast): ${countResult.rows[0].model_count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkSchema().catch(console.error);
