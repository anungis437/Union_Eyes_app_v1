/**
 * Migration Script: Drop Obsolete Search Vector Trigger
 * 
 * Removes the organization_members_search_vector trigger and function
 * that reference a non-existent search_vector column.
 */

import { db } from '../database';
import { sql } from 'drizzle-orm';

async function dropObsoleteTrigger() {
  try {
    console.log('🔧 Dropping obsolete trigger and function...\n');

    // Drop the trigger
    await db.execute(sql`DROP TRIGGER IF EXISTS organization_members_search_vector_update ON organization_members`);
    console.log('✓ Dropped trigger: organization_members_search_vector_update');

    // Drop the function
    await db.execute(sql`DROP FUNCTION IF EXISTS organization_members_search_vector()`);
    console.log('✓ Dropped function: organization_members_search_vector()');

    console.log('\n✅ Migration completed successfully!');
    console.log('   Tests in __tests__/integration/tenant-isolation.test.ts should now pass.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

dropObsoleteTrigger();
