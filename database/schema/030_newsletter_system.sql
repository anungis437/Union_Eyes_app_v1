-- ============================================================================
-- Newsletter System Schema
-- ============================================================================
-- Purpose: Newsletter creation, template management, distribution lists,
--          campaign scheduling, and engagement tracking
-- Dependencies: auth.users, public.profiles, public.tenants
-- Version: 1.0.0
-- Created: December 6, 2025
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Newsletter Templates
-- Stores reusable email templates with HTML content and variables
CREATE TABLE IF NOT EXISTS public.newsletter_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'general', 'announcement', 'event', 'update', 'custom'
    thumbnail_url TEXT, -- Preview image URL
    html_content TEXT NOT NULL, -- Full HTML template
    json_structure JSONB, -- Block-based structure for editor
    variables JSONB DEFAULT '[]'::JSONB, -- Placeholder variables [{name, label, type, default}]
    is_system BOOLEAN DEFAULT FALSE, -- System templates can't be deleted
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_category CHECK (category IN ('general', 'announcement', 'event', 'update', 'custom'))
);

-- Distribution Lists
-- Manages subscriber groups for targeted newsletters
CREATE TABLE IF NOT EXISTS public.newsletter_distribution_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    list_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'dynamic', 'segment'
    filter_criteria JSONB, -- Dynamic list criteria {role, status, tags, etc}
    subscriber_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_list_type CHECK (list_type IN ('manual', 'dynamic', 'segment'))
);

-- Distribution List Subscribers
-- Many-to-many relationship between lists and profiles
CREATE TABLE IF NOT EXISTS public.newsletter_list_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.newsletter_distribution_lists(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL, -- Denormalized for quick access
    status VARCHAR(50) DEFAULT 'subscribed', -- 'subscribed', 'unsubscribed', 'bounced'
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::JSONB, -- Custom fields, preferences
    UNIQUE(list_id, profile_id),
    CONSTRAINT valid_subscriber_status CHECK (status IN ('subscribed', 'unsubscribed', 'bounced'))
);

-- Newsletter Campaigns
-- Main newsletter/email campaign entity
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.newsletter_templates(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    preview_text VARCHAR(500), -- Email preview/preheader text
    from_name VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    reply_to_email VARCHAR(255),
    html_content TEXT NOT NULL, -- Rendered HTML from template + customizations
    json_structure JSONB, -- Editor structure for editing
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    timezone VARCHAR(100) DEFAULT 'UTC',
    
    -- Distribution
    distribution_list_ids UUID[] DEFAULT '{}', -- Array of list IDs
    recipient_count INTEGER DEFAULT 0,
    
    -- Tracking
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    total_spam_reports INTEGER DEFAULT 0,
    
    -- Metadata
    tags VARCHAR(100)[],
    metadata JSONB DEFAULT '{}'::JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_campaign_status CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'))
);

-- Newsletter Recipients
-- Individual recipient records with delivery status
CREATE TABLE IF NOT EXISTS public.newsletter_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'bounced', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    bounce_type VARCHAR(50), -- 'hard', 'soft', 'technical'
    bounce_reason TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_recipient_status CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
    CONSTRAINT valid_bounce_type CHECK (bounce_type IS NULL OR bounce_type IN ('hard', 'soft', 'technical'))
);

