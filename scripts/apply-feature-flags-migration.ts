/**
 * Apply Feature Flags Migration
 * 
 * Run with: npx tsx scripts/apply-feature-flags-migration.ts
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  try {
    console.log('🚀 Applying feature flags migration...\n');

    // Read and execute the SQL file
    const sqlPath = join(__dirname, '../db/migrations/apply-feature-flags.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    // Split by statement-breakpoint or semicolons
    const statements = sqlContent
      .split(/;(?:\s*--> statement-breakpoint)?/)
      .filter(s => s.trim() && !s.trim().startsWith('--'));

    let successCount = 0;
    let skipCount = 0;

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;

      try {
        await db.execute(sql.raw(trimmed));
        successCount++;
        
        // Log what we're doing
        if (trimmed.includes('CREATE TABLE')) {
          console.log('✅ Created feature_flags table');
        } else if (trimmed.includes('CREATE INDEX')) {
          console.log('✅ Created index');
        } else if (trimmed.includes('CREATE TRIGGER')) {
          console.log('✅ Created trigger');
        } else if (trimmed.includes('INSERT INTO')) {
          console.log('✅ Inserted default feature flags');
        }
      } catch (error: unknown) {
        // Skip if already exists
        if (error.message?.includes('already exists') || error.code === '42P07') {
          skipCount++;
          if (trimmed.includes('TABLE')) {
            console.log('⏭️  Table already exists (skipping)');
          }
        } else {
          console.error('❌ Error executing statement:', error.message);
          throw error;
        }
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   ${successCount} statements executed`);
    if (skipCount > 0) {
      console.log(`   ${skipCount} statements skipped (already exist)`);
    }

    // Verify the table exists
    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM feature_flags`
    );
    
    const count = (result[0] as any).count;
    console.log(`\n📊 Feature flags in database: ${count}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

applyMigration();
