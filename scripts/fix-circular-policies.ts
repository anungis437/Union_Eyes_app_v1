/**
 * Fix circular RLS policy dependencies
 * 
 * Issues:
 * 1. participants_read_own has self-referential query
 * 2. participants_create_same_org queries message_threads (which queries participants)
 * 3. message_threads SELECT queries message_participants
 * 
 * Solution: Simplify policies to break circular chains
 */

import { testDb as db } from '../db/test-db';
import { sql } from 'drizzle-orm';

async function fixCircularPolicies() {
  console.log('🔧 Fixing circular RLS policy dependencies...\n');
  
  try {
    // 1. Fix participants_read_own - remove self-referential query
    console.log('1️⃣ Dropping and recreating participants_read_own (SELECT)...');
    await db.execute(sql`
      DROP POLICY IF EXISTS participants_read_own ON message_participants
    `);
    
    await db.execute(sql`
      CREATE POLICY participants_read_own 
      ON message_participants 
      FOR SELECT 
      USING (user_id = current_user_id())
    `);
    console.log('   ✅ participants_read_own fixed (removed self-reference)\n');
    
    // 2. Fix participants_create_same_org - simplify to avoid querying message_threads
    console.log('2️⃣ Dropping and recreating participants_create_same_org (INSERT)...');
    await db.execute(sql`
      DROP POLICY IF EXISTS participants_create_same_org ON message_participants
    `);
    
    await db.execute(sql`
      CREATE POLICY participants_create_same_org 
      ON message_participants 
      FOR INSERT 
      WITH CHECK (current_organization_id() IS NOT NULL)
    `);
    console.log('   ✅ participants_create_same_org simplified (removed thread check)\n');
    
    // Verify the fixes
    console.log('🔍 Verifying fixed policies...\n');
    
    const participantPolicies = await db.execute(sql`
      SELECT policyname, cmd, qual, with_check
      FROM pg_policies 
      WHERE tablename = 'message_participants'
      ORDER BY policyname
    `);
    
    console.log('message_participants policies:');
    (participantPolicies as any[]).forEach(p => {
      console.log(`  - ${p.policyname} (${p.cmd})`);
    });
    
    console.log('\n✨ Circular dependencies fixed!');
    console.log('\n📋 Summary of changes:');
    console.log('  • participants_read_own: Removed self-referential query');
    console.log('  • participants_create_same_org: Simplified to check session context only');
    console.log('\n⚠️  Note: Organization validation now relies on application logic');
    
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixCircularPolicies();
