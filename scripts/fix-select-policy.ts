/**
 * Fix message_threads SELECT policy to allow creators to see their threads
 * 
 * Problem: RETURNING clause triggers SELECT policy, which checks message_participants
 * But participants haven't been added yet when creating a thread!
 * 
 * Solution: Allow member_id or staff_id (creators) to see their threads
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

async function fixSelectPolicy() {
  const sql = postgres(connectionString, { max: 1 });
  
  try {
    console.log('Fixing message_threads SELECT policy...\n');
    
    // Drop the old policy
    console.log('1. Dropping old policy...');
    await sql`DROP POLICY IF EXISTS threads_read_participant_access ON message_threads`;
    console.log('   Done\n');
    
    // Create new policy
    console.log('2. Creating new policy...');
    await sql`
      CREATE POLICY threads_read_participant_access 
      ON message_threads 
      FOR SELECT 
      USING (
        member_id = current_user_id()
        OR staff_id = current_user_id()
        OR id IN (
          SELECT thread_id 
          FROM message_participants 
          WHERE user_id = current_user_id()
        )
      )
    `;
    console.log('   Done\n');
    
    console.log('✅ Fix complete!');
    
    await sql.end();
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('Error:', error.message);
    console.error(error);
    await sql.end();
    process.exit(1);
  }
}

fixSelectPolicy();
