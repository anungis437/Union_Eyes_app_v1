-- ============================================================================
-- Migration: SMS Communication System (Phase 5 - Week 1)
-- Description: Complete SMS infrastructure with Twilio integration
-- Author: GitHub Copilot
-- Date: 2025-12-06
-- ============================================================================

-- ============================================================================
-- SMS TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  message_template TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  category TEXT CHECK (category IN ('notification', 'campaign', 'alert', 'reminder', 'engagement')),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT sms_template_message_length CHECK (char_length(message_template) <= 1600),
  CONSTRAINT sms_template_name_unique UNIQUE(tenant_id, name)
);

COMMENT ON TABLE sms_templates IS 'Reusable SMS templates with variable substitution';
COMMENT ON COLUMN sms_templates.message_template IS 'Template with ${variable} placeholders, max 1600 chars (10 SMS segments)';
COMMENT ON COLUMN sms_templates.variables IS 'Array of variable names used: ["firstName", "amount"]';
COMMENT ON COLUMN sms_templates.category IS 'Template category for organization';

-- ============================================================================
-- SMS MESSAGES LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES sms_campaigns(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'undelivered')),
  twilio_sid TEXT UNIQUE,
  error_code TEXT,
  error_message TEXT,
  segments INTEGER DEFAULT 1,
  price_amount DECIMAL(10, 4),
  price_currency TEXT DEFAULT 'USD',
  direction TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT sms_message_length CHECK (char_length(message) <= 1600),
  CONSTRAINT sms_phone_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

COMMENT ON TABLE sms_messages IS 'Complete SMS message delivery log with Twilio tracking';
COMMENT ON COLUMN sms_messages.twilio_sid IS 'Twilio Message SID for tracking';
COMMENT ON COLUMN sms_messages.segments IS 'Number of SMS segments (160 chars each)';
COMMENT ON COLUMN sms_messages.price_amount IS 'Cost per message in USD';
COMMENT ON COLUMN sms_messages.direction IS 'Message direction: inbound (received) or outbound (sent)';

-- ============================================================================
-- SMS CAMPAIGNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  message TEXT NOT NULL,
  template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
  recipient_filter JSONB,
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'paused', 'completed', 'failed', 'cancelled')),
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT sms_campaign_message_length CHECK (char_length(message) <= 1600)
);

COMMENT ON TABLE sms_campaigns IS 'Bulk SMS campaign management with scheduling';
COMMENT ON COLUMN sms_campaigns.recipient_filter IS 'Dynamic filter: {"role": "member", "status": "active"}';
COMMENT ON COLUMN sms_campaigns.total_cost IS 'Total campaign cost in USD';

-- ============================================================================
-- SMS CONVERSATIONS (Two-Way SMS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message TEXT NOT NULL,
  twilio_sid TEXT,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'read', 'replied', 'archived')),
  replied_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT sms_conversation_phone_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

COMMENT ON TABLE sms_conversations IS 'Two-way SMS conversation history with member replies';
COMMENT ON COLUMN sms_conversations.direction IS 'inbound: member to union, outbound: union to member';
COMMENT ON COLUMN sms_conversations.status IS 'Conversation message status for inbox management';

-- ============================================================================
-- SMS RECIPIENTS (Campaign Recipients)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message_id UUID REFERENCES sms_messages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opted_out')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT sms_recipient_phone_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$'),
  UNIQUE(campaign_id, phone_number)
);

COMMENT ON TABLE sms_campaign_recipients IS 'Individual recipient tracking for bulk SMS campaigns';

-- ============================================================================
-- SMS OPT-OUTS (TCPA Compliance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opted_out_via TEXT CHECK (opted_out_via IN ('reply_stop', 'admin', 'user_portal')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT sms_optout_phone_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$'),
  UNIQUE(tenant_id, phone_number)
);

COMMENT ON TABLE sms_opt_outs IS 'SMS opt-out list for TCPA compliance (STOP/UNSUBSCRIBE handling)';
COMMENT ON COLUMN sms_opt_outs.opted_out_via IS 'How user opted out: reply_stop, admin action, or user portal';

-- ============================================================================
-- SMS RATE LIMITS (Twilio Throttling)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  messages_sent INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 minute',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, window_start)
);

