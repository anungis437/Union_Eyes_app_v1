/**
 * Query database to see existing enums
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function checkDatabaseEnums() {
  try {
    console.log('🔍 Checking existing enums in database...\n');
    
    // Query PostgreSQL to get all enums
    const result = await db.execute(sql`
      SELECT 
        t.typname as enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typtype = 'e'
      GROUP BY t.typname
      ORDER BY t.typname;
    `);

    console.log('📋 Existing Enums in Database:');
    console.log('='.repeat(70));
    
    if (result && Array.isArray(result) && result.length > 0) {
      result.forEach((row: any) => {
        const enumName = row.enum_name;
        const values = row.enum_values ? row.enum_values.split(',') : [];
        console.log(`\n${enumName}:`);
        console.log(`  Count: ${values.length}`);
        console.log(`  Values: ${values.join(', ')}`);
      });
      
      console.log(`\n\nTotal enums in database: ${result.length}`);
    } else {
      console.log('No enums found or query returned unexpected format');
    }

    // Check for enums with "pending" value
    console.log('\n\n🔍 Enums containing "pending" value:');
    console.log('='.repeat(70));
    
    const pendingResult = await db.execute(sql`
      SELECT 
        t.typname as enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typtype = 'e' 
        AND e.enumlabel = 'pending'
      GROUP BY t.typname
      ORDER BY t.typname;
    `);

    if (pendingResult && Array.isArray(pendingResult) && pendingResult.length > 0) {
      pendingResult.forEach((row: any) => {
        const enumName = row.enum_name;
        console.log(`  - ${enumName}`);
      });
      console.log(`\nTotal: ${pendingResult.length} enums with "pending"`);
    } else {
      console.log('No enums with "pending" value found');
    }

  } catch (error) {
    console.error('❌ Error checking database enums:');
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkDatabaseEnums();
