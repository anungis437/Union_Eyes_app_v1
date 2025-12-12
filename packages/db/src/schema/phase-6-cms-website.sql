-- Phase 6: CMS & Public Website System
-- World-class content management, public donation pages, event registration, and job board

-- =============================================
-- CMS PAGES & TEMPLATES
-- =============================================

CREATE TABLE cms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    template_type TEXT NOT NULL CHECK (template_type IN ('page', 'post', 'event', 'landing', 'custom')),
    category TEXT, -- 'home', 'about', 'contact', 'blog', 'events', etc.
    thumbnail_url TEXT,
    layout_config JSONB NOT NULL DEFAULT '{}', -- Grid layout, sections, zones
    is_system BOOLEAN DEFAULT FALSE, -- System templates can't be deleted
    is_published BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cms_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id UUID REFERENCES cms_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL, -- URL-friendly identifier
    meta_description TEXT,
    meta_keywords TEXT[],
    og_image TEXT, -- Open Graph image for social sharing
    parent_page_id UUID REFERENCES cms_pages(id) ON DELETE SET NULL, -- For hierarchical pages
    content JSONB NOT NULL DEFAULT '[]', -- Array of content blocks
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    is_homepage BOOLEAN DEFAULT FALSE,
    requires_auth BOOLEAN DEFAULT FALSE, -- Member-only content
    allowed_roles TEXT[], -- Specific roles that can view
    seo_config JSONB DEFAULT '{}', -- Custom SEO settings
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

CREATE TABLE cms_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    block_type TEXT NOT NULL CHECK (block_type IN (
        'text', 'heading', 'image', 'video', 'gallery', 'button', 
        'form', 'hero', 'feature', 'testimonial', 'faq', 'cta',
        'map', 'social', 'countdown', 'stats', 'timeline', 'custom'
    )),
    category TEXT, -- For organizing blocks
    content JSONB NOT NULL DEFAULT '{}', -- Block-specific data
    styles JSONB DEFAULT '{}', -- Custom CSS/styling
    is_reusable BOOLEAN DEFAULT FALSE, -- Can be used across multiple pages
    thumbnail_url TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cms_navigation_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL CHECK (location IN ('header', 'footer', 'sidebar', 'mobile')),
    items JSONB NOT NULL DEFAULT '[]', -- Hierarchical menu structure
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, location)
);

CREATE TABLE cms_media_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'image', 'video', 'document', 'audio'
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL, -- in bytes
    width INTEGER, -- for images/videos
    height INTEGER,
    alt_text TEXT,
    caption TEXT,
    tags TEXT[],
    folder TEXT DEFAULT '/', -- For organizing media
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PUBLIC DONATION PAGES
-- =============================================

CREATE TABLE donation_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('strike_fund', 'general', 'emergency', 'project', 'legal')),
    goal_amount DECIMAL(10, 2),
    current_amount DECIMAL(10, 2) DEFAULT 0,
    currency TEXT DEFAULT 'CAD',
    featured_image TEXT,
    video_url TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    allow_recurring BOOLEAN DEFAULT TRUE,
    suggested_amounts INTEGER[], -- e.g., [25, 50, 100, 250]
    custom_fields JSONB DEFAULT '[]', -- Additional form fields
    thank_you_message TEXT,
    email_template_id UUID, -- For automated thank-you emails
    page_content JSONB DEFAULT '[]', -- Custom content blocks
    seo_config JSONB DEFAULT '{}',
    stripe_product_id TEXT,
    stripe_price_ids JSONB DEFAULT '{}', -- Map of recurring intervals to price IDs
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES donation_campaigns(id) ON DELETE SET NULL,
    donor_name TEXT,
    donor_email TEXT,
    donor_phone TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'CAD',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_interval TEXT CHECK (recurring_interval IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    is_anonymous BOOLEAN DEFAULT FALSE,
    message TEXT,
    custom_data JSONB DEFAULT '{}',
    stripe_payment_intent_id TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),
    payment_method TEXT,
    receipt_sent BOOLEAN DEFAULT FALSE,
    receipt_url TEXT,
    tax_receipt_number TEXT, -- For charitable donations
    tax_receipt_issued_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE donation_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL UNIQUE,
    receipt_type TEXT NOT NULL CHECK (receipt_type IN ('payment', 'tax', 'yearly_summary')),
    amount DECIMAL(10, 2) NOT NULL,
    issue_date DATE NOT NULL,
    pdf_url TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, receipt_number)
);

