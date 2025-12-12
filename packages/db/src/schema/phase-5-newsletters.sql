-- Phase 5 Week 3: Newsletter Builder
-- Database schema for newsletter creation, scheduling, and tracking

-- Newsletter templates for reusable designs
CREATE TABLE newsletter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  html_content TEXT NOT NULL,
  json_content JSONB, -- TipTap JSON structure
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Newsletter campaigns
CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES newsletter_templates(id) ON DELETE SET NULL,
  subject VARCHAR(500) NOT NULL,
  preview_text VARCHAR(255), -- Email preview text
  from_name VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  reply_to VARCHAR(255),
  html_content TEXT NOT NULL,
  json_content JSONB, -- TipTap JSON structure
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, sent, failed
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  recipient_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Newsletter recipients (tracking who received each newsletter)
CREATE TABLE newsletter_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, failed, bounced
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  bounce_reason TEXT,
  error_message TEXT,
  metadata JSONB, -- Additional recipient-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Newsletter links for click tracking
CREATE TABLE newsletter_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_text VARCHAR(500),
  click_count INTEGER DEFAULT 0,
  unique_click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Newsletter link clicks for detailed tracking
CREATE TABLE newsletter_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES newsletter_recipients(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES newsletter_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referer TEXT
);

-- Indexes for performance
CREATE INDEX idx_newsletter_templates_tenant ON newsletter_templates(tenant_id);
CREATE INDEX idx_newsletter_templates_default ON newsletter_templates(tenant_id, is_default);

CREATE INDEX idx_newsletters_tenant ON newsletters(tenant_id);
CREATE INDEX idx_newsletters_status ON newsletters(tenant_id, status);
CREATE INDEX idx_newsletters_scheduled ON newsletters(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_newsletters_created_by ON newsletters(created_by);

CREATE INDEX idx_newsletter_recipients_newsletter ON newsletter_recipients(newsletter_id);
CREATE INDEX idx_newsletter_recipients_user ON newsletter_recipients(user_id);
CREATE INDEX idx_newsletter_recipients_email ON newsletter_recipients(newsletter_id, email);
CREATE INDEX idx_newsletter_recipients_status ON newsletter_recipients(newsletter_id, status);

CREATE INDEX idx_newsletter_links_newsletter ON newsletter_links(newsletter_id);

CREATE INDEX idx_newsletter_clicks_newsletter ON newsletter_clicks(newsletter_id);
CREATE INDEX idx_newsletter_clicks_recipient ON newsletter_clicks(recipient_id);
CREATE INDEX idx_newsletter_clicks_link ON newsletter_clicks(link_id);
CREATE INDEX idx_newsletter_clicks_time ON newsletter_clicks(clicked_at);

-- Row Level Security Policies
ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_clicks ENABLE ROW LEVEL SECURITY;

-- Newsletter templates policies
CREATE POLICY newsletter_templates_tenant_isolation ON newsletter_templates
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY newsletter_templates_insert ON newsletter_templates
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Newsletters policies
CREATE POLICY newsletters_tenant_isolation ON newsletters
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY newsletters_insert ON newsletters
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Newsletter recipients policies
CREATE POLICY newsletter_recipients_tenant_isolation ON newsletter_recipients
  USING (EXISTS (
    SELECT 1 FROM newsletters 
    WHERE newsletters.id = newsletter_recipients.newsletter_id 
    AND newsletters.tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

CREATE POLICY newsletter_recipients_insert ON newsletter_recipients
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM newsletters 
    WHERE newsletters.id = newsletter_recipients.newsletter_id 
    AND newsletters.tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

-- Newsletter links policies
CREATE POLICY newsletter_links_tenant_isolation ON newsletter_links
  USING (EXISTS (
    SELECT 1 FROM newsletters 
    WHERE newsletters.id = newsletter_links.newsletter_id 
    AND newsletters.tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

CREATE POLICY newsletter_links_insert ON newsletter_links
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM newsletters 
    WHERE newsletters.id = newsletter_links.newsletter_id 
    AND newsletters.tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

-- Newsletter clicks policies
CREATE POLICY newsletter_clicks_tenant_isolation ON newsletter_clicks
  USING (EXISTS (
    SELECT 1 FROM newsletters 
    WHERE newsletters.id = newsletter_clicks.newsletter_id 
    AND newsletters.tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

CREATE POLICY newsletter_clicks_insert ON newsletter_clicks
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM newsletters 
    WHERE newsletters.id = newsletter_clicks.newsletter_id 
    AND newsletters.tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

-- Triggers for updated_at
CREATE TRIGGER update_newsletter_templates_updated_at
  BEFORE UPDATE ON newsletter_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletters_updated_at
  BEFORE UPDATE ON newsletters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update newsletter stats when recipients are updated
CREATE OR REPLACE FUNCTION update_newsletter_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE newsletters 
    SET recipient_count = recipient_count + 1
    WHERE id = NEW.newsletter_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update counts based on status changes
    IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
      UPDATE newsletters 
      SET success_count = success_count + 1
      WHERE id = NEW.newsletter_id;
    ELSIF NEW.status IN ('failed', 'bounced') AND OLD.status NOT IN ('failed', 'bounced') THEN
      UPDATE newsletters 
      SET failure_count = failure_count + 1
      WHERE id = NEW.newsletter_id;
    END IF;
    
    -- Update open count
    IF NEW.opened_at IS NOT NULL AND OLD.opened_at IS NULL THEN
      UPDATE newsletters 
      SET open_count = open_count + 1
      WHERE id = NEW.newsletter_id;
    END IF;
    
    -- Update click count
    IF NEW.clicked_at IS NOT NULL AND OLD.clicked_at IS NULL THEN
      UPDATE newsletters 
      SET click_count = click_count + 1
      WHERE id = NEW.newsletter_id;
    END IF;
    
    -- Update unsubscribe count
    IF NEW.unsubscribed_at IS NOT NULL AND OLD.unsubscribed_at IS NULL THEN
      UPDATE newsletters 
      SET unsubscribe_count = unsubscribe_count + 1
      WHERE id = NEW.newsletter_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_recipient_stats_trigger
  AFTER INSERT OR UPDATE ON newsletter_recipients
  FOR EACH ROW EXECUTE FUNCTION update_newsletter_stats();

-- Function to update link click counts
CREATE OR REPLACE FUNCTION update_link_click_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE newsletter_links 
  SET click_count = click_count + 1
  WHERE id = NEW.link_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_link_click_trigger
  AFTER INSERT ON newsletter_clicks
  FOR EACH ROW EXECUTE FUNCTION update_link_click_counts();
