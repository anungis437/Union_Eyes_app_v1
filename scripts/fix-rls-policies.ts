/**
 * Fix RLS Policies - Remove problematic org admin policy
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function fixPolicies() {
  console.log('🔧 Fixing RLS policies...\n');
  
  try {
    // Drop the problematic org admin policy
    console.log('Dropping org admin documents policy...');
    await db.execute(sql`DROP POLICY IF EXISTS "documents_read_org_admin" ON documents;`);
    console.log('✅ Dropped\n');
    
    console.log('✨ Done!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixPolicies();
