-- ================================================================
-- PHASE 10: SOCIAL MEDIA INTEGRATION
-- ================================================================
-- World-class social media management system
-- Supports: Facebook, Twitter/X, Instagram, LinkedIn
-- Features: Multi-account management, post scheduling, campaign tracking,
--          analytics, engagement monitoring, hashtag tracking
-- Created: December 7, 2025
-- ================================================================

-- ================================================================
-- ENUMS
-- ================================================================

CREATE TYPE social_platform AS ENUM (
  'facebook',
  'twitter',
  'instagram',
  'linkedin',
  'youtube',
  'tiktok'
);

CREATE TYPE social_account_status AS ENUM (
  'active',
  'expired',
  'disconnected',
  'rate_limited',
  'suspended'
);

CREATE TYPE social_post_status AS ENUM (
  'draft',
  'scheduled',
  'published',
  'failed',
  'deleted'
);

CREATE TYPE social_post_type AS ENUM (
  'text',
  'image',
  'video',
  'link',
  'carousel',
  'story',
  'reel'
);

CREATE TYPE engagement_type AS ENUM (
  'like',
  'comment',
  'share',
  'retweet',
  'reply',
  'reaction',
  'mention',
  'tag'
);

CREATE TYPE campaign_status AS ENUM (
  'planning',
  'active',
  'paused',
  'completed',
  'cancelled'
);

-- ================================================================
-- TABLES
-- ================================================================

-- Social Media Accounts
-- Connected social media accounts per tenant
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Platform Details
  platform social_platform NOT NULL,
  platform_user_id TEXT NOT NULL, -- Platform-specific user/page ID
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  profile_image_url TEXT,
  
  -- Connection Details
  access_token TEXT NOT NULL, -- Encrypted in application layer
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[], -- Granted permissions
  
  -- Account Status
  status social_account_status NOT NULL DEFAULT 'active',
  is_primary BOOLEAN DEFAULT FALSE, -- Primary account per platform
  is_verified BOOLEAN DEFAULT FALSE, -- Platform verified badge
  
  -- Rate Limiting
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,
  
  -- Metadata
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2), -- Average engagement rate %
  
  -- Account Metadata
  account_metadata JSONB DEFAULT '{}'::jsonb, -- Platform-specific data
  
  -- Audit
  connected_by UUID REFERENCES profiles(id),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(tenant_id, platform, platform_user_id)
);

