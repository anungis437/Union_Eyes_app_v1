/**
 * RLS diagnostic with fresh connection
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, sql } from 'drizzle-orm';

async function diagnosticWithFreshConnection() {
  console.log('🔬 RLS Diagnostic Test (Fresh Connection)\n');
  
  // Create fresh connection AFTER privilege change
  const freshClient = postgres(process.env.DATABASE_URL!, { max: 1 });
  const freshDb = drizzle(freshClient, { schema });
  
  try {
    // First check role privileges
    console.log('Verifying role privileges...');
    const roleCheck = await freshDb.execute(sql`
      SELECT usebypassrls FROM pg_user WHERE usename = current_user
    `);
    const roleInfo = (Array.isArray(roleCheck) ? roleCheck[0] : null) as any;
    console.log(`  BYPASSRLS: ${roleInfo?.usebypassrls ? 'YES (bad!)' : 'NO (good!)'}\n`);
    
    const user1Id = uuidv4();
    const user2Id = uuidv4();
    const org1Id = uuidv4();
    
    console.log(`User1: ${user1Id.substring(0, 8)}...`);
    console.log(`User2: ${user2Id.substring(0, 8)}...\n`);
    
    // Create data
    console.log('1️⃣  Creating thread, participant, and message...');
    const [thread] = await freshDb.insert(schema.messageThreads).values({
      subject: 'Test',
      memberId: user1Id,
      organizationId: org1Id
    }).returning();
    
    await freshDb.insert(schema.messageParticipants).values({
      threadId: thread.id,
      userId: user1Id,
      role: 'member'
    });
    
    const [message] = await freshDb.insert(schema.messages).values({
      threadId: thread.id,
      senderId: user1Id,
      senderRole: 'member',
      content: 'Test message'
    }).returning();
    
    console.log(`   ✅ Created\n`);
    
    // Query without context
    console.log('2️⃣  Query WITHOUT session context...');
    try {
      const noContextResult = await freshDb
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.id, message.id));
      
      console.log(`   Found ${noContextResult.length} messages`);
      if (noContextResult.length === 0) {
        console.log('   ✅ RLS BLOCKING (good!)\n');
      } else {
        console.log('   ❌ RLS NOT BLOCKING (bad!)\n');
      }
    } catch (error: any) {
      console.log(`   ✅ RLS BLOCKING with error (good!): ${error.message.substring(0, 50)}...\n`);
    }
    
    // Set context for user2 query
    console.log('3️⃣  Setting context as user2...');
    await freshDb.execute(sql`
      SELECT set_config('app.current_user_id', ${user2Id}, false)
    `);
    console.log('   ✅ Context set\n');
    
    // Query as user2
    console.log('4️⃣  Query AS user2 (not participant)...');
    const user2Result = await freshDb
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.id, message.id));
    
    console.log(`   Found ${user2Result.length} messages`);
    if (user2Result.length === 0) {
      console.log('   ✅ RLS WORKING - User2 blocked!\n');
    } else {
      console.log('   ❌ RLS NOT WORKING - User2 can see!\n');
    }
    
    // Set context for user1
    console.log('5️⃣  Setting context as user1...');
    await freshDb.execute(sql`
      SELECT set_config('app.current_user_id', ${user1Id}, false)
    `);
    console.log('   ✅ Context set\n');
    
    // Query as user1
    console.log('6️⃣  Query AS user1 (is participant)...');
    const user1Result = await freshDb
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.id, message.id));
    
    console.log(`   Found ${user1Result.length} messages`);
    if (user1Result.length === 1) {
      console.log('   ✅ RLS WORKING - User1 can see!\n');
    } else {
      console.log('   ❌ RLS BLOCKING user1 (should not!)\n');
    }
    
    // Cleanup
    console.log('7️⃣  Cleaning up...');
    await freshDb.delete(schema.messageParticipants).where(eq(schema.messageParticipants.threadId, thread.id));
    await freshDb.delete(schema.messages).where(eq(schema.messages.id, message.id));
    await freshDb.delete(schema.messageThreads).where(eq(schema.messageThreads.id, thread.id));
    console.log('   ✅ Done\n');
    
    console.log('✨ Diagnostic complete!');
    
    await freshClient.end();
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await freshClient.end();
    process.exit(1);
  }
}

diagnosticWithFreshConnection();
