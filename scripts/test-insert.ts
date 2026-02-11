/**
 * Test actual INSERT with session context
 */

import { testDb as db } from '../db/test-db';
import { messageThreads } from '../db/schema';
import { sql } from 'drizzle-orm';

async function testInsert() {
  try {
    console.log('Setting session context...');
    
    const testOrgId = '5ae7fec0-94fe-4791-b49c-d6cdf065ac1b';
    const testUserId = 'b475ff68-4e46-47db-baf5-0ad6b5de1ec1';
    const testTenantId = 'ba6d7e2f-a81d-4a8c-8a88-e7d8c8b0d0d0';
    
    await db.execute(sql`
      SELECT set_config('app.current_user_id', ${testUserId}, false),
             set_config('app.current_tenant_id', ${testTenantId}, false),
             set_config('app.current_organization_id', ${testOrgId}, false)
    `);
    
    console.log('Session context set.');
    
    // Verify session
    const sessionCheck = await db.execute(sql`
      SELECT current_user_id() as user_id,
             current_organization_id() as org_id
    `);
    console.log('Session check:', sessionCheck[0]);
    
    console.log('\nAttempting INSERT...');
    
    const [thread] = await db.insert(messageThreads).values({
      subject: 'Test Thread',
      memberId: testUserId,
      organizationId: testOrgId
    }).returning();
    
    console.log('✅ INSERT successful!');
    console.log('Thread ID:', thread.id);
    
    // Clean up
    await db.execute(sql`
      DELETE FROM message_threads WHERE id = ${thread.id}
    `);
    console.log('Cleaned up test data');
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ INSERT failed:');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testInsert();
