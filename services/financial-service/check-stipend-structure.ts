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

async function checkStipendTable() {
  try {
    // Check if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'stipend_disbursements'
      );
    `;
    
    if (!tableCheck[0].exists) {
      console.log('❌ stipend_disbursements table does NOT exist');
      return;
    }
    
    console.log('✅ stipend_disbursements table exists');
    
    // Get all columns with their data types
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'stipend_disbursements'
      ORDER BY ordinal_position;
    `;
    
    console.log('\nColumn details:');
    columns.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check specifically for amount-related columns
    const amountColumns = columns.filter(col => 
      col.column_name.includes('amount')
    );
    
    console.log('\n📊 Amount-related columns:');
    amountColumns.forEach(col => {
      console.log(`  ✓ ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkStipendTable();
