/**
 * Apply Migration 0076 - claims/claim_deadlines RLS policies
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  console.log('🚀 Applying migration 0076: claims RLS policies...\n');

  try {
    const migrationPath = path.join(
      process.cwd(),
      'db',
      'migrations',
      '0076_add_claims_rls_policies.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log(`📄 Loaded migration (${migrationSQL.length} chars)\n`);
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration executed successfully!\n');

    const verification = await db.execute(sql`
      SELECT
        tablename,
        rowsecurity,
        (SELECT COUNT(*) FROM pg_policies p
         WHERE p.tablename = t.tablename AND p.schemaname = t.schemaname) as policy_count
      FROM pg_tables t
      WHERE t.schemaname = 'public'
        AND t.tablename IN ('claims', 'claim_deadlines')
      ORDER BY t.tablename;
    `);

    const rows = Array.isArray(verification) ? verification : [];
    rows.forEach((row: any) => {
      console.log(
        `  ${row.tablename}: RLS ${row.rowsecurity ? 'ON' : 'OFF'}, policies: ${row.policy_count}`
      );
    });

    console.log('\n✨ Migration 0076 complete');
    process.exit(0);
  } catch (error: unknown) {
    console.error('\n❌ Migration failed:');
    console.error(error.message || error);

    if (error.stack) {
      console.error(error.stack);
    }

    process.exit(1);
  }
}

applyMigration();
