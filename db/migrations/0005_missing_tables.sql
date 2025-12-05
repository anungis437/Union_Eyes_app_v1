-- Migration: Missing Tables for Reports, Deadlines, Calendar, Notifications, and Member Documents
-- This migration adds tables that are defined in schema but missing from Azure PostgreSQL

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Report enums
DO $$ BEGIN
  CREATE TYPE report_type AS ENUM ('custom', 'template', 'system', 'scheduled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_category AS ENUM ('claims', 'members', 'financial', 'compliance', 'performance', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_format AS ENUM ('pdf', 'excel', 'csv', 'json', 'html');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE schedule_frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Deadline enums
DO $$ BEGIN
  CREATE TYPE deadline_status AS ENUM ('pending', 'completed', 'missed', 'extended', 'waived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE deadline_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE extension_status AS ENUM ('pending', 'approved', 'denied', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'urgent', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_method AS ENUM ('email', 'sms', 'push', 'in_app');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Calendar enums
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('meeting', 'appointment', 'deadline', 'reminder', 'task', 'hearing', 'mediation', 'negotiation', 'training', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE attendee_status AS ENUM ('invited', 'accepted', 'declined', 'tentative', 'no_response');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE room_status AS ENUM ('available', 'booked', 'maintenance', 'unavailable');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE calendar_permission AS ENUM ('owner', 'editor', 'viewer', 'none');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM ('synced', 'pending', 'failed', 'disconnected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notification enums
DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'in-app', 'multi');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'partial', 'pending');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE digest_frequency AS ENUM ('immediate', 'daily', 'weekly', 'never');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- REPORTS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type report_type NOT NULL DEFAULT 'custom',
  category report_category NOT NULL DEFAULT 'custom',
  config JSONB NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_template BOOLEAN NOT NULL DEFAULT false,
  template_id UUID,
  created_by UUID NOT NULL,
  updated_by UUID,
  last_run_at TIMESTAMP,
  run_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category report_category NOT NULL,
  config JSONB NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  thumbnail VARCHAR(500),
  tags JSONB,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  executed_by UUID NOT NULL,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  format report_format NOT NULL DEFAULT 'pdf',
  parameters JSONB,
  result_count VARCHAR(50),
  execution_time_ms VARCHAR(50),
  file_url VARCHAR(500),
  file_size VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  frequency schedule_frequency NOT NULL,
  day_of_week VARCHAR(20),
  day_of_month VARCHAR(20),
  time_of_day VARCHAR(10) NOT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  format report_format NOT NULL DEFAULT 'pdf',
  recipients JSONB NOT NULL,
  parameters JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_executed_at TIMESTAMP,
  next_execution_at TIMESTAMP,
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  shared_by UUID NOT NULL,
  shared_with UUID,
  shared_with_email VARCHAR(255),
  permission VARCHAR(50) NOT NULL DEFAULT 'viewer',
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- DEADLINES TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS deadline_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  rule_code VARCHAR(100) NOT NULL,
  description TEXT,
  claim_type VARCHAR(100),
  priority_level VARCHAR(50),
  step_number INTEGER,
  days_from_event INTEGER NOT NULL,
  event_type VARCHAR(100) NOT NULL DEFAULT 'claim_filed',
  business_days_only BOOLEAN NOT NULL DEFAULT true,
  allows_extension BOOLEAN NOT NULL DEFAULT true,
  max_extension_days INTEGER NOT NULL DEFAULT 30,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  escalate_to_role VARCHAR(100),
  escalation_delay_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system_rule BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claim_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  deadline_rule_id UUID,
  deadline_name VARCHAR(255) NOT NULL,
  deadline_type VARCHAR(100) NOT NULL,
  event_date TIMESTAMP NOT NULL,
  original_deadline TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status deadline_status NOT NULL DEFAULT 'pending',
  priority deadline_priority NOT NULL DEFAULT 'medium',
  extension_count INTEGER NOT NULL DEFAULT 0,
  total_extension_days INTEGER NOT NULL DEFAULT 0,
  last_extension_date TIMESTAMP,
  last_extension_reason TEXT,
  completed_by UUID,
  completion_notes TEXT,
  is_overdue BOOLEAN NOT NULL DEFAULT false,
  days_until_due INTEGER,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  escalated_at TIMESTAMP,
  escalated_to UUID,
  alert_count INTEGER NOT NULL DEFAULT 0,
  last_alert_sent TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deadline_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  requested_days INTEGER NOT NULL,
  request_reason TEXT NOT NULL,
  status extension_status NOT NULL DEFAULT 'pending',
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID,
  approval_decision_at TIMESTAMP,
  approval_notes TEXT,
  new_deadline TIMESTAMP,
  days_granted INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deadline_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  alert_type VARCHAR(100) NOT NULL,
  alert_severity alert_severity NOT NULL,
  alert_trigger VARCHAR(100) NOT NULL,
  recipient_id UUID NOT NULL,
  recipient_role VARCHAR(100),
  delivery_method delivery_method NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMP,
  delivery_status delivery_status NOT NULL DEFAULT 'pending',
  delivery_error TEXT,
  viewed_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  action_taken VARCHAR(255),
  action_taken_at TIMESTAMP,
  subject VARCHAR(500),
  message TEXT,
  action_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255),
  holiday_date TIMESTAMP NOT NULL,
  holiday_name VARCHAR(255) NOT NULL,
  holiday_type VARCHAR(100) NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  applies_to VARCHAR(100) NOT NULL DEFAULT 'all',
  is_observed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CALENDAR TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50),
  owner_id TEXT NOT NULL,
  is_personal BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  external_provider VARCHAR(50),
  external_calendar_id TEXT,
  sync_enabled BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP,
  sync_status sync_status DEFAULT 'disconnected',
  sync_token TEXT,
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  default_event_duration INTEGER DEFAULT 60,
  reminder_default_minutes INTEGER DEFAULT 15,
  allow_overlap BOOLEAN DEFAULT true,
  require_approval BOOLEAN DEFAULT false,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  location_url TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  is_all_day BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  recurrence_exceptions JSONB,
  parent_event_id UUID,
  event_type event_type DEFAULT 'meeting',
  status event_status DEFAULT 'scheduled',
  priority VARCHAR(20) DEFAULT 'normal',
  claim_id TEXT,
  case_number TEXT,
  member_id TEXT,
  meeting_room_id UUID,
  meeting_url TEXT,
  meeting_password TEXT,
  agenda TEXT,
  organizer_id TEXT NOT NULL,
  reminders JSONB DEFAULT '[15]',
  external_event_id TEXT,
  external_provider VARCHAR(50),
  external_html_link TEXT,
  last_sync_at TIMESTAMP,
  is_private BOOLEAN DEFAULT false,
  visibility VARCHAR(20) DEFAULT 'default',
  metadata JSONB,
  attachments JSONB,
  created_by TEXT NOT NULL,
  cancelled_at TIMESTAMP,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  email TEXT NOT NULL,
  name TEXT,
  status attendee_status DEFAULT 'invited',
  is_optional BOOLEAN DEFAULT false,
  is_organizer BOOLEAN DEFAULT false,
  responded_at TIMESTAMP,
  response_comment TEXT,
  notification_sent BOOLEAN DEFAULT false,
  last_notification_at TIMESTAMP,
  external_attendee_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  building_name VARCHAR(200),
  floor VARCHAR(50),
  room_number VARCHAR(50),
  address TEXT,
  capacity INTEGER DEFAULT 10,
  features JSONB,
  equipment JSONB,
  status room_status DEFAULT 'available',
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  min_booking_duration INTEGER DEFAULT 30,
  max_booking_duration INTEGER DEFAULT 480,
  advance_booking_days INTEGER DEFAULT 90,
  operating_hours JSONB,
  allowed_user_roles JSONB,
  blocked_dates JSONB,
  contact_person_id TEXT,
  contact_email TEXT,
  contact_phone VARCHAR(20),
  image_url TEXT,
  floor_plan_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  event_id UUID,
  tenant_id TEXT NOT NULL,
  booked_by TEXT NOT NULL,
  booked_for TEXT,
  purpose TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  setup_required BOOLEAN DEFAULT false,
  setup_time INTEGER DEFAULT 0,
  catering_required BOOLEAN DEFAULT false,
  catering_notes TEXT,
  special_requests TEXT,
  status event_status DEFAULT 'scheduled',
  requires_approval BOOLEAN DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMP,
  approval_notes TEXT,
  checked_in_at TIMESTAMP,
  checked_in_by TEXT,
  checked_out_at TIMESTAMP,
  actual_end_time TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  attendee_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  shared_with_user_id TEXT,
  shared_with_email TEXT,
  shared_with_role VARCHAR(50),
  permission calendar_permission DEFAULT 'viewer',
  can_create_events BOOLEAN DEFAULT false,
  can_edit_events BOOLEAN DEFAULT false,
  can_delete_events BOOLEAN DEFAULT false,
  can_share BOOLEAN DEFAULT false,
  invited_by TEXT NOT NULL,
  invited_at TIMESTAMP NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_account_id TEXT NOT NULL,
  provider_email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  scope TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction VARCHAR(20) DEFAULT 'both',
  last_sync_at TIMESTAMP,
  next_sync_at TIMESTAMP,
  sync_status sync_status DEFAULT 'synced',
  sync_error TEXT,
  sync_past_days INTEGER DEFAULT 30,
  sync_future_days INTEGER DEFAULT 365,
  sync_only_free_time BOOLEAN DEFAULT false,
  calendar_mappings JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  reminder_minutes INTEGER NOT NULL,
  reminder_type VARCHAR(20) DEFAULT 'notification',
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  action_label TEXT,
  action_url TEXT,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  tenant_id TEXT,
  recipient TEXT NOT NULL,
  channel notification_channel NOT NULL,
  subject TEXT,
  template TEXT,
  status notification_status NOT NULL,
  error TEXT,
  sent_at TIMESTAMP NOT NULL,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  metadata JSONB
);