-- Newsletter Engagement
-- Tracks opens, clicks, and other engagement events
CREATE TABLE IF NOT EXISTS public.newsletter_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.newsletter_recipients(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- 'open', 'click', 'unsubscribe', 'spam_report'
    event_data JSONB, -- Click URL, user agent, etc
    ip_address INET,
    user_agent TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_event_type CHECK (event_type IN ('open', 'click', 'unsubscribe', 'spam_report'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Newsletter Templates
CREATE INDEX idx_newsletter_templates_tenant ON public.newsletter_templates(tenant_id);
CREATE INDEX idx_newsletter_templates_category ON public.newsletter_templates(category);
CREATE INDEX idx_newsletter_templates_active ON public.newsletter_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_newsletter_templates_created ON public.newsletter_templates(created_at DESC);

-- Distribution Lists
CREATE INDEX idx_newsletter_lists_tenant ON public.newsletter_distribution_lists(tenant_id);
CREATE INDEX idx_newsletter_lists_type ON public.newsletter_distribution_lists(list_type);
CREATE INDEX idx_newsletter_lists_active ON public.newsletter_distribution_lists(is_active) WHERE is_active = TRUE;

-- List Subscribers
CREATE INDEX idx_newsletter_subscribers_list ON public.newsletter_list_subscribers(list_id);
CREATE INDEX idx_newsletter_subscribers_profile ON public.newsletter_list_subscribers(profile_id);
CREATE INDEX idx_newsletter_subscribers_email ON public.newsletter_list_subscribers(email);
CREATE INDEX idx_newsletter_subscribers_status ON public.newsletter_list_subscribers(status);

-- Campaigns
CREATE INDEX idx_newsletter_campaigns_tenant ON public.newsletter_campaigns(tenant_id);
CREATE INDEX idx_newsletter_campaigns_template ON public.newsletter_campaigns(template_id);
CREATE INDEX idx_newsletter_campaigns_status ON public.newsletter_campaigns(status);
CREATE INDEX idx_newsletter_campaigns_scheduled ON public.newsletter_campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_newsletter_campaigns_created ON public.newsletter_campaigns(created_at DESC);
CREATE INDEX idx_newsletter_campaigns_sent ON public.newsletter_campaigns(sent_at DESC) WHERE sent_at IS NOT NULL;

-- Recipients
CREATE INDEX idx_newsletter_recipients_campaign ON public.newsletter_recipients(campaign_id);
CREATE INDEX idx_newsletter_recipients_profile ON public.newsletter_recipients(profile_id);
CREATE INDEX idx_newsletter_recipients_email ON public.newsletter_recipients(email);
CREATE INDEX idx_newsletter_recipients_status ON public.newsletter_recipients(status);

-- Engagement
CREATE INDEX idx_newsletter_engagement_campaign ON public.newsletter_engagement(campaign_id);
CREATE INDEX idx_newsletter_engagement_recipient ON public.newsletter_engagement(recipient_id);
CREATE INDEX idx_newsletter_engagement_profile ON public.newsletter_engagement(profile_id);
CREATE INDEX idx_newsletter_engagement_event_type ON public.newsletter_engagement(event_type);
CREATE INDEX idx_newsletter_engagement_occurred ON public.newsletter_engagement(occurred_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.newsletter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_distribution_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_list_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_engagement ENABLE ROW LEVEL SECURITY;

-- Templates Policies
CREATE POLICY "Users can view templates in their tenant"
    ON public.newsletter_templates FOR SELECT
    USING (tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID);

CREATE POLICY "Admins can create templates"
    ON public.newsletter_templates FOR INSERT
    WITH CHECK (
        tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin', 'union_rep')
        )
    );

CREATE POLICY "Admins can update templates"
    ON public.newsletter_templates FOR UPDATE
    USING (
        tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID
        AND is_system = FALSE
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin', 'union_rep')
        )
    );

CREATE POLICY "Admins can delete non-system templates"
    ON public.newsletter_templates FOR DELETE
    USING (
        tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID
        AND is_system = FALSE
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
    );

-- Distribution Lists Policies
CREATE POLICY "Users can view distribution lists in their tenant"
    ON public.newsletter_distribution_lists FOR SELECT
    USING (tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID);

CREATE POLICY "Admins can manage distribution lists"
    ON public.newsletter_distribution_lists FOR ALL
    USING (
        tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin', 'union_rep')
        )
    );

-- List Subscribers Policies
CREATE POLICY "Users can view list subscribers"
    ON public.newsletter_list_subscribers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.newsletter_distribution_lists
            WHERE id = list_id
            AND tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID
        )
    );

CREATE POLICY "Admins can manage list subscribers"
    ON public.newsletter_list_subscribers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.newsletter_distribution_lists ndl
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE ndl.id = list_id
            AND ndl.tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID
            AND p.role IN ('super_admin', 'admin', 'union_rep')
        )
    );

-- Campaigns Policies
CREATE POLICY "Users can view campaigns in their tenant"
    ON public.newsletter_campaigns FOR SELECT
    USING (tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID);

CREATE POLICY "Admins can manage campaigns"
    ON public.newsletter_campaigns FOR ALL
    USING (
        tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin', 'union_rep')
        )
    );

