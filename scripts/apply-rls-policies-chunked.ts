/**
 * Apply RLS Policies for Documents, Reports, and Calendars
 * 
 * This script applies RLS policies in smaller chunks to avoid execution issues
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

const policies = [
  // Helper functions
  {
    name: 'Create helper functions',
    sql: `
      CREATE OR REPLACE FUNCTION current_user_id()
      RETURNS TEXT AS $$
      BEGIN
        RETURN current_setting('app.current_user_id', true);
      END;
      $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
    `
  },
  {
    name: 'current_tenant_id function',
    sql: `
      CREATE OR REPLACE FUNCTION current_tenant_id()
      RETURNS TEXT AS $$
      BEGIN
        RETURN current_setting('app.current_tenant_id', true);
      EXCEPTION
        WHEN OTHERS THEN
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
    `
  },
  // Documents table
  {
    name: 'Enable RLS on documents',
    sql: `ALTER TABLE documents ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Drop old documents policies',
    sql: `
      DROP POLICY IF EXISTS "member_documents_own_access"  ON documents;
      DROP POLICY IF EXISTS "member_documents_org_admin_access" ON documents;
      DROP POLICY IF EXISTS "member_documents_own_insert" ON documents;
      DROP POLICY IF EXISTS "member_documents_own_update" ON documents;
      DROP POLICY IF EXISTS "member_documents_own_delete" ON documents;
    `
  },
  {
    name: 'Documents read own policy',
    sql: `
      CREATE POLICY "documents_read_own" ON documents
      FOR SELECT
      TO public
      USING (uploaded_by = current_user_id());
    `
  },
  {
    name: 'Documents create own policy',
    sql: `
      CREATE POLICY "documents_create_own" ON documents
      FOR INSERT
      TO public
      WITH CHECK (
        uploaded_by = current_user_id()
        AND tenant_id = current_tenant_id()
      );
    `
  },
  {
    name: 'Documents update own policy',
    sql: `
      CREATE POLICY "documents_update_own" ON documents
      FOR UPDATE
      TO public
      USING (uploaded_by = current_user_id())
      WITH CHECK (uploaded_by = current_user_id());
    `
  },
  {
    name: 'Documents delete own policy',
    sql: `
      CREATE POLICY "documents_delete_own" ON documents
      FOR DELETE
      TO public
      USING (uploaded_by = current_user_id());
    `
  },
  // Reports table
  {
    name: 'Enable RLS on reports',
    sql: `ALTER TABLE reports ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Drop old reports policies',
    sql: `
      DROP POLICY IF EXISTS "reports_tenant_isolation" ON reports;
      DROP POLICY IF EXISTS "reports_public_access" ON reports;
      DROP POLICY IF EXISTS "reports_creator_access" ON reports;
    `
  },
  {
    name: 'Reports read tenant policy',
    sql: `
      CREATE POLICY "reports_read_tenant" ON reports
      FOR SELECT
      TO public
      USING (
        tenant_id = current_tenant_id()
        OR is_public = true
      );
    `
  },
  {
    name: 'Reports create tenant policy',
    sql: `
      CREATE POLICY "reports_create_tenant" ON reports
      FOR INSERT
      TO public
      WITH CHECK (
        tenant_id = current_tenant_id()
        AND created_by = current_user_id()
      );
    `
  },
  {
    name: 'Reports update own policy',
    sql: `
      CREATE POLICY "reports_update_own" ON reports
      FOR UPDATE
      TO public
      USING (created_by = current_user_id())
      WITH CHECK (created_by = current_user_id());
    `
  },
  // Report Shares
  {
    name: 'Enable RLS on report_shares',
    sql: `ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Drop old report_shares policies',
    sql: `
      DROP POLICY IF EXISTS "report_shares_participant_access" ON report_shares;
      DROP POLICY IF EXISTS "report_shares_owner_manage" ON report_shares;
    `
  },
  {
    name: 'Report shares read participant policy',
    sql: `
      CREATE POLICY "report_shares_read_participant" ON report_shares
      FOR SELECT
      TO public
      USING (
        shared_by = current_user_id()
        OR shared_with = current_user_id()
      );
    `
  },
  {
    name: 'Report shares create owner policy',
    sql: `
      CREATE POLICY "report_shares_create_owner" ON report_shares
      FOR INSERT
      TO public
      WITH CHECK (
        shared_by = current_user_id()
        AND tenant_id = current_tenant_id()
      );
    `
  },
  // Scheduled Reports
  {
    name: 'Enable RLS on scheduled_reports',
    sql: `ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Drop old scheduled_reports policies',
    sql: `
      DROP POLICY IF EXISTS "scheduled_reports_creator_access" ON scheduled_reports;
    `
  },
  {
    name: 'Scheduled reports read own policy',
    sql: `
      CREATE POLICY "scheduled_reports_read_own" ON scheduled_reports
      FOR SELECT
      TO public
      USING (created_by = current_user_id());
    `
  },
  {
    name: 'Scheduled reports create own policy',
    sql: `
      CREATE POLICY "scheduled_reports_create_own" ON scheduled_reports
      FOR INSERT
      TO public
      WITH CHECK (
        created_by = current_user_id()
        AND tenant_id = current_tenant_id()
      );
    `
  },
  // Calendars
  {
    name: 'Enable RLS on calendars',
    sql: `ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Drop old calendars policies',
    sql: `
      DROP POLICY IF EXISTS "calendars_owner_access" ON calendars;
      DROP POLICY IF EXISTS "calendars_shared_access" ON calendars;
    `
  },
  {
    name: 'Calendars read own policy',
    sql: `
      CREATE POLICY "calendars_read_own" ON calendars
      FOR SELECT
      TO public
      USING (owner_id = current_user_id());
    `
  },
  {
    name: 'Calendars read shared policy',
    sql: `
      CREATE POLICY "calendars_read_shared" ON calendars
      FOR SELECT
      TO public
      USING (
        id IN (
          SELECT calendar_id 
          FROM calendar_sharing 
          WHERE shared_with_user_id = current_user_id()
        )
      );
    `
  },
  {
    name: 'Calendars create own policy',
    sql: `
      CREATE POLICY "calendars_create_own" ON calendars
      FOR INSERT
      TO public
      WITH CHECK (
        owner_id = current_user_id()
        AND tenant_id = current_tenant_id()
      );
    `
  },
  {
    name: 'Calendars update own policy',
    sql: `
      CREATE POLICY "calendars_update_own" ON calendars
      FOR UPDATE
      TO public
      USING (owner_id = current_user_id())
      WITH CHECK (owner_id = current_user_id());
    `
  },
  // Calendar Events
  {
    name: 'Enable RLS on calendar_events',
    sql: `ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Drop old calendar_events policies',
    sql: `
      DROP POLICY IF EXISTS "calendar_events_calendar_access" ON calendar_events;
      DROP POLICY IF EXISTS "calendar_events_edit_permission" ON calendar_events;
    `
  },
  {
    name: 'Calendar events read access policy',
    sql: `
      CREATE POLICY "calendar_events_read_access" ON calendar_events
      FOR SELECT
      TO public
      USING (
        calendar_id IN (
          SELECT id FROM calendars 
          WHERE owner_id = current_user_id()
             OR id IN (
               SELECT calendar_id FROM calendar_sharing 
               WHERE shared_with_user_id = current_user_id()
             )
        )
      );
    `
  },
  {
    name: 'Calendar events create owner policy',
    sql: `
      CREATE POLICY "calendar_events_create_owner" ON calendar_events
      FOR INSERT
      TO public
      WITH CHECK (
        calendar_id IN (SELECT id FROM calendars WHERE owner_id = current_user_id())
        AND tenant_id = current_tenant_id()
      );
    `
  },
  {
    name: 'Calendar events create shared policy',
    sql: `
      CREATE POLICY "calendar_events_create_shared" ON calendar_events
      FOR INSERT
      TO public
      WITH CHECK (
        calendar_id IN (
          SELECT calendar_id FROM calendar_sharing 
          WHERE shared_with_user_id = current_user_id()
            AND can_create_events = true
        )
        AND tenant_id = current_tenant_id()
      );
    `
  },
  {
    name: 'Calendar events update owner policy',
    sql: `
      CREATE POLICY "calendar_events_update_owner" ON calendar_events
      FOR UPDATE
      TO public
      USING (
        calendar_id IN (SELECT id FROM calendars WHERE owner_id = current_user_id())
      )
      WITH CHECK (
        calendar_id IN (SELECT id FROM calendars WHERE owner_id = current_user_id())
      );
    `
  },
  {
    name: 'Calendar events update shared policy',
    sql: `
      CREATE POLICY "calendar_events_update_shared" ON calendar_events
      FOR UPDATE
      TO public
      USING (
        calendar_id IN (
          SELECT calendar_id FROM calendar_sharing 
          WHERE shared_with_user_id = current_user_id()
            AND can_edit_events = true
        )
      )
      WITH CHECK (
        calendar_id IN (
          SELECT calendar_id FROM calendar_sharing 
          WHERE shared_with_user_id = current_user_id()
            AND can_edit_events = true
        )
      );
    `
  },
  // Event Attendees
  {
    name: 'Enable RLS on event_attendees',
    sql: `ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Drop old event_attendees policies',
    sql: `
      DROP POLICY IF EXISTS "event_attendees_self_management" ON event_attendees;
      DROP POLICY IF EXISTS "event_attendees_organizer_access" ON event_attendees;
    `
  },
  {
    name: 'Event attendees read own policy',
    sql: `
      CREATE POLICY "event_attendees_read_own" ON event_attendees
      FOR SELECT
      TO public
      USING (user_id = current_user_id());
    `
  },
  {
    name: 'Event attendees read organizer policy',
    sql: `
      CREATE POLICY "event_attendees_read_organizer" ON event_attendees
      FOR SELECT
      TO public
      USING (
        event_id IN (
          SELECT ce.id FROM calendar_events ce
          INNER JOIN calendars c ON ce.calendar_id = c.id
          WHERE c.owner_id = current_user_id()
        )
      );
    `
  },
  {
    name: 'Event attendees create organizer policy',
    sql: `
      CREATE POLICY "event_attendees_create_organizer" ON event_attendees
      FOR INSERT
      TO public
      WITH CHECK (
        event_id IN (
          SELECT ce.id FROM calendar_events ce
          INNER JOIN calendars c ON ce.calendar_id = c.id
          WHERE c.owner_id = current_user_id()
        )
        AND tenant_id = current_tenant_id()
      );
    `
  },
  {
    name: 'Event attendees update own policy',
    sql: `
      CREATE POLICY "event_attendees_update_own" ON event_attendees
      FOR UPDATE
      TO public
      USING (user_id = current_user_id())
      WITH CHECK (user_id = current_user_id());
    `
  },
  // Calendar Sharing
  {
    name: 'Enable RLS on calendar_sharing',
    sql: `ALTER TABLE calendar_sharing ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Drop old calendar_sharing policies',
    sql: `
      DROP POLICY IF EXISTS "calendar_sharing_owner_manage" ON calendar_sharing;
      DROP POLICY IF EXISTS "calendar_sharing_participant_view" ON calendar_sharing;
    `
  },
  {
    name: 'Calendar sharing read participant policy',
    sql: `
      CREATE POLICY "calendar_sharing_read_participant" ON calendar_sharing
      FOR SELECT
      TO public
      USING (
        invited_by = current_user_id()
        OR shared_with_user_id = current_user_id()
      );
    `
  },
  {
    name: 'Calendar sharing create owner policy',
    sql: `
      CREATE POLICY "calendar_sharing_create_owner" ON calendar_sharing
      FOR INSERT
      TO public
      WITH CHECK (
        calendar_id IN (SELECT id FROM calendars WHERE owner_id = current_user_id())
        AND invited_by = current_user_id()
        AND tenant_id = current_tenant_id()
      );
    `
  },
];

async function applyPolicies() {
  console.log('🚀 Applying RLS policies...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const policy of policies) {
    try {
      console.log(`⚙️  ${policy.name}...`);
      await db.execute(sql.raw(policy.sql));
      console.log(`✅ ${policy.name} - Success\n`);
      successCount++;
    } catch (error: unknown) {
      console.log(`⚠️  ${policy.name} - ${error.message}\n`);
      failCount++;
    }
  }
  
  console.log('\n========================================');
  console.log(`✅ Success: ${successCount} policies`);
  console.log(`⚠️  Failed: ${failCount} policies`);
  console.log('========================================\n');
  
  if (failCount == 0) {
    console.log('🎉 All policies applied successfully!');
    process.exit(0);
  } else {
    console.log('⚠️  Some policies failed to apply (may be expected if they already exist)');
    process.exit(0);
  }
}

applyPolicies();
