/**
 * Diagnostic test for RLS enforcement
 */

import { testDb as db } from '../db/test-db';
import { messageThreads, messages, messageParticipants } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, sql} from 'drizzle-orm';

async function diagnosticTest() {
  console.log('🔬 RLS Diagnostic Test\n');
  
  try {
    const user1Id = uuidv4();
    const user2Id = uuidv4();
    const org1Id = uuidv4();
    
    console.log(`User1: ${user1Id.substring(0, 8)}...`);
    console.log(`User2: ${user2Id.substring(0, 8)}...\n`);
    
    // Step 1: Create data without RLS
    console.log('1️⃣  Creating thread, participant, and message...');
    const [thread] = await db.insert(messageThreads).values({
      subject: 'Test',
      memberId: user1Id,
      organizationId: org1Id
    }).returning();
    
    await db.insert(messageParticipants).values({
      threadId: thread.id,
      userId: user1Id,
      role: 'member'
    });
    
    const [message] = await db.insert(messages).values({
      threadId: thread.id,
      senderId: user1Id,
      senderRole: 'member',
      content: 'Test message'
    }).returning();
    
    console.log(`   ✅ Created message: ${message.id.substring(0, 8)}...\n`);
    
    // Step 2: Query without session context
    console.log('2️⃣  Querying WITHOUT session context...');
    const noContextResult = await db
      .select()
      .from(messages)
      .where(eq(messages.id, message.id));
    
    console.log(`   Found ${noContextResult.length} messages (expected: 0 if RLS blocks)`);
    if (noContextResult.length > 0) {
      console.log('   ⚠️  NO SESSION CONTEXT = NO RLS = SEE EVERYTHING\n');
    }
    
    // Step 3: Set session context as user2
    console.log('3️⃣  Setting session context as user2...');
    await db.execute(sql`
      SELECT set_config('app.current_user_id', ${user2Id}, false),
             set_config('app.current_organization_id', ${org1Id}, false)
    `);
    
    // Verify it was set
    const checkContext = await db.execute(sql`
      SELECT current_user_id() as user_id
    `);
    
    const contextUser = (Array.isArray(checkContext) ? checkContext[0] : null) as any;
    console.log(`   Session user_id: ${contextUser?.user_id}`);
    console.log(`   Expected: ${user2Id}`);
    console.log(`   Match: ${contextUser?.user_id === user2Id ? '✅' : '❌'}\n`);
    
    // Step 4: Query AS user2 (should be blocked)
    console.log('4️⃣  Querying AS user2 (not a participant)...');
    const user2Result = await db
      .select()
      .from(messages)
      .where(eq(messages.id, message.id));
    
    console.log(`   Found ${user2Result.length} messages`);
    console.log(`   Expected: 0 (RLS should block)`);
    
    if (user2Result.length === 0) {
      console.log('   ✅ RLS WORKING - User2 blocked\n');
    } else {
      console.log('   ❌ RLS NOT WORKING - User2 can see message!\n');
      console.log('   Message content:', user2Result[0].content);
    }
    
    // Step 5: Set context as user1
    console.log('5️⃣  Setting session context as user1...');
    await db.execute(sql`
      SELECT set_config('app.current_user_id', ${user1Id}, false)
    `);
    
    const checkContext2 = await db.execute(sql`
      SELECT current_user_id() as user_id
    `);
    
    const contextUser2 = (Array.isArray(checkContext2) ? checkContext2[0] : null) as any;
    console.log(`   Session user_id: ${contextUser2?.user_id}\n`);
    
    // Step 6: Query AS user1 (should work)
    console.log('6️⃣  Querying AS user1 (is a participant)...');
    const user1Result = await db
      .select()
      .from(messages)
      .where(eq(messages.id, message.id));
    
    console.log(`   Found ${user1Result.length} messages`);
    console.log(`   Expected: 1 (user1 is participant)`);
    
    if (user1Result.length === 1) {
      console.log('   ✅ RLS WORKING - User1 can see\n');
    } else {
      console.log('   ❌ User1 blocked (shouldn\'t be!)\n');
    }
    
    // Cleanup
    console.log('7️⃣  Cleaning up...');
    await db.delete(messageParticipants).where(eq(messageParticipants.threadId, thread.id));
    await db.delete(messages).where(eq(messages.id, message.id));
    await db.delete(messageThreads).where(eq(messageThreads.id, thread.id));
    console.log('   ✅ Done\n');
    
    console.log('✨ Diagnostic complete!');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

diagnosticTest();
