/**
 * Run Phase 5B Migration
 * Executes the Phase 5B Inter-Union Features migration
 */

import { db } from '../db/db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sql } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🚀 Running Phase 5B Inter-Union Features Migration...\n');
    
    const migrationPath = path.join(__dirname, '../database/migrations/033_phase5b_inter_union_features.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Tables created:');
    console.log('   - shared_clause_library');
    console.log('   - clause_library_tags');
    console.log('   - clause_comparisons_history');
    console.log('   - arbitration_precedents');
    console.log('   - precedent_tags');
    console.log('   - precedent_citations');
    console.log('   - organization_sharing_settings');
    console.log('   - organization_sharing_grants');
    console.log('   - cross_org_access_log');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
