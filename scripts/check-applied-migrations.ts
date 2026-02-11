/**
 * Check Applied Migrations
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkMigrations() {
  console.log('🔍 Checking applied migrations...\n');
  
  try {
    // Get all applied migrations
    const migrations = await db.execute(sql`
      SELECT * FROM drizzle.__drizzle_migrations
      ORDER BY created_at ASC;
    `);
    
    const results = Array.isArray(migrations) ? migrations : [];
    
    if (results.length > 0) {
      console.log(`📋 ${results.length} migrations applied:\n`);
      results.forEach((row: any, index: number) => {
        const date = new Date(row.created_at).toLocaleString();
        console.log(`  ${String(index + 1).padStart(3, ' ')}. ${row.hash.substring(0, 30)}... (${date})`);
      });
      
      console.log(`\n✅ Latest migration: ${results[results.length - 1].hash}`);
    } else {
      console.log('⚠️  No migrations found in journal');
    }
    
    //Check what tables exist in the public schema
    console.log('\n---');
    console.log('\n🔍 Checking tables in public schema...\n');
    
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    
    const tableResults = Array.isArray(tables) ? tables : [];
    
    if (tableResults.length > 0) {
      console.log(`📋 ${tableResults.length} tables found:\n`);
      tableResults.forEach((row: any, index: number) => {
        console.log(`  ${String(index + 1).padStart(3, ' ')}. ${row.tablename}`);
      });
    } else {
      console.log('⚠️  No tables found in public schema!');
      console.log('   This is unusual if migrations have been applied.');
    }
    
    console.log('\n✨ Check complete!');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Error checking migrations:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkMigrations();