COMMENT ON TABLE sms_rate_limits IS 'Rate limiting tracking to prevent Twilio API throttling';
COMMENT ON COLUMN sms_rate_limits.messages_sent IS 'Messages sent in current window (Twilio limit: 1/sec)';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- SMS Templates
CREATE INDEX idx_sms_templates_tenant ON sms_templates(tenant_id);
CREATE INDEX idx_sms_templates_category ON sms_templates(tenant_id, category) WHERE is_active = TRUE;
CREATE INDEX idx_sms_templates_created_by ON sms_templates(created_by);

-- SMS Messages
CREATE INDEX idx_sms_messages_tenant_user ON sms_messages(tenant_id, user_id);
CREATE INDEX idx_sms_messages_phone ON sms_messages(phone_number);
CREATE INDEX idx_sms_messages_status ON sms_messages(status, created_at DESC);
CREATE INDEX idx_sms_messages_campaign ON sms_messages(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_sms_messages_sent_at ON sms_messages(sent_at DESC) WHERE sent_at IS NOT NULL;
CREATE INDEX idx_sms_messages_twilio_sid ON sms_messages(twilio_sid) WHERE twilio_sid IS NOT NULL;

-- SMS Campaigns
CREATE INDEX idx_sms_campaigns_tenant ON sms_campaigns(tenant_id);
CREATE INDEX idx_sms_campaigns_status ON sms_campaigns(tenant_id, status);
CREATE INDEX idx_sms_campaigns_scheduled ON sms_campaigns(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_sms_campaigns_created_by ON sms_campaigns(created_by);

-- SMS Conversations
CREATE INDEX idx_sms_conversations_tenant_phone ON sms_conversations(tenant_id, phone_number);
CREATE INDEX idx_sms_conversations_user ON sms_conversations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_sms_conversations_direction ON sms_conversations(direction, created_at DESC);
CREATE INDEX idx_sms_conversations_status ON sms_conversations(status) WHERE status != 'archived';
CREATE INDEX idx_sms_conversations_created_at ON sms_conversations(created_at DESC);

-- SMS Campaign Recipients
CREATE INDEX idx_sms_recipients_campaign ON sms_campaign_recipients(campaign_id);
CREATE INDEX idx_sms_recipients_status ON sms_campaign_recipients(status);
CREATE INDEX idx_sms_recipients_user ON sms_campaign_recipients(user_id) WHERE user_id IS NOT NULL;

-- SMS Opt-Outs
CREATE INDEX idx_sms_optouts_tenant_phone ON sms_opt_outs(tenant_id, phone_number);
CREATE INDEX idx_sms_optouts_user ON sms_opt_outs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_sms_optouts_date ON sms_opt_outs(opted_out_at DESC);

-- SMS Rate Limits
CREATE INDEX idx_sms_rate_limits_tenant_window ON sms_rate_limits(tenant_id, window_start);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_rate_limits ENABLE ROW LEVEL SECURITY;

-- SMS Templates Policies
CREATE POLICY sms_templates_tenant_isolation ON sms_templates
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_templates_select ON sms_templates
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_templates_insert ON sms_templates
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_templates_update ON sms_templates
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_templates_delete ON sms_templates
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- SMS Messages Policies
CREATE POLICY sms_messages_tenant_isolation ON sms_messages
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_messages_select ON sms_messages
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_messages_insert ON sms_messages
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_messages_update ON sms_messages
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- SMS Campaigns Policies
CREATE POLICY sms_campaigns_tenant_isolation ON sms_campaigns
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_campaigns_select ON sms_campaigns
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_campaigns_insert ON sms_campaigns
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_campaigns_update ON sms_campaigns
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_campaigns_delete ON sms_campaigns
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- SMS Conversations Policies
CREATE POLICY sms_conversations_tenant_isolation ON sms_conversations
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_conversations_select ON sms_conversations
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_conversations_insert ON sms_conversations
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_conversations_update ON sms_conversations
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- SMS Campaign Recipients Policies (via campaign)
CREATE POLICY sms_recipients_tenant_isolation ON sms_campaign_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sms_campaigns
      WHERE sms_campaigns.id = sms_campaign_recipients.campaign_id
      AND sms_campaigns.tenant_id = current_setting('app.current_tenant_id')::uuid
    )
  );

