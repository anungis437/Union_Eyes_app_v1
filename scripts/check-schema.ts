import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function checkSchema() {
  console.log('Checking organizations table schema...\n');
  
  try {
    const result = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'organizations'
      ORDER BY ordinal_position;
    `;
    
    console.log('Organizations table columns:');
    console.table(result);
    
    if (result.length === 0) {
      console.log('\n⚠️  Table does not exist or has no columns!');
    }
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await sql.end();
  }
  
  process.exit(0);
}

checkSchema();
