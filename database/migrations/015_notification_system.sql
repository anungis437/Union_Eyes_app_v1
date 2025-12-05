-- Week 9-10: Notification System & Communication Hub
-- Migration: Create notification tables and enums

-- Create notification status enum
DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'partial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notification channel enum
DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'in_app');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notification type enum
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'payment_confirmation',
        'payment_failed',
        'payment_reminder',
        'donation_received',
        'stipend_approved',
        'stipend_disbursed',
        'low_balance_alert',
        'arrears_warning',
        'strike_announcement',
        'picket_reminder'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notification_queue table
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    channels TEXT[] NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    data TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    attempts NUMERIC(2,0) NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for notification_queue
CREATE INDEX IF NOT EXISTS notification_queue_tenant_idx ON notification_queue(tenant_id);
CREATE INDEX IF NOT EXISTS notification_queue_user_idx ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS notification_queue_status_idx ON notification_queue(status);
CREATE INDEX IF NOT EXISTS notification_queue_scheduled_idx ON notification_queue(scheduled_for);

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    type TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    variables TEXT NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index for notification_templates
CREATE UNIQUE INDEX IF NOT EXISTS notification_templates_unique_idx 
    ON notification_templates(tenant_id, type, channel);

-- Create notification_log table
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for notification_log
CREATE INDEX IF NOT EXISTS notification_log_notification_idx ON notification_log(notification_id);
CREATE INDEX IF NOT EXISTS notification_log_status_idx ON notification_log(status);

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    preferences TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index for user_notification_preferences
CREATE UNIQUE INDEX IF NOT EXISTS user_notification_preferences_unique_idx 
    ON user_notification_preferences(tenant_id, user_id);

-- Insert default notification templates for common types
INSERT INTO notification_templates (tenant_id, type, channel, subject, body, variables) VALUES
    -- Payment confirmation templates
    ('11111111-1111-1111-1111-111111111111', 'payment_confirmation', 'email', 
     'Payment Received - ${amount}',
     'Your payment of ${amount} has been received. Transaction ID: ${transactionId}',
     '["amount", "transactionId"]'),
    
    ('11111111-1111-1111-1111-111111111111', 'payment_confirmation', 'sms',
     NULL,
     'Payment received: ${amount}. Thank you!',
     '["amount"]'),
    
    -- Payment failed templates
    ('11111111-1111-1111-1111-111111111111', 'payment_failed', 'email',
     'Payment Failed - Action Required',
     'Your payment of ${amount} failed. Error: ${errorMessage}. Please update your payment method.',
     '["amount", "errorMessage"]'),
    
    -- Donation received templates
    ('11111111-1111-1111-1111-111111111111', 'donation_received', 'email',
     'Thank You for Your Donation',
     'Thank you for your donation of ${amount} to ${fundName}. Your support helps us continue our mission.',
     '["amount", "fundName"]'),
    
    -- Stipend approved templates
    ('11111111-1111-1111-1111-111111111111', 'stipend_approved', 'email',
     'Stipend Approved - ${amount}',
     'Your stipend of ${amount} has been approved. Expected disbursement: ${disbursementDate}',
     '["amount", "disbursementDate"]'),
    
    -- Low balance alert templates
    ('11111111-1111-1111-1111-111111111111', 'low_balance_alert', 'email',
     'Low Balance Alert - ${fundName}',
     'WARNING: ${fundName} balance is low: ${currentBalance}. Projected days remaining: ${daysRemaining}',
     '["fundName", "currentBalance", "daysRemaining"]'),
    
    -- Strike announcement templates
    ('11111111-1111-1111-1111-111111111111', 'strike_announcement', 'email',
     'Strike Update: ${title}',
     '${message}. For more information, visit your union portal.',
     '["title", "message"]'),
    
    ('11111111-1111-1111-1111-111111111111', 'strike_announcement', 'sms',
     NULL,
     'STRIKE UPDATE: ${title}. Check portal for details.',
     '["title"]')
ON CONFLICT (tenant_id, type, channel) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE notification_queue IS 'Queue for pending and sent notifications';
COMMENT ON TABLE notification_templates IS 'Customizable notification templates with variable substitution';
COMMENT ON TABLE user_notification_preferences IS 'Per-user notification channel preferences';
COMMENT ON TABLE notification_log IS 'Delivery attempt log for audit and debugging';

COMMENT ON COLUMN notification_queue.channels IS 'Array of channels: email, sms, push, in_app';
COMMENT ON COLUMN notification_queue.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN notification_queue.data IS 'JSON string with template variables';
COMMENT ON COLUMN notification_queue.status IS 'Status: pending, sent, failed, partial';
COMMENT ON COLUMN notification_queue.attempts IS 'Number of delivery attempts (max 3)';

COMMENT ON COLUMN notification_templates.variables IS 'JSON array of variable names used in template';
COMMENT ON COLUMN notification_templates.body IS 'Template body with ${variable} placeholders';

COMMENT ON COLUMN user_notification_preferences.preferences IS 'JSON object with type_channel keys';

COMMENT ON COLUMN notification_log.status IS 'Delivery status: delivered, failed, bounced';