-- SMS Opt-Outs Policies
CREATE POLICY sms_optouts_tenant_isolation ON sms_opt_outs
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_optouts_select ON sms_opt_outs
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sms_optouts_insert ON sms_opt_outs
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- SMS Rate Limits Policies
CREATE POLICY sms_rate_limits_tenant_isolation ON sms_rate_limits
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================================
-- DEFAULT SMS TEMPLATES
-- ============================================================================

INSERT INTO sms_templates (tenant_id, name, description, message_template, variables, category) VALUES
  -- Notifications
  ('11111111-1111-1111-1111-111111111111', 'Claim Status Update', 'Notify member of claim status change', 
   'Hi ${firstName}, your claim ${claimNumber} status changed to ${status}. View details: ${url}', 
   ARRAY['firstName', 'claimNumber', 'status', 'url'], 'notification'),
  
  ('11111111-1111-1111-1111-111111111111', 'Payment Confirmation', 'Payment received confirmation', 
   'Payment confirmed! ${amount} received for ${description}. Thank you. Receipt: ${receiptUrl}', 
   ARRAY['amount', 'description', 'receiptUrl'], 'notification'),
  
  ('11111111-1111-1111-1111-111111111111', 'Dues Reminder', 'Monthly dues payment reminder', 
   'Reminder: Your ${amount} monthly dues payment is due on ${dueDate}. Pay now: ${paymentUrl}', 
   ARRAY['amount', 'dueDate', 'paymentUrl'], 'reminder'),
  
  -- Alerts
  ('11111111-1111-1111-1111-111111111111', 'Urgent Alert', 'Emergency union alert', 
   'URGENT: ${message}. For more info: ${contactNumber} or visit ${url}', 
   ARRAY['message', 'contactNumber', 'url'], 'alert'),
  
  ('11111111-1111-1111-1111-111111111111', 'Strike Update', 'Strike activity update', 
   'STRIKE UPDATE: ${title}. ${message} Check portal for full details: ${url}', 
   ARRAY['title', 'message', 'url'], 'alert'),
  
  ('11111111-1111-1111-1111-111111111111', 'Deadline Alert', 'Approaching deadline notification', 
   '${firstName}, deadline alert: ${item} due in ${daysRemaining} days (${dueDate}). Action: ${actionUrl}', 
   ARRAY['firstName', 'item', 'daysRemaining', 'dueDate', 'actionUrl'], 'alert'),
  
  -- Reminders
  ('11111111-1111-1111-1111-111111111111', 'Event Reminder', 'Upcoming event reminder', 
   'Reminder: ${eventName} on ${eventDate} at ${location}. RSVP: ${rsvpUrl}', 
   ARRAY['eventName', 'eventDate', 'location', 'rsvpUrl'], 'reminder'),
  
  ('11111111-1111-1111-1111-111111111111', 'Training Reminder', 'Course session reminder', 
   '${firstName}, your training "${courseName}" starts ${when}. Location: ${location}. Confirm: ${url}', 
   ARRAY['firstName', 'courseName', 'when', 'location', 'url'], 'reminder'),
  
  ('11111111-1111-1111-1111-111111111111', 'Document Required', 'Missing document reminder', 
   'Action needed: Please submit ${documentName} for ${purpose}. Upload here: ${uploadUrl}', 
   ARRAY['documentName', 'purpose', 'uploadUrl'], 'reminder'),
  
  -- Engagement
  ('11111111-1111-1111-1111-111111111111', 'Survey Invitation', 'Request member feedback', 
   '${firstName}, share your voice! Quick ${duration} survey: ${surveyUrl}. Your input matters!', 
   ARRAY['firstName', 'duration', 'surveyUrl'], 'engagement'),
  
  ('11111111-1111-1111-1111-111111111111', 'Poll Invitation', 'Quick poll participation', 
   'Quick poll: ${question}. Vote now: ${pollUrl}', 
   ARRAY['question', 'pollUrl'], 'engagement'),
  
  ('11111111-1111-1111-1111-111111111111', 'Newsletter Available', 'New newsletter published', 
   'New ${unionName} newsletter: ${title}. Read now: ${url}', 
   ARRAY['unionName', 'title', 'url'], 'engagement'),
  
  -- Campaigns
  ('11111111-1111-1111-1111-111111111111', 'Welcome Message', 'New member welcome', 
   'Welcome to ${unionName}, ${firstName}! We''re here to support you. Get started: ${portalUrl}', 
   ARRAY['unionName', 'firstName', 'portalUrl'], 'campaign'),
  
  ('11111111-1111-1111-1111-111111111111', 'Re-engagement', 'Inactive member re-engagement', 
   'We miss you, ${firstName}! Check out what''s new at ${unionName}: ${url}', 
   ARRAY['firstName', 'unionName', 'url'], 'campaign'),
  
  ('11111111-1111-1111-1111-111111111111', 'Action Request', 'Call to action message', 
   '${firstName}, ${actionMessage}. Take action: ${actionUrl}. Reply STOP to opt out.', 
   ARRAY['firstName', 'actionMessage', 'actionUrl'], 'campaign')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if phone number is opted out
