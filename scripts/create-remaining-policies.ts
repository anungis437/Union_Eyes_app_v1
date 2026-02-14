/**
 * Create remaining in_app_notifications RLS policies
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function createPolicies() {
  console.log('Creating remaining in_app_notifications RLS policies...\n');
  
  try {
    // Policy 2: Create system
    console.log('1️⃣  Creating policy: in_app_notifications_create_system...');
    await db.execute(sql`
      CREATE POLICY "in_app_notifications_create_system" ON in_app_notifications
      FOR INSERT
      TO public
      WITH CHECK (true)
    `);
    console.log('   ✅ Created\n');
    
    // Policy 3: Update own
    console.log('2️⃣  Creating policy: in_app_notifications_update_own...');
    await db.execute(sql`
      CREATE POLICY "in_app_notifications_update_own" ON in_app_notifications
      FOR UPDATE
      TO public
      USING (user_id = current_user_id())
      WITH CHECK (user_id = current_user_id())
    `);
    console.log('   ✅ Created\n');
    
    // Policy 4: Delete own
    console.log('3️⃣  Creating policy: in_app_notifications_delete_own...');
    await db.execute(sql`
      CREATE POLICY "in_app_notifications_delete_own" ON in_app_notifications
      FOR DELETE
      TO public
      USING (user_id = current_user_id())
    `);
    console.log('   ✅ Created\n');
    
    // Policy 5: Org admin read
    console.log('4️⃣  Creating policy: in_app_notifications_org_admin_read...');
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
    console.log('   ✅ Created\n');
    
    // Verify
    console.log('5️⃣  Verifying policies...');
    const verification = await db.execute(sql`
      SELECT policyname, cmd
      FROM pg_policies 
      WHERE schemaname = 'public'
      AND tablename = 'in_app_notifications'
      ORDER BY policyname
    `);
    
    const results = Array.isArray(verification) ? verification : [];
    
    console.log(`\n   Found ${results.length} policies:\n`);
    results.forEach((row: any) => {
      console.log(`   ✅ ${row.policyname} (${row.cmd})`);
    });
    
    console.log('\n✨ All policies created successfully!');
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('\n❌ Error:');
    console.error('Message:', error.message);
    
    if (error.code) console.error('Code:', error.code);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    
    process.exit(1);
  }
}

createPolicies();