CREATE INDEX idx_social_accounts_tenant ON social_accounts(tenant_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX idx_social_accounts_status ON social_accounts(status);
CREATE INDEX idx_social_accounts_primary ON social_accounts(tenant_id, platform, is_primary) WHERE is_primary = TRUE;

-- Social Media Posts
-- Individual posts across all platforms
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES social_campaigns(id) ON DELETE SET NULL,
  
  -- Post Content
  post_type social_post_type NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  media_urls TEXT[], -- Image/video URLs
  link_url TEXT,
  link_preview_image TEXT,
  hashtags TEXT[],
  mentions TEXT[], -- @mentions
  
  -- Scheduling
  status social_post_status NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- Platform Details
  platform_post_id TEXT, -- ID on the platform after publishing
  platform_url TEXT, -- Direct link to post
  
  -- Engagement Metrics (updated periodically)
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  impressions_count INTEGER DEFAULT 0,
  reach_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  
  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  
  -- Metadata
  post_metadata JSONB DEFAULT '{}'::jsonb, -- Platform-specific data
  
  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_social_posts_tenant ON social_posts(tenant_id);
CREATE INDEX idx_social_posts_account ON social_posts(account_id);
CREATE INDEX idx_social_posts_campaign ON social_posts(campaign_id);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_social_posts_published ON social_posts(published_at);
CREATE INDEX idx_social_posts_hashtags ON social_posts USING GIN(hashtags);

-- Social Media Campaigns
-- Organized campaigns across multiple posts and platforms
CREATE TABLE social_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Campaign Details
  name TEXT NOT NULL,
  description TEXT,
  campaign_code TEXT, -- Unique identifier for tracking
  
  -- Campaign Targeting
  platforms social_platform[], -- Target platforms
  target_audience TEXT, -- Description of target audience
  campaign_hashtags TEXT[],
  
  -- Campaign Schedule
  status campaign_status NOT NULL DEFAULT 'planning',
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Campaign Goals
  goal_impressions INTEGER,
  goal_engagement_rate DECIMAL(5,2),
  goal_conversions INTEGER,
  
  -- Campaign Metadata
  campaign_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_social_campaigns_tenant ON social_campaigns(tenant_id);
CREATE INDEX idx_social_campaigns_status ON social_campaigns(status);
CREATE INDEX idx_social_campaigns_dates ON social_campaigns(start_date, end_date);

-- Social Media Analytics
-- Daily aggregated analytics per account
CREATE TABLE social_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  
  -- Analytics Date
  analytics_date DATE NOT NULL,
  
  -- Follower Metrics
  follower_count INTEGER DEFAULT 0,
  follower_change INTEGER DEFAULT 0, -- Daily change
  following_count INTEGER DEFAULT 0,
  
  -- Content Metrics
  posts_published INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  total_reach INTEGER DEFAULT 0,
  
  -- Engagement Metrics
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_engagements INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  
  -- Traffic Metrics
  profile_visits INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  
  -- Metadata
  analytics_metadata JSONB DEFAULT '{}'::jsonb, -- Platform-specific metrics
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(account_id, analytics_date)
);

CREATE INDEX idx_social_analytics_tenant ON social_analytics(tenant_id);
CREATE INDEX idx_social_analytics_account ON social_analytics(account_id);
CREATE INDEX idx_social_analytics_date ON social_analytics(analytics_date);
CREATE INDEX idx_social_analytics_account_date ON social_analytics(account_id, analytics_date);

-- Social Media Feeds
-- Aggregated feed items from connected accounts
CREATE TABLE social_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  
  -- Feed Item Details
  platform_item_id TEXT NOT NULL, -- Item ID on platform
  item_type TEXT NOT NULL, -- post, comment, mention, etc.
  content TEXT,
  media_urls TEXT[],
  
  -- Author Details
  author_id TEXT,
  author_name TEXT,
  author_username TEXT,
  author_image_url TEXT,
  
  -- Engagement
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  
  -- Timestamps
  published_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  feed_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(account_id, platform_item_id)
);

CREATE INDEX idx_social_feeds_tenant ON social_feeds(tenant_id);
CREATE INDEX idx_social_feeds_account ON social_feeds(account_id);
CREATE INDEX idx_social_feeds_published ON social_feeds(published_at);

-- Social Media Engagement
-- Individual engagement events (likes, comments, shares)
CREATE TABLE social_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  
  -- Engagement Details
  engagement_type engagement_type NOT NULL,
  platform_engagement_id TEXT, -- ID on platform
  
  -- User Details
  platform_user_id TEXT,
  username TEXT,
  display_name TEXT,
  profile_image_url TEXT,
  
  -- Engagement Content
  content TEXT, -- Comment/reply text
  sentiment TEXT, -- positive, negative, neutral (AI-analyzed)
  sentiment_score DECIMAL(5,2), -- -1 to 1
  
  -- Timestamps
  engaged_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  engagement_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_social_engagement_tenant ON social_engagement(tenant_id);
CREATE INDEX idx_social_engagement_post ON social_engagement(post_id);
CREATE INDEX idx_social_engagement_type ON social_engagement(engagement_type);
CREATE INDEX idx_social_engagement_engaged_at ON social_engagement(engaged_at);
CREATE INDEX idx_social_engagement_sentiment ON social_engagement(sentiment);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_engagement ENABLE ROW LEVEL SECURITY;

