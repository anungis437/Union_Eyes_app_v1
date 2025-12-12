-- Phase 5 Week 4: Communication Analytics & Push Notifications
-- Database schema for tracking communication engagement and push notifications

-- Communication analytics summary (materialized view data)
CREATE TABLE communication_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  channel VARCHAR(50) NOT NULL, -- email, sms, push, newsletter
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  messages_opened INTEGER DEFAULT 0,
  messages_clicked INTEGER DEFAULT 0,
  unique_recipients INTEGER DEFAULT 0,
  opt_outs INTEGER DEFAULT 0,
  bounces INTEGER DEFAULT 0,
  complaints INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2), -- (opened + clicked) / delivered * 100
  delivery_rate DECIMAL(5,2), -- delivered / sent * 100
  open_rate DECIMAL(5,2), -- opened / delivered * 100
  click_rate DECIMAL(5,2), -- clicked / delivered * 100
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, date, channel)
);

-- User engagement scores
CREATE TABLE user_engagement_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  overall_score INTEGER DEFAULT 0, -- 0-100
  email_score INTEGER DEFAULT 0,
  sms_score INTEGER DEFAULT 0,
  push_score INTEGER DEFAULT 0,
  last_email_open TIMESTAMP WITH TIME ZONE,
  last_sms_reply TIMESTAMP WITH TIME ZONE,
  last_push_open TIMESTAMP WITH TIME ZONE,
  total_emails_received INTEGER DEFAULT 0,
  total_emails_opened INTEGER DEFAULT 0,
  total_sms_received INTEGER DEFAULT 0,
  total_sms_replied INTEGER DEFAULT 0,
  total_push_received INTEGER DEFAULT 0,
  total_push_opened INTEGER DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Push notification devices
CREATE TABLE push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token VARCHAR(500) NOT NULL,
  device_type VARCHAR(50) NOT NULL, -- ios, android, web
  device_name VARCHAR(255),
  platform_version VARCHAR(50),
  app_version VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(device_token)
);

-- Push notification messages
CREATE TABLE push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  icon_url TEXT,
  badge_count INTEGER,
  sound VARCHAR(100),
  click_action TEXT, -- Deep link or URL
  priority VARCHAR(20) DEFAULT 'normal', -- high, normal, low
  ttl INTEGER DEFAULT 86400, -- Time to live in seconds
  data JSONB, -- Additional custom data
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, sent, failed
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  recipient_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Push notification recipients
CREATE TABLE push_notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES push_notifications(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES push_devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, failed, opened
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  fcm_message_id VARCHAR(255), -- Firebase Cloud Messaging ID
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communication preferences (consolidated across all channels)
CREATE TABLE communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  newsletter_enabled BOOLEAN DEFAULT true,
  marketing_enabled BOOLEAN DEFAULT false,
  grievance_updates BOOLEAN DEFAULT true,
  training_reminders BOOLEAN DEFAULT true,
  deadline_alerts BOOLEAN DEFAULT true,
  strike_fund_updates BOOLEAN DEFAULT true,
  dues_reminders BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_communication_analytics_tenant_date ON communication_analytics(tenant_id, date DESC);
CREATE INDEX idx_communication_analytics_channel ON communication_analytics(tenant_id, channel, date DESC);

CREATE INDEX idx_user_engagement_scores_tenant ON user_engagement_scores(tenant_id);
CREATE INDEX idx_user_engagement_scores_user ON user_engagement_scores(user_id);
CREATE INDEX idx_user_engagement_scores_overall ON user_engagement_scores(tenant_id, overall_score DESC);

CREATE INDEX idx_push_devices_tenant ON push_devices(tenant_id);
CREATE INDEX idx_push_devices_user ON push_devices(user_id);
CREATE INDEX idx_push_devices_token ON push_devices(device_token);
CREATE INDEX idx_push_devices_active ON push_devices(tenant_id, is_active);

CREATE INDEX idx_push_notifications_tenant ON push_notifications(tenant_id);
CREATE INDEX idx_push_notifications_status ON push_notifications(tenant_id, status);
CREATE INDEX idx_push_notifications_scheduled ON push_notifications(scheduled_at) WHERE status = 'scheduled';

CREATE INDEX idx_push_notification_recipients_notification ON push_notification_recipients(notification_id);
CREATE INDEX idx_push_notification_recipients_device ON push_notification_recipients(device_id);
CREATE INDEX idx_push_notification_recipients_user ON push_notification_recipients(user_id);
CREATE INDEX idx_push_notification_recipients_status ON push_notification_recipients(notification_id, status);

CREATE INDEX idx_communication_preferences_tenant ON communication_preferences(tenant_id);
CREATE INDEX idx_communication_preferences_user ON communication_preferences(user_id);

-- Row Level Security Policies
ALTER TABLE communication_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;

-- Communication analytics policies
CREATE POLICY communication_analytics_tenant_isolation ON communication_analytics
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY communication_analytics_insert ON communication_analytics
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- User engagement scores policies
CREATE POLICY user_engagement_scores_tenant_isolation ON user_engagement_scores
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY user_engagement_scores_insert ON user_engagement_scores
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Push devices policies
CREATE POLICY push_devices_tenant_isolation ON push_devices
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY push_devices_insert ON push_devices
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY push_devices_user_access ON push_devices
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid 
    AND user_id = current_setting('app.current_user_id')::uuid
  );

