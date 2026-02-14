/**
 * Simple RLS test
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { messageThreads, messages, messageParticipants } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function testRLS() {
  console.log('🧪 Testing RLS enforcement...\n');
  
  try {
    // Create test users
    const user1Id = uuidv4();
    const user2Id = uuidv4();
    const org1Id = uuidv4();
    const org2Id = uuidv4();
    
    console.log(`User1: ${user1Id}`);
    console.log(`User2: ${user2Id}\n`);
    
    // Create a thread and message (without setting context - as admin)
    console.log('1️⃣  Creating thread and message...');
    const [thread] = await db.insert(messageThreads).values({
      subject: 'Test Thread',
      memberId: user1Id,
      organizationId: org1Id
    }).returning();
    
    const [message] = await db.insert(messages).values({
      threadId: thread.id,
      senderId: user1Id,
      senderRole: 'member',
      content: 'Test message'
    }).returning();
    
    console.log(`   Thread ID: ${thread.id}`);
    console.log(`   Message ID: ${message.id}\n`);
    
    // Try to read as user2 (should be blocked)
    console.log('2️⃣  Setting context as user2 and trying to read...');
    await db.execute(sql`
      SELECT set_config('app.current_user_id', ${user2Id}, false),
             set_config('app.current_organization_id', ${org2Id}, false)
    `);
    
    const user2Messages = await db
      .select()
      .from(messages)
      .where(eq(messages.id, message.id));
    
    console.log(`   User2 sees ${user2Messages.length} messages`);
    console.log(`   Expected: 0 (should be blocked by RLS)`);
    
    if (user2Messages.length > 0) {
      console.log('   ❌ RLS NOT WORKING - User2 can see the message!');
    } else {
      console.log('   ✅ RLS working - User2 blocked\n');
    }
    
    // Add user2 as participant
    console.log('3️⃣  Adding user2 as participant...');
    await db.insert(messageParticipants).values({
      threadId: thread.id,
      userId: user2Id,
      role: 'member'
    });
    console.log('   ✅ Participant added\n');
    
    // Try to read again as user2 (should now succeed)
    console.log('4️⃣  Trying to read again as user2...');
    const user2MessagesAfter = await db
      .select()
      .from(messages)
      .where(eq(messages.id, message.id));
    
    console.log(`   User2 sees ${user2MessagesAfter.length} messages`);
    console.log(`   Expected: 1 (should be allowed now)`);
    
    if (user2MessagesAfter.length === 1) {
      console.log('   ✅ RLS working - User2 can see after being added as participant\n');
    } else {
      console.log('   ❌ RLS NOT WORKING - User2 still blocked!\n');
    }
    
    // Clean up
    console.log('5️⃣  Cleaning up...');
    await db.delete(messageParticipants).where(eq(messageParticipants.threadId, thread.id));
    await db.delete(messages).where(eq(messages.id, message.id));
    await db.delete(messageThreads).where(eq(messageThreads.id, thread.id));
    console.log('   ✅ Cleaned up\n');
    
    console.log('✨ Test complete!');
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('\n❌ Error:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testRLS();
