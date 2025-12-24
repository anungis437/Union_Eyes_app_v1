/**
 * Comprehensive Migration Script: tenant_id → organization_id
 * 
 * Updates all database tables to use organization_id instead of tenant_id
 * This aligns with the existing claims table structure and organizational hierarchy
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../db';
import { sql } from 'drizzle-orm';

async function migrateTenantIdToOrganizationId() {
  console.log('🔄 Starting tenant_id → organization_id migration\n');

  try {
    // 1. Update ml_predictions table
    console.log('📊 Updating ml_predictions table...');
    await db.execute(sql`
      ALTER TABLE ml_predictions 
      RENAME COLUMN tenant_id TO organization_id
    `);
    console.log('✅ ml_predictions updated');

    // Update indexes
    await db.execute(sql`DROP INDEX IF EXISTS idx_ml_predictions_tenant`);
    await db.execute(sql`CREATE INDEX idx_ml_predictions_organization ON ml_predictions(organization_id)`);
    
    // Update unique constraint
    await db.execute(sql`
      ALTER TABLE ml_predictions 
      DROP CONSTRAINT IF EXISTS unique_prediction
    `);
    await db.execute(sql`
      ALTER TABLE ml_predictions 
      ADD CONSTRAINT unique_prediction UNIQUE (organization_id, prediction_type, prediction_date, horizon)
    `);
    console.log('✅ ml_predictions indexes updated');

    // 2. Update model_metadata table
    console.log('\n📊 Updating model_metadata table...');
    await db.execute(sql`
      ALTER TABLE model_metadata 
      RENAME COLUMN tenant_id TO organization_id
    `);
    console.log('✅ model_metadata updated');

    // Update indexes
    await db.execute(sql`DROP INDEX IF EXISTS idx_model_metadata_tenant`);
    await db.execute(sql`CREATE INDEX idx_model_metadata_organization ON model_metadata(organization_id)`);
    
    // Update unique constraint
    await db.execute(sql`
      ALTER TABLE model_metadata 
      DROP CONSTRAINT IF EXISTS unique_model
    `);
    await db.execute(sql`
      ALTER TABLE model_metadata 
      ADD CONSTRAINT unique_model UNIQUE (organization_id, model_type, version)
    `);
    console.log('✅ model_metadata indexes updated');

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ ml_predictions: tenant_id → organization_id');
    console.log('  ✅ model_metadata: tenant_id → organization_id');
    console.log('  ✅ All indexes and constraints updated');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateTenantIdToOrganizationId().then(() => process.exit(0));
