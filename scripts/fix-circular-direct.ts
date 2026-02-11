/**
 * Fix circular policies - direct SQL approach
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

async function fixPolicies() {
  const sql = postgres(connectionString, { max: 1 });
  
  try {
    console.log('Fixing circular RLS policies...\n');
    
    // Fix 1: participants_read_own
    console.log('1. Dropping participants_read_own...');
    await sql`DROP POLICY IF EXISTS participants_read_own ON message_participants`;
    console.log('   Creating new participants_read_own...');
    await sql`
      CREATE POLICY participants_read_own 
      ON message_participants 
      FOR SELECT 
      USING (user_id = current_user_id())
    `;
    console.log('   ✅ Done\n');
    
    // Fix 2: participants_create_same_org
    console.log('2. Dropping participants_create_same_org...');
    await sql`DROP POLICY IF EXISTS participants_create_same_org ON message_participants`;
    console.log('   Creating new participants_create_same_org...');
    await sql`
      CREATE POLICY participants_create_same_org 
      ON message_participants 
      FOR INSERT 
      WITH CHECK (current_organization_id() IS NOT NULL)
    `;
    console.log('   ✅ Done\n');
    
    console.log('✨ Circular dependencies fixed!');
    
    await sql.end();
    process.exit(0);
    
  } catch (error: any) {
    console.error('Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

fixPolicies();
