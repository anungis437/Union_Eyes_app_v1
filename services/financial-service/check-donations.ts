/**
 * Check Donations Table Structure
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });

async function main() {
  console.log('🔍 Checking donations table structure...\n');
  
  const columns = await sql`
    SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'donations'
    ORDER BY ordinal_position
  `;
  
  console.log('Columns in donations table:');
  columns.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type}${
      col.numeric_precision ? `(${col.numeric_precision},${col.numeric_scale})` : ''
    }`);
  });
  
  await sql.end();
}

main();