-- =============================================
-- EVENT REGISTRATION SYSTEM
-- =============================================

CREATE TABLE public_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('meeting', 'rally', 'training', 'social', 'fundraiser', 'conference', 'webinar')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    timezone TEXT DEFAULT 'America/Toronto',
    location_type TEXT NOT NULL CHECK (location_type IN ('in_person', 'virtual', 'hybrid')),
    venue_name TEXT,
    venue_address TEXT,
    venue_city TEXT,
    venue_state TEXT,
    venue_postal_code TEXT,
    venue_country TEXT DEFAULT 'Canada',
    virtual_link TEXT, -- Zoom, Teams, etc.
    virtual_platform TEXT,
    featured_image TEXT,
    capacity INTEGER,
    registered_count INTEGER DEFAULT 0,
    waitlist_enabled BOOLEAN DEFAULT TRUE,
    registration_opens TIMESTAMP WITH TIME ZONE,
    registration_closes TIMESTAMP WITH TIME ZONE,
    registration_status TEXT NOT NULL DEFAULT 'open' CHECK (registration_status IN ('draft', 'open', 'closed', 'full', 'cancelled')),
    is_free BOOLEAN DEFAULT TRUE,
    ticket_price DECIMAL(10, 2),
    member_price DECIMAL(10, 2), -- Discounted price for members
    currency TEXT DEFAULT 'CAD',
    custom_fields JSONB DEFAULT '[]', -- Additional registration fields
    confirmation_email_template TEXT,
    reminder_email_template TEXT,
    page_content JSONB DEFAULT '[]', -- Custom event page content
    seo_config JSONB DEFAULT '{}',
    tags TEXT[],
    organizer_name TEXT,
    organizer_email TEXT,
    organizer_phone TEXT,
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id), -- If registered member
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    member_number TEXT,
    ticket_type TEXT CHECK (ticket_type IN ('regular', 'member', 'guest', 'vip', 'free')),
    ticket_price DECIMAL(10, 2),
    number_of_guests INTEGER DEFAULT 0,
    guest_names TEXT[],
    custom_data JSONB DEFAULT '{}',
    registration_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (registration_status IN ('pending', 'confirmed', 'waitlist', 'cancelled', 'attended', 'no_show')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'waived')),
    stripe_payment_intent_id TEXT,
    payment_method TEXT,
    confirmation_sent BOOLEAN DEFAULT FALSE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    checked_in_by UUID REFERENCES profiles(id),
    qr_code TEXT, -- For check-in
    registration_source TEXT, -- 'web', 'mobile', 'admin', 'import'
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE event_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
    check_in_method TEXT NOT NULL CHECK (check_in_method IN ('qr_code', 'manual', 'self', 'nfc')),
    checked_in_by UUID REFERENCES profiles(id),
    check_in_location TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- JOB BOARD
-- =============================================

CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    employer_name TEXT NOT NULL,
    employer_logo TEXT,
    employer_website TEXT,
    job_type TEXT NOT NULL CHECK (job_type IN ('full_time', 'part_time', 'contract', 'temporary', 'casual', 'seasonal', 'apprenticeship')),
    category TEXT, -- 'construction', 'healthcare', 'education', 'service', etc.
    description TEXT NOT NULL,
    responsibilities TEXT,
    qualifications TEXT,
    benefits TEXT,
    salary_min DECIMAL(10, 2),
    salary_max DECIMAL(10, 2),
    salary_currency TEXT DEFAULT 'CAD',
    salary_period TEXT CHECK (salary_period IN ('hourly', 'daily', 'weekly', 'monthly', 'yearly')),
    salary_display TEXT, -- e.g., "$25-35/hour" or "Competitive"
    location_type TEXT NOT NULL CHECK (location_type IN ('on_site', 'remote', 'hybrid')),
    city TEXT,
    province TEXT,
    country TEXT DEFAULT 'Canada',
    remote_allowed BOOLEAN DEFAULT FALSE,
    experience_level TEXT CHECK (experience_level IN ('entry', 'intermediate', 'senior', 'lead', 'executive')),
    education_required TEXT,
    union_affiliation_required BOOLEAN DEFAULT FALSE,
    union_name TEXT,
    contact_name TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    application_method TEXT NOT NULL CHECK (application_method IN ('internal', 'email', 'external_link', 'phone')),
    application_email TEXT,
    application_url TEXT,
    application_instructions TEXT,
    requires_resume BOOLEAN DEFAULT TRUE,
    requires_cover_letter BOOLEAN DEFAULT FALSE,
    custom_questions JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'filled', 'closed', 'expired')),
    featured BOOLEAN DEFAULT FALSE,
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
    closing_date DATE,
    filled_date DATE,
    seo_config JSONB DEFAULT '{}',
    tags TEXT[],
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id), -- If logged-in member
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    resume_url TEXT,
    cover_letter_url TEXT,
    cover_letter_text TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    years_experience INTEGER,
    current_employer TEXT,
    current_position TEXT,
    availability_date DATE,
    salary_expectation DECIMAL(10, 2),
    willing_to_relocate BOOLEAN DEFAULT FALSE,
    is_union_member BOOLEAN DEFAULT FALSE,
    union_local TEXT,
    custom_responses JSONB DEFAULT '{}', -- Answers to custom questions
    application_status TEXT NOT NULL DEFAULT 'new' CHECK (application_status IN (
        'new', 'reviewing', 'shortlisted', 'interview_scheduled', 
        'interviewed', 'offer_extended', 'hired', 'rejected', 'withdrawn'
    )),
    status_notes TEXT,
    viewed_by UUID REFERENCES profiles(id),
    viewed_at TIMESTAMP WITH TIME ZONE,
    interview_scheduled_for TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    source TEXT, -- How they found the job
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE job_saved (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, job_posting_id)
);

-- =============================================
-- WEBSITE SETTINGS & SEO
-- =============================================

CREATE TABLE website_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_name TEXT NOT NULL,
    site_tagline TEXT,
    site_description TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color TEXT DEFAULT '#1E40AF',
    secondary_color TEXT DEFAULT '#F59E0B',
    font_family TEXT DEFAULT 'Inter',
    footer_text TEXT,
    footer_links JSONB DEFAULT '[]',
    social_links JSONB DEFAULT '{}', -- Facebook, Twitter, Instagram, LinkedIn
    contact_email TEXT,
    contact_phone TEXT,
    contact_address TEXT,
    google_analytics_id TEXT,
    facebook_pixel_id TEXT,
    custom_css TEXT,
    custom_js TEXT,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    maintenance_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- =============================================
-- ANALYTICS & TRACKING
-- =============================================