-- Social Accounts Policies
CREATE POLICY social_accounts_tenant_isolation ON social_accounts
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY social_accounts_select ON social_accounts
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_accounts_insert ON social_accounts
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_accounts_update ON social_accounts
  FOR UPDATE USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_accounts_delete ON social_accounts
  FOR DELETE USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- Social Posts Policies
CREATE POLICY social_posts_tenant_isolation ON social_posts
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY social_posts_select ON social_posts
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY social_posts_insert ON social_posts
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_posts_update ON social_posts
  FOR UPDATE USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_posts_delete ON social_posts
  FOR DELETE USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- Social Campaigns Policies
CREATE POLICY social_campaigns_tenant_isolation ON social_campaigns
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY social_campaigns_select ON social_campaigns
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_campaigns_insert ON social_campaigns
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_campaigns_update ON social_campaigns
  FOR UPDATE USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_campaigns_delete ON social_campaigns
  FOR DELETE USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- Social Analytics Policies
CREATE POLICY social_analytics_tenant_isolation ON social_analytics
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY social_analytics_select ON social_analytics
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_analytics_insert ON social_analytics
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_analytics_update ON social_analytics
  FOR UPDATE USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- Social Feeds Policies
CREATE POLICY social_feeds_tenant_isolation ON social_feeds
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY social_feeds_select ON social_feeds
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_feeds_insert ON social_feeds
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_feeds_update ON social_feeds
  FOR UPDATE USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- Social Engagement Policies
CREATE POLICY social_engagement_tenant_isolation ON social_engagement
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY social_engagement_select ON social_engagement
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

CREATE POLICY social_engagement_insert ON social_engagement
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Updated At Triggers
CREATE TRIGGER social_accounts_updated_at BEFORE UPDATE ON social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER social_posts_updated_at BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER social_campaigns_updated_at BEFORE UPDATE ON social_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER social_analytics_updated_at BEFORE UPDATE ON social_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER social_feeds_updated_at BEFORE UPDATE ON social_feeds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER social_engagement_updated_at BEFORE UPDATE ON social_engagement
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update Post Engagement Counts Trigger
CREATE OR REPLACE FUNCTION update_post_engagement_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate engagement metrics for the post
  UPDATE social_posts SET
    likes_count = (
      SELECT COUNT(*) FROM social_engagement 
      WHERE post_id = NEW.post_id AND engagement_type = 'like'
    ),
    comments_count = (
      SELECT COUNT(*) FROM social_engagement 
      WHERE post_id = NEW.post_id AND engagement_type IN ('comment', 'reply')
    ),
    shares_count = (
      SELECT COUNT(*) FROM social_engagement 
      WHERE post_id = NEW.post_id AND engagement_type IN ('share', 'retweet')
    ),
    updated_at = NOW()
  WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER social_engagement_update_counts AFTER INSERT OR UPDATE ON social_engagement
  FOR EACH ROW EXECUTE FUNCTION update_post_engagement_counts();

-- Update Account Metrics Trigger
CREATE OR REPLACE FUNCTION update_account_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update account post count and last sync
  UPDATE social_accounts SET
    post_count = (
      SELECT COUNT(*) FROM social_posts 
      WHERE account_id = NEW.account_id AND status = 'published'
    ),
    last_synced_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.account_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER social_posts_update_account_metrics AFTER INSERT OR UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_account_metrics();

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE social_accounts IS 'Connected social media accounts with OAuth tokens and rate limiting';
COMMENT ON TABLE social_posts IS 'Individual social media posts across all platforms with scheduling and engagement tracking';
COMMENT ON TABLE social_campaigns IS 'Organized marketing campaigns spanning multiple posts and platforms';
COMMENT ON TABLE social_analytics IS 'Daily aggregated analytics per social account for trend analysis';
COMMENT ON TABLE social_feeds IS 'Aggregated feed items from connected accounts for unified dashboard';
COMMENT ON TABLE social_engagement IS 'Individual engagement events (likes, comments, shares) with sentiment analysis';
