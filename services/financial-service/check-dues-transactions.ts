import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1,
});

async function checkDuesTransactions() {
  try {
    // Get all columns
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'dues_transactions'
      ORDER BY ordinal_position;
    `;
    
    console.log('dues_transactions columns:');
    columns.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Check for amount-related columns
    const amountCols = columns.filter(c => c.column_name.includes('amount'));
    console.log('\nAmount columns:');
    amountCols.forEach(col => {
      console.log(`  ✓ ${col.column_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkDuesTransactions();