-- Recipients Policies
CREATE POLICY "Users can view recipients for their tenant's campaigns"
    ON public.newsletter_recipients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.newsletter_campaigns
            WHERE id = campaign_id
            AND tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID
        )
    );

CREATE POLICY "System can manage recipients"
    ON public.newsletter_recipients FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.newsletter_campaigns
            WHERE id = campaign_id
            AND tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID
        )
    );

-- Engagement Policies
CREATE POLICY "Users can view engagement for their tenant's campaigns"
    ON public.newsletter_engagement FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.newsletter_campaigns
            WHERE id = campaign_id
            AND tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'::UUID
        )
    );

CREATE POLICY "System can insert engagement events"
    ON public.newsletter_engagement FOR INSERT
    WITH CHECK (TRUE); -- Public tracking endpoints

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_newsletter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_newsletter_templates_updated_at
    BEFORE UPDATE ON public.newsletter_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_updated_at();

CREATE TRIGGER update_newsletter_lists_updated_at
    BEFORE UPDATE ON public.newsletter_distribution_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_updated_at();

CREATE TRIGGER update_newsletter_campaigns_updated_at
    BEFORE UPDATE ON public.newsletter_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_updated_at();

-- Update subscriber count when subscribers are added/removed
CREATE OR REPLACE FUNCTION update_list_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.newsletter_distribution_lists
        SET subscriber_count = subscriber_count + 1
        WHERE id = NEW.list_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.newsletter_distribution_lists
        SET subscriber_count = subscriber_count - 1
        WHERE id = OLD.list_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_list_subscriber_count_trigger
    AFTER INSERT OR DELETE ON public.newsletter_list_subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_list_subscriber_count();

-- Update template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.template_id IS NOT NULL THEN
        UPDATE public.newsletter_templates
        SET usage_count = usage_count + 1
        WHERE id = NEW.template_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_template_usage_trigger
    AFTER INSERT ON public.newsletter_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION increment_template_usage();

-- Update campaign engagement stats
CREATE OR REPLACE FUNCTION update_campaign_engagement_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'open' THEN
        UPDATE public.newsletter_campaigns
        SET total_opened = total_opened + 1
        WHERE id = NEW.campaign_id;
    ELSIF NEW.event_type = 'click' THEN
        UPDATE public.newsletter_campaigns
        SET total_clicked = total_clicked + 1
        WHERE id = NEW.campaign_id;
    ELSIF NEW.event_type = 'unsubscribe' THEN
        UPDATE public.newsletter_campaigns
        SET total_unsubscribed = total_unsubscribed + 1
        WHERE id = NEW.campaign_id;
    ELSIF NEW.event_type = 'spam_report' THEN
        UPDATE public.newsletter_campaigns
        SET total_spam_reports = total_spam_reports + 1
        WHERE id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_engagement_stats_trigger
    AFTER INSERT ON public.newsletter_engagement
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_engagement_stats();

-- Update campaign delivery stats
CREATE OR REPLACE FUNCTION update_campaign_delivery_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
        UPDATE public.newsletter_campaigns
        SET total_sent = total_sent + 1
        WHERE id = NEW.campaign_id;
    ELSIF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        UPDATE public.newsletter_campaigns
        SET total_delivered = total_delivered + 1
        WHERE id = NEW.campaign_id;
    ELSIF NEW.status = 'bounced' AND (OLD.status IS NULL OR OLD.status != 'bounced') THEN
        UPDATE public.newsletter_campaigns
        SET total_bounced = total_bounced + 1
        WHERE id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_delivery_stats_trigger
    AFTER INSERT OR UPDATE ON public.newsletter_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_delivery_stats();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.newsletter_templates IS 'Reusable email templates with HTML content and variables';
COMMENT ON TABLE public.newsletter_distribution_lists IS 'Subscriber groups for targeted newsletters';
COMMENT ON TABLE public.newsletter_list_subscribers IS 'Many-to-many relationship between lists and profiles';
COMMENT ON TABLE public.newsletter_campaigns IS 'Main newsletter/email campaign entity with tracking';
COMMENT ON TABLE public.newsletter_recipients IS 'Individual recipient records with delivery status';
COMMENT ON TABLE public.newsletter_engagement IS 'Tracks opens, clicks, unsubscribes, spam reports';
