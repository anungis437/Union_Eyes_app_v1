/**
 * Apply Migration 0072 - Statement by Statement
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function applyMigration() {
  console.log('🚀 Applying migration 0072 statement by statement...\n');
  
  try {
    // 1. Drop old policies
    console.log('1️⃣  Dropping old policies...');
    await db.execute(sql`DROP POLICY IF EXISTS "notifications_own_user_only" ON in_app_notifications`);
    await db.execute(sql`DROP POLICY IF EXISTS "notifications_own_insert" ON in_app_notifications`);
    await db.execute(sql`DROP POLICY IF EXISTS "notifications_own_update" ON in_app_notifications`);
    await db.execute(sql`DROP POLICY IF EXISTS "notifications_own_delete" ON in_app_notifications`);
    console.log('   ✅ Old policies dropped\n');
    
    // 2. Ensure RLS is enabled
    console.log('2️⃣  Enabling RLS...');
    await db.execute(sql`ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY`);
    console.log('   ✅ RLS enabled\n');
    
    // 3. Create Policy 1: Read own
    console.log('3️⃣  Creating policy: in_app_notifications_read_own...');
    await db.execute(sql`
      CREATE POLICY "in_app_notifications_read_own" ON in_app_notifications
      FOR SELECT
      TO public
      USING (user_id = current_user_id())
    `);
    console.log('   ✅ Policy created\n');
    
    // 4. Create Policy 2: Create system
    console.log('4️⃣  Creating policy: in_app_notifications_create_system...');
    await db.execute(sql`
      CREATE POLICY "in_app_notifications_create_system" ON in_app_notifications
      FOR INSERT
      TO public
      WITH CHECK (true)
    `);
    console.log('   ✅ Policy created\n');
    
    // 5. Create Policy 3: Update own
    console.log('5️⃣  Creating policy: in_app_notifications_update_own...');
    await db.execute(sql`
      CREATE POLICY "in_app_notifications_update_own" ON in_app_notifications
      FOR UPDATE
      TO public
      USING (user_id = current_user_id())
      WITH CHECK (user_id = current_user_id())
    `);
    console.log('   ✅ Policy created\n');
    
    // 6. Create Policy 4: Delete own
    console.log('6️⃣  Creating policy: in_app_notifications_delete_own...');
    await db.execute(sql`
      CREATE POLICY "in_app_notifications_delete_own" ON in_app_notifications
      FOR DELETE
      TO public
      USING (user_id = current_user_id())
    `);
    console.log('   ✅ Policy created\n');
    
    // 7. Create Policy 5: Org admin read
    console.log('7️⃣  Creating policy: in_app_notifications_org_admin_read...');
    await db.execute(sql`
      CREATE POLICY "in_app_notifications_org_admin_read" ON in_app_notifications
      FOR SELECT
      TO public
      USING (
        organization_id = current_organization_id()
        AND EXISTS (
          SELECT 1 
          FROM organization_users 
          WHERE user_id = current_user_id()
            AND organization_id = in_app_notifications.organization_id
            AND role IN ('admin', 'officer')
            AND status = 'active'
        )
      )
    `);
    console.log('   ✅ Policy created\n');
    
    // Verify
    console.log('8️⃣  Verifying...');
    const verification = await db.execute(sql`
      SELECT 
        t.tablename,
        t.rowsecurity,
        COUNT(p.policyname) as policy_count
      FROM pg_tables t
      LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
      WHERE t.schemaname = 'public' 
      AND t.tablename = 'in_app_notifications'
      GROUP BY t.tablename, t.rowsecurity
    `);
    
    const results = Array.isArray(verification) ? verification : [];
    
    if (results.length > 0) {
      const info = results[0] as any;
      console.log(`   Table: ${info.tablename}`);
      console.log(`   RLS: ${info.rowsecurity ? '✅ ON' : '❌ OFF'}`);
      console.log(`   Policies: ${info.policy_count}`);
    }
    
    console.log('\n✨ Migration complete!');
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('\n❌ Migration failed:');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
    
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    
    process.exit(1);
  }
}

applyMigration();
