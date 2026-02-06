/**
 * Check the actual schema of organization_members table
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Checking organization_members table schema...\n');
    
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'organization_members'
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns:');
    result.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

main();
