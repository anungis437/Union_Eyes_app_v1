/**
 * Simple Connection Test
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function testConnection() {
  console.log('🔗 Testing database connection...\n');
  
  try {
    // Try a simple query
    const result = await db.execute(sql`SELECT 1 as test`);
    
    console.log('✅ Connection successful!');
    console.log('   Result type:', typeof result);
    console.log('   Result:', JSON.stringify(result, null, 2));
    
    // Check what properties the result has
    console.log('   Result properties:', Object.keys(result));
    
    // For postgres-js with drizzle, result is an array directly
    const results = Array.isArray(result) ? result : [];
    
    // Try to select current database
    const dbInfo = await db.execute(sql`
      SELECT 
        current_database() as database,
        current_schema() as schema,
        current_user as "user"
    `);
    
    console.log('\n📊 Database info:');
    if (Array.isArray(dbInfo) && dbInfo.length > 0) {
      console.log(JSON.stringify(dbInfo[0], null, 2));
    } else {
      console.log('   No data returned');
    }
    
    // Check if drizzle schema exists
    const schemaCheck = await db.execute(sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'drizzle'
    `);
    
    const rows = Array.isArray(schemaCheck) ? schemaCheck : [];
    console.log('\n🔍 Drizzle schema exists:', rows.length > 0);
    
    if (rows.length === 0) {
      console.log('\n⚠️  Drizzle schema does not exist!');
      console.log('   Migrations have never been run.');
      console.log('\n   Run: pnpm db:migrate');
    }
    
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('\n❌ Connection failed:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testConnection();