CREATE OR REPLACE FUNCTION is_phone_opted_out(
  p_tenant_id UUID,
  p_phone_number TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sms_opt_outs
    WHERE tenant_id = p_tenant_id
    AND phone_number = p_phone_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate SMS segments (160 chars per segment, 153 if concatenated)
CREATE OR REPLACE FUNCTION calculate_sms_segments(p_message TEXT) RETURNS INTEGER AS $$
DECLARE
  message_length INTEGER;
BEGIN
  message_length := char_length(p_message);
  
  IF message_length <= 160 THEN
    RETURN 1;
  ELSE
    RETURN CEIL(message_length::DECIMAL / 153);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Render SMS template with variables
CREATE OR REPLACE FUNCTION render_sms_template(
  p_template TEXT,
  p_variables JSONB
) RETURNS TEXT AS $$
DECLARE
  rendered_message TEXT;
  variable_key TEXT;
  variable_value TEXT;
BEGIN
  rendered_message := p_template;
  
  FOR variable_key, variable_value IN SELECT key, value FROM jsonb_each_text(p_variables)
  LOOP
    rendered_message := replace(rendered_message, '${' || variable_key || '}', variable_value);
  END LOOP;
  
  RETURN rendered_message;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update campaign statistics (trigger function)
CREATE OR REPLACE FUNCTION update_campaign_statistics() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE sms_campaigns
    SET
      sent_count = (SELECT COUNT(*) FROM sms_campaign_recipients WHERE campaign_id = NEW.campaign_id AND status = 'sent'),
      delivered_count = (SELECT COUNT(*) FROM sms_campaign_recipients WHERE campaign_id = NEW.campaign_id AND status = 'delivered'),
      failed_count = (SELECT COUNT(*) FROM sms_campaign_recipients WHERE campaign_id = NEW.campaign_id AND status = 'failed'),
      updated_at = NOW()
    WHERE id = NEW.campaign_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update campaign statistics
CREATE TRIGGER update_campaign_stats_trigger
  AFTER INSERT OR UPDATE ON sms_campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_statistics();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to service role
GRANT ALL ON sms_templates TO service_role;
GRANT ALL ON sms_messages TO service_role;
GRANT ALL ON sms_campaigns TO service_role;
GRANT ALL ON sms_conversations TO service_role;
GRANT ALL ON sms_campaign_recipients TO service_role;
GRANT ALL ON sms_opt_outs TO service_role;
GRANT ALL ON sms_rate_limits TO service_role;

-- Grant SELECT to authenticated users (via RLS)
GRANT SELECT ON sms_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sms_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sms_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sms_conversations TO authenticated;
GRANT SELECT ON sms_campaign_recipients TO authenticated;
GRANT SELECT, INSERT ON sms_opt_outs TO authenticated;
GRANT SELECT ON sms_rate_limits TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'SMS Communication System migration completed - Phase 5 Week 1';
