-- Migration: Create notifications table
-- Purpose: Store notification history and status for the notification service
-- Date: 2026-02-10

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'claim_update',
  'document_update',
  'deadline_alert',
  'system_announcement',
  'security_alert',
  'general'
);

-- Create notification priority enum
CREATE TYPE notification_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  recipient_id UUID,
  
  -- Notification type and priority
  type notification_type NOT NULL,
  status notification_status NOT NULL DEFAULT 'pending',
  priority notification_priority NOT NULL DEFAULT 'normal',
  
  -- Content
  subject VARCHAR(255),
  body TEXT NOT NULL,
  html_body TEXT,
  
  -- Template information
  template_id VARCHAR(100),
  template_data JSONB,
  
  -- Provider information
  provider_id VARCHAR(100),
  external_message_id VARCHAR(255),
  
  -- Action button
  action_url VARCHAR(500),
  action_label VARCHAR(100),
  
  -- Delivery tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  failure_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional metadata
  metadata JSONB,
  
  -- Tracking fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_notifications_organization_id 
  ON notifications(organization_id);

CREATE INDEX idx_notifications_recipient_id 
  ON notifications(recipient_id);

CREATE INDEX idx_notifications_type 
  ON notifications(type);

CREATE INDEX idx_notifications_status 
  ON notifications(status) 
  WHERE status IN ('pending', 'failed');

CREATE INDEX idx_notifications_priority 
  ON notifications(priority, created_at DESC) 
  WHERE status = 'pending' AND priority IN ('high', 'urgent');

CREATE INDEX idx_notifications_created_at 
  ON notifications(created_at DESC);

-- Create a composite index for recipient queries
CREATE INDEX idx_notifications_recipient_status_created 
  ON notifications(recipient_id, status, created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'Notification history and delivery status tracking';
COMMENT ON COLUMN notifications.recipient_id IS 'The user receiving the notification';
COMMENT ON COLUMN notifications.provider_id IS 'The notification provider used (e.g., sendgrid, resend)';
COMMENT ON COLUMN notifications.external_message_id IS 'Message ID from the external provider';
COMMENT ON COLUMN notifications.template_data IS 'Variables used to render the notification template';
