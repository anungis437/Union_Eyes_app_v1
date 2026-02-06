/**
 * Test Database Connection Script
 * Run with: pnpm exec tsx scripts/test-db-connection.ts
 */

import { db } from "@/db/db";
import { sql } from 'drizzle-orm';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    // Test 1: Basic connection
    console.log('Test 1: Basic SQL query');
    const result = await db.execute(sql`SELECT NOW() as current_time, version() as version`);
    console.log('✅ Connection successful!');
    console.log(`   Time: ${result[0].current_time}`);
    console.log(`   Version: ${result[0].version}\n`);
    
    // Test 2: Check if profiles table exists
    console.log('Test 2: Check profiles table');
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
      ) as table_exists
    `);
    
    if (tableCheck[0].table_exists) {
      console.log('✅ Profiles table exists');
      
      // Test 3: Count profiles
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM profiles`);
      console.log(`   Total profiles: ${countResult[0].count}\n`);
    } else {
      console.log('❌ Profiles table does not exist\n');
    }
    
    // Test 4: Check current user
    console.log('Test 3: Check database user');
    const userResult = await db.execute(sql`SELECT current_user, current_database()`);
    console.log(`✅ Connected as: ${userResult[0].current_user}`);
    console.log(`   Database: ${userResult[0].current_database}\n`);
    
    console.log('🎉 All database tests passed!\n');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Run the test
testConnection()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed');
    process.exit(1);
  });