-- Push notifications policies
CREATE POLICY push_notifications_tenant_isolation ON push_notifications
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY push_notifications_insert ON push_notifications
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Push notification recipients policies
CREATE POLICY push_notification_recipients_tenant_isolation ON push_notification_recipients
  USING (EXISTS (
    SELECT 1 FROM push_notifications 
    WHERE push_notifications.id = push_notification_recipients.notification_id 
    AND push_notifications.tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

CREATE POLICY push_notification_recipients_insert ON push_notification_recipients
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM push_notifications 
    WHERE push_notifications.id = push_notification_recipients.notification_id 
    AND push_notifications.tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

-- Communication preferences policies
CREATE POLICY communication_preferences_tenant_isolation ON communication_preferences
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY communication_preferences_insert ON communication_preferences
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY communication_preferences_user_access ON communication_preferences
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid 
    AND user_id = current_setting('app.current_user_id')::uuid
  );

-- Triggers for updated_at
CREATE TRIGGER update_communication_analytics_updated_at
  BEFORE UPDATE ON communication_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_engagement_scores_updated_at
  BEFORE UPDATE ON user_engagement_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_devices_updated_at
  BEFORE UPDATE ON push_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_notifications_updated_at
  BEFORE UPDATE ON push_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_preferences_updated_at
  BEFORE UPDATE ON communication_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update push notification stats
CREATE OR REPLACE FUNCTION update_push_notification_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE push_notifications 
    SET recipient_count = recipient_count + 1
    WHERE id = NEW.notification_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
      UPDATE push_notifications 
      SET success_count = success_count + 1
      WHERE id = NEW.notification_id;
    ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
      UPDATE push_notifications 
      SET failure_count = failure_count + 1
      WHERE id = NEW.notification_id;
    END IF;
    
    IF NEW.opened_at IS NOT NULL AND OLD.opened_at IS NULL THEN
      UPDATE push_notifications 
      SET open_count = open_count + 1
      WHERE id = NEW.notification_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_notification_recipient_stats_trigger
  AFTER INSERT OR UPDATE ON push_notification_recipients
  FOR EACH ROW EXECUTE FUNCTION update_push_notification_stats();

-- Function to calculate engagement scores (run daily via cron)
CREATE OR REPLACE FUNCTION calculate_engagement_scores(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_engagement_scores (
    tenant_id,
    user_id,
    overall_score,
    email_score,
    sms_score,
    push_score,
    total_emails_received,
    total_emails_opened,
    total_sms_received,
    total_sms_replied,
    total_push_received,
    total_push_opened,
    calculated_at
  )
  SELECT 
    p_tenant_id,
    u.id as user_id,
    -- Overall score: weighted average of all channels
    COALESCE(
      (
        (CASE WHEN email_received > 0 THEN (email_opened::float / email_received * 100) ELSE 0 END * 0.4) +
        (CASE WHEN sms_received > 0 THEN (sms_replied::float / sms_received * 100) ELSE 0 END * 0.3) +
        (CASE WHEN push_received > 0 THEN (push_opened::float / push_received * 100) ELSE 0 END * 0.3)
      )::integer,
      0
    ) as overall_score,
    CASE WHEN email_received > 0 THEN (email_opened::float / email_received * 100)::integer ELSE 0 END as email_score,
    CASE WHEN sms_received > 0 THEN (sms_replied::float / sms_received * 100)::integer ELSE 0 END as sms_score,
    CASE WHEN push_received > 0 THEN (push_opened::float / push_received * 100)::integer ELSE 0 END as push_score,
    email_received,
    email_opened,
    sms_received,
    sms_replied,
    push_received,
    push_opened,
    NOW()
  FROM users u
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*) FILTER (WHERE nr.status = 'sent') as email_received,
      COUNT(*) FILTER (WHERE nr.opened_at IS NOT NULL) as email_opened
    FROM newsletter_recipients nr
    WHERE nr.user_id = u.id
  ) email_stats ON true
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*) as sms_received,
      COUNT(*) FILTER (WHERE sm.direction = 'inbound') as sms_replied
    FROM sms_messages sm
    WHERE sm.user_id = u.id
  ) sms_stats ON true
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*) as push_received,
      COUNT(*) FILTER (WHERE pnr.opened_at IS NOT NULL) as push_opened
    FROM push_notification_recipients pnr
    WHERE pnr.user_id = u.id
  ) push_stats ON true
  WHERE u.tenant_id = p_tenant_id
  ON CONFLICT (tenant_id, user_id) 
  DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    email_score = EXCLUDED.email_score,
    sms_score = EXCLUDED.sms_score,
    push_score = EXCLUDED.push_score,
    total_emails_received = EXCLUDED.total_emails_received,
    total_emails_opened = EXCLUDED.total_emails_opened,
    total_sms_received = EXCLUDED.total_sms_received,
    total_sms_replied = EXCLUDED.total_sms_replied,
    total_push_received = EXCLUDED.total_push_received,
    total_push_opened = EXCLUDED.total_push_opened,
    calculated_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
