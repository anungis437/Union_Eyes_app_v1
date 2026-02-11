/**
 * Create ONE policy for testing
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function testPolicy() {
  console.log('Testing policy creation...\n');
  
  try {
    console.log('Creating policy...');
    
    const result = await db.execute(sql`
      CREATE POLICY "in_app_notifications_read_own" ON in_app_notifications
      FOR SELECT
      TO public
      USING (user_id = current_user_id())
    `);
    
    console.log('Result:', result);
    console.log('\n✅ Policy created!');
    
    // Check if it exists
    const check = await db.execute(sql`
      SELECT policyname 
      FROM pg_policies 
      WHERE tablename = 'in_app_notifications'
    `);
    
    console.log('\nPolicies found:', check);
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Error:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Detail:', error.detail);
    console.error('Hint:', error.hint);
    process.exit(1);
  }
}

testPolicy();
