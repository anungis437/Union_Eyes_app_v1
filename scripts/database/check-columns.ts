/**
 * Check actual column names in key tables
 */

import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

async function checkColumns() {
  console.log("🔍 Checking Actual Column Names\n");
  
  const tables = ['organizations', 'claims', 'clause_comparisons_history'];
  
  for (const table of tables) {
    console.log(`📋 ${table}:`);
    const cols = await client`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = ${table}
      ORDER BY ordinal_position
    `;
    
    cols.forEach((col: any) => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    console.log();
  }
  
  await client.end();
}

checkColumns();
