/**
 * Force RLS on all tables
 * 
 * This ensures RLS applies even to table owners/superusers
 */

import { testDb as db } from '../db/test-db';
import { sql } from 'drizzle-orm';

async function forceRLS() {
  console.log('🔧 Forcing RLS on all tables...\n');
  
  try {
    // Force RLS (applies even to table owner)
    await db.execute(sql`ALTER TABLE messages FORCE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE message_threads FORCE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE message_participants FORCE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE in_app_notifications FORCE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE documents FORCE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE reports FORCE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE report_shares FORCE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE scheduled_reports FORCE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE calendars FORCE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE calendar_events FORCE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE event_attendees FORCE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE calendar_sharing FORCE ROW LEVEL SECURITY`);
    
    console.log('✅ Forced RLS on all tables\n');
    
    // Verify
    const check = await db.execute(sql`
      SELECT 
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN (
        'messages', 'message_threads', 'message_participants', 'in_app_notifications',
        'documents', 'reports', 'report_shares', 'scheduled_reports',
        'calendars', 'calendar_events', 'event_attendees', 'calendar_sharing'
      )
      ORDER BY tablename
    `);
    
    const results = Array.isArray(check) ? check : [];
    console.log('Verification:');
    results.forEach((row: any) => {
      console.log(`  ${row.tablename}: ${row.rls_enabled ? '✅' : '❌'}`);
    });
    
    console.log('\n✨ RLS policies will now be enforced for ALL users!');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exit(1);
  }
}

forceRLS();