CREATE TABLE page_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    page_id UUID REFERENCES cms_pages(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public_events(id) ON DELETE CASCADE,
    job_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES donation_campaigns(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_time_on_page INTEGER DEFAULT 0, -- in seconds
    bounce_rate DECIMAL(5, 2) DEFAULT 0,
    traffic_sources JSONB DEFAULT '{}', -- Direct, organic, social, referral
    device_breakdown JSONB DEFAULT '{}', -- Desktop, mobile, tablet
    conversion_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, page_id, metric_date)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_cms_pages_tenant_status ON cms_pages(tenant_id, status);
CREATE INDEX idx_cms_pages_slug ON cms_pages(tenant_id, slug);
CREATE INDEX idx_cms_pages_published ON cms_pages(tenant_id, published_at) WHERE status = 'published';
CREATE INDEX idx_cms_media_tenant ON cms_media_library(tenant_id, file_type);
CREATE INDEX idx_cms_media_tags ON cms_media_library USING gin(tags);

CREATE INDEX idx_donations_tenant ON donations(tenant_id, created_at DESC);
CREATE INDEX idx_donations_campaign ON donations(campaign_id, payment_status);
CREATE INDEX idx_donations_email ON donations(donor_email);
CREATE INDEX idx_donation_campaigns_slug ON donation_campaigns(tenant_id, slug);
CREATE INDEX idx_donation_campaigns_status ON donation_campaigns(tenant_id, status);

CREATE INDEX idx_events_tenant ON public_events(tenant_id, start_date DESC);
CREATE INDEX idx_events_slug ON public_events(tenant_id, slug);
CREATE INDEX idx_events_status ON public_events(tenant_id, registration_status);
CREATE INDEX idx_events_dates ON public_events(start_date, end_date);
CREATE INDEX idx_event_registrations_event ON event_registrations(event_id, registration_status);
CREATE INDEX idx_event_registrations_email ON event_registrations(email);

CREATE INDEX idx_jobs_tenant ON job_postings(tenant_id, status, posted_date DESC);
CREATE INDEX idx_jobs_slug ON job_postings(tenant_id, slug);
CREATE INDEX idx_jobs_category ON job_postings(category, status);
CREATE INDEX idx_jobs_location ON job_postings(city, province, status);
CREATE INDEX idx_jobs_featured ON job_postings(featured, status, posted_date DESC);
CREATE INDEX idx_job_applications_job ON job_applications(job_posting_id, application_status);
CREATE INDEX idx_job_applications_email ON job_applications(email);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- CMS Templates
ALTER TABLE cms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY cms_templates_tenant_isolation ON cms_templates
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- CMS Pages
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY cms_pages_tenant_isolation ON cms_pages
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY cms_pages_public_read ON cms_pages
    FOR SELECT USING (
        status = 'published' 
        AND published_at <= NOW()
        AND (requires_auth = FALSE OR current_setting('app.current_user_id', true) IS NOT NULL)
    );

-- CMS Blocks
ALTER TABLE cms_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY cms_blocks_tenant_isolation ON cms_blocks
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- CMS Navigation
ALTER TABLE cms_navigation_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY cms_navigation_tenant_isolation ON cms_navigation_menus
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY cms_navigation_public_read ON cms_navigation_menus
    FOR SELECT USING (is_active = TRUE);

-- CMS Media Library
ALTER TABLE cms_media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY cms_media_tenant_isolation ON cms_media_library
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Donation Campaigns (Public read for active campaigns)
ALTER TABLE donation_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY donation_campaigns_tenant_isolation ON donation_campaigns
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY donation_campaigns_public_read ON donation_campaigns
    FOR SELECT USING (status = 'active');

-- Donations
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY donations_tenant_isolation ON donations
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Donation Receipts
ALTER TABLE donation_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY donation_receipts_tenant_isolation ON donation_receipts
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Public Events (Public read for open registration)
ALTER TABLE public_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_events_tenant_isolation ON public_events
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY public_events_public_read ON public_events
    FOR SELECT USING (registration_status IN ('open', 'full'));

-- Event Registrations
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_registrations_tenant_isolation ON event_registrations
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY event_registrations_own_read ON event_registrations
    FOR SELECT USING (
        profile_id = current_setting('app.current_user_id', true)::uuid
        OR email = current_setting('app.current_user_email', true)
    );

-- Event Check-ins
ALTER TABLE event_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_check_ins_tenant_isolation ON event_check_ins
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Job Postings (Public read for active jobs)
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_postings_tenant_isolation ON job_postings
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY job_postings_public_read ON job_postings
    FOR SELECT USING (status = 'active' AND (closing_date IS NULL OR closing_date >= CURRENT_DATE));

-- Job Applications
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_applications_tenant_isolation ON job_applications
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY job_applications_own_read ON job_applications
    FOR SELECT USING (
        profile_id = current_setting('app.current_user_id', true)::uuid
        OR email = current_setting('app.current_user_email', true)
    );

-- Job Saved
ALTER TABLE job_saved ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_saved_tenant_isolation ON job_saved
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY job_saved_own ON job_saved
    FOR ALL USING (profile_id = current_setting('app.current_user_id', true)::uuid);

-- Website Settings
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY website_settings_tenant_isolation ON website_settings
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY website_settings_public_read ON website_settings
    FOR SELECT USING (TRUE);

-- Page Analytics
ALTER TABLE page_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY page_analytics_tenant_isolation ON page_analytics
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update donation campaign amount on donation
CREATE OR REPLACE FUNCTION update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'succeeded' AND NEW.campaign_id IS NOT NULL THEN
        UPDATE donation_campaigns
        SET current_amount = current_amount + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_amount
    AFTER INSERT OR UPDATE OF payment_status ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_amount();

-- Update event registered count
CREATE OR REPLACE FUNCTION update_event_capacity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.registration_status = 'confirmed' THEN
        UPDATE public_events
        SET registered_count = registered_count + (1 + COALESCE(NEW.number_of_guests, 0)),
            updated_at = NOW()
        WHERE id = NEW.event_id;
        
        -- Check if event is now full
        UPDATE public_events
        SET registration_status = 'full'
        WHERE id = NEW.event_id 
        AND capacity IS NOT NULL 
        AND registered_count >= capacity
        AND registration_status = 'open';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.registration_status = 'confirmed' AND NEW.registration_status = 'cancelled' THEN
            UPDATE public_events
            SET registered_count = GREATEST(0, registered_count - (1 + COALESCE(OLD.number_of_guests, 0))),
                updated_at = NOW()
            WHERE id = NEW.event_id;
            
            -- Reopen registration if was full
            UPDATE public_events
            SET registration_status = 'open'
            WHERE id = NEW.event_id 
            AND registration_status = 'full'
            AND capacity IS NOT NULL
            AND registered_count < capacity;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_capacity
    AFTER INSERT OR UPDATE OF registration_status ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_event_capacity();

-- Update job applications count
CREATE OR REPLACE FUNCTION update_job_applications_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE job_postings
        SET applications_count = applications_count + 1,
            updated_at = NOW()
        WHERE id = NEW.job_posting_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_applications_count
    AFTER INSERT ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_job_applications_count();

-- Update page view count
CREATE OR REPLACE FUNCTION increment_view_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'cms_pages' THEN
        UPDATE cms_pages SET view_count = view_count + 1 WHERE id = NEW.id;
    ELSIF TG_TABLE_NAME = 'job_postings' THEN
        UPDATE job_postings SET views_count = views_count + 1 WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON cms_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cms_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cms_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cms_navigation_menus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON donation_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON donations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON event_registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON job_postings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON website_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE cms_templates IS 'Page and content templates for the CMS';
COMMENT ON TABLE cms_pages IS 'Website pages with content blocks';
COMMENT ON TABLE cms_blocks IS 'Reusable content blocks (text, images, videos, etc.)';
COMMENT ON TABLE cms_navigation_menus IS 'Navigation menus for header, footer, sidebar';
COMMENT ON TABLE cms_media_library IS 'Media files (images, videos, documents)';
COMMENT ON TABLE donation_campaigns IS 'Public donation campaigns for strike funds, projects, etc.';
COMMENT ON TABLE donations IS 'Individual donations with Stripe payment tracking';
COMMENT ON TABLE donation_receipts IS 'Tax receipts and payment confirmation PDFs';
COMMENT ON TABLE public_events IS 'Public-facing events with registration capabilities';
COMMENT ON TABLE event_registrations IS 'Event registrations with payment and check-in tracking';
COMMENT ON TABLE event_check_ins IS 'Event attendance check-in records';
COMMENT ON TABLE job_postings IS 'Job board listings with applications';
COMMENT ON TABLE job_applications IS 'Applications submitted for job postings';
COMMENT ON TABLE job_saved IS 'Jobs saved by users for later';
COMMENT ON TABLE website_settings IS 'Union website settings (branding, SEO, analytics)';
COMMENT ON TABLE page_analytics IS 'Page view and engagement analytics';
