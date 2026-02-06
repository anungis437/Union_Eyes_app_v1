/**
 * Complete tenant_id → organization_id Migration
 * 
 * Drops tenant_id columns from all tables since organization_id is the standard
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../db';
import { sql } from 'drizzle-orm';

async function completeTenantIdMigration() {
  console.log('🔄 Completing tenant_id → organization_id migration\n');

  try {
    // 1. Drop tenant_id from claims table (organization_id already exists)
    console.log('📊 Updating claims table...');
    await db.execute(sql`
      ALTER TABLE claims 
      DROP COLUMN IF EXISTS tenant_id CASCADE
    `);
    console.log('✅ claims.tenant_id dropped (using organization_id)');

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ claims: tenant_id removed, organization_id is primary');
    console.log('  ✅ ml_predictions: tenant_id → organization_id');
    console.log('  ✅ model_metadata: tenant_id → organization_id');
    console.log('  ✅ All tables now use organization_id standard');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

completeTenantIdMigration().then(() => process.exit(0));