-- ============================================================================
-- MEMBER DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS member_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

-- Calendar foreign keys
DO $$ BEGIN
  ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_calendar_id_fk 
    FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE event_attendees ADD CONSTRAINT event_attendees_event_id_fk 
    FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE room_bookings ADD CONSTRAINT room_bookings_room_id_fk 
    FOREIGN KEY (room_id) REFERENCES meeting_rooms(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE room_bookings ADD CONSTRAINT room_bookings_event_id_fk 
    FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE calendar_sharing ADD CONSTRAINT calendar_sharing_calendar_id_fk 
    FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE event_reminders ADD CONSTRAINT event_reminders_event_id_fk 
    FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_tenant_id ON reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_report_executions_report_id ON report_executions(report_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_execution ON scheduled_reports(next_execution_at) WHERE is_active = true;

-- Deadlines indexes
CREATE INDEX IF NOT EXISTS idx_deadline_rules_tenant_id ON deadline_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_claim_deadlines_claim_id ON claim_deadlines(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_deadlines_due_date ON claim_deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_claim_deadlines_status ON claim_deadlines(status);
CREATE INDEX IF NOT EXISTS idx_deadline_extensions_deadline_id ON deadline_extensions(deadline_id);
CREATE INDEX IF NOT EXISTS idx_deadline_alerts_deadline_id ON deadline_alerts(deadline_id);

-- Calendar indexes
CREATE INDEX IF NOT EXISTS idx_calendars_owner_id ON calendars(owner_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_id ON calendar_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer_id ON calendar_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_id ON room_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_start_time ON room_bookings(start_time);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_read ON in_app_notifications(read);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);

-- Member documents indexes
CREATE INDEX IF NOT EXISTS idx_member_documents_user_id ON member_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_member_documents_category ON member_documents(category);
