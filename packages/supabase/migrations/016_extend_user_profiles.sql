-- Migration 016: Extend User Profiles for Unified Profile Management
-- Created: 2025-10-23
-- Purpose: Phase 2 Week 1 Day 6 - Unified User Profile Management
-- Extends user_profiles table with comprehensive profile features

-- =============================================================================
-- EXTEND USER PROFILES TABLE
-- Add fields for comprehensive profile management
-- =============================================================================

-- Add profile fields
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add notification preferences
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": {
    "enabled": true,
    "frequency": "immediate",
    "types": ["security", "updates", "mentions", "tasks"]
  },
  "push": {
    "enabled": true,
    "frequency": "immediate",
    "types": ["security", "mentions", "tasks"]
  },
  "sms": {
    "enabled": false,
    "frequency": "urgent",
    "types": ["security"]
  },
  "inApp": {
    "enabled": true,
    "types": ["all"]
  }
}'::jsonb;

-- Add UI/UX preferences
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ui_preferences JSONB DEFAULT '{
  "theme": "system",
  "colorScheme": "blue",
  "fontSize": "medium",
  "compactMode": false,
  "sidebarCollapsed": false,
  "language": "en",
  "dateFormat": "MM/DD/YYYY",
  "timeFormat": "12h",
  "timezone": "UTC"
}'::jsonb;

-- Add privacy settings
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "profileVisibility": "organization",
  "showEmail": false,
  "showPhone": false,
  "showActivity": true,
  "allowDirectMessages": true
}'::jsonb;

-- Add security preferences
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS security_settings JSONB DEFAULT '{
  "twoFactorEnabled": false,
  "twoFactorMethod": "app",
  "sessionTimeout": 3600,
  "requirePasswordChange": false,
  "passwordChangedAt": null,
  "trustedDevices": []
}'::jsonb;

-- Add activity tracking
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ;

-- Add onboarding status
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{
  "steps": [],
  "currentStep": 0,
  "completedSteps": [],
  "skippedSteps": []
}'::jsonb;

-- Add profile completeness score (0-100)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;

-- Add metadata for extensibility
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add soft delete
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =============================================================================
-- CREATE USER PREFERENCES TABLE
-- Granular preferences that can be updated frequently
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign Key
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Preference Details
  category TEXT NOT NULL CHECK (category IN (
    'notification',
    'ui',
    'privacy',
    'security',
    'workflow',
    'integration',
    'custom'
  )),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  
  -- Metadata
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- System-managed vs user-configurable
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one preference per user per category+key
  UNIQUE(user_id, category, key)
);

-- Indexes for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences(category);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(key);

-- =============================================================================
-- CREATE AVATAR STORAGE BUCKET
-- Supabase Storage bucket for user avatars
-- =============================================================================

-- Insert storage bucket configuration (if using Supabase Storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- Public access for avatars
  2097152, -- 2MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- =============================================================================
-- CREATE HELPER FUNCTIONS
-- =============================================================================

-- Function to calculate profile completeness score
CREATE OR REPLACE FUNCTION calculate_profile_completeness(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_profile RECORD;
BEGIN
  SELECT * INTO v_profile FROM user_profiles WHERE user_id = p_user_id;
  
  IF v_profile IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Basic info (40 points)
  IF v_profile.first_name IS NOT NULL AND v_profile.first_name != '' THEN v_score := v_score + 10; END IF;
  IF v_profile.last_name IS NOT NULL AND v_profile.last_name != '' THEN v_score := v_score + 10; END IF;
  IF v_profile.display_name IS NOT NULL AND v_profile.display_name != '' THEN v_score := v_score + 5; END IF;
  IF v_profile.avatar_url IS NOT NULL AND v_profile.avatar_url != '' THEN v_score := v_score + 15; END IF;
  
  -- Contact info (20 points)
  IF v_profile.phone_number IS NOT NULL AND v_profile.phone_number != '' THEN v_score := v_score + 10; END IF;
  IF v_profile.location IS NOT NULL AND v_profile.location != '' THEN v_score := v_score + 10; END IF;
  
  -- Professional info (20 points)
  IF v_profile.title IS NOT NULL AND v_profile.title != '' THEN v_score := v_score + 10; END IF;
  IF v_profile.department IS NOT NULL AND v_profile.department != '' THEN v_score := v_score + 10; END IF;
  
  -- Additional info (20 points)
  IF v_profile.bio IS NOT NULL AND v_profile.bio != '' THEN v_score := v_score + 10; END IF;
  IF v_profile.timezone IS NOT NULL AND v_profile.timezone != 'UTC' THEN v_score := v_score + 5; END IF;
  IF v_profile.language IS NOT NULL AND v_profile.language != '' THEN v_score := v_score + 5; END IF;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update profile completeness automatically
CREATE OR REPLACE FUNCTION update_profile_completeness()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completeness := calculate_profile_completeness(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update profile completeness
CREATE TRIGGER user_profiles_completeness
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completeness();

-- Function to get user's full name
CREATE OR REPLACE FUNCTION get_user_full_name(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT first_name, last_name, display_name INTO v_profile
  FROM user_profiles
  WHERE user_id = p_user_id;
  
  IF v_profile IS NULL THEN
    RETURN 'Unknown User';
  END IF;
  
  -- Priority: display_name > first_name + last_name > email
  IF v_profile.display_name IS NOT NULL AND v_profile.display_name != '' THEN
    RETURN v_profile.display_name;
  ELSIF v_profile.first_name IS NOT NULL OR v_profile.last_name IS NOT NULL THEN
    RETURN TRIM(COALESCE(v_profile.first_name, '') || ' ' || COALESCE(v_profile.last_name, ''));
  ELSE
    RETURN 'User';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to safely update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preference(
  p_user_id UUID,
  p_channel TEXT, -- 'email', 'push', 'sms', 'inApp'
  p_key TEXT, -- 'enabled', 'frequency', 'types'
  p_value JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_preferences JSONB;
BEGIN
  -- Get current preferences
  SELECT notification_preferences INTO v_preferences
  FROM user_profiles
  WHERE user_id = p_user_id;
  
  -- Update specific preference
  v_preferences := jsonb_set(
    v_preferences,
    ARRAY[p_channel, p_key],
    p_value
  );
  
  -- Save back to database
  UPDATE user_profiles
  SET notification_preferences = v_preferences,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN v_preferences;
END;
$$ LANGUAGE plpgsql;

-- Function to record login activity
CREATE OR REPLACE FUNCTION record_login_activity(
  p_user_id UUID,
  p_success BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  IF p_success THEN
    UPDATE user_profiles
    SET login_count = login_count + 1,
        last_login_at = NOW(),
        last_activity_at = NOW(),
        failed_login_count = 0, -- Reset failed attempts on success
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE user_profiles
    SET failed_login_count = failed_login_count + 1,
        last_failed_login_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can read own preferences"
ON user_preferences FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own preferences
CREATE POLICY "Users can delete own preferences"
ON user_preferences FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Admins can manage all preferences
CREATE POLICY "Admins can manage all preferences"
ON user_preferences FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'org_admin')
  )
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Additional indexes for new fields
CREATE INDEX IF NOT EXISTS idx_user_profiles_name ON user_profiles(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON user_profiles(department);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_activity ON user_profiles(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_completeness ON user_profiles(profile_completeness DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted ON user_profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- GIN index for JSONB fields (enables efficient JSON queries)
CREATE INDEX IF NOT EXISTS idx_user_profiles_notification_prefs ON user_profiles USING GIN (notification_preferences);
CREATE INDEX IF NOT EXISTS idx_user_profiles_ui_prefs ON user_profiles USING GIN (ui_preferences);
CREATE INDEX IF NOT EXISTS idx_user_profiles_metadata ON user_profiles USING GIN (metadata);

-- =============================================================================
-- SEED DATA FOR TESTING
-- =============================================================================

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user profile information with preferences and settings';
COMMENT ON TABLE user_preferences IS 'Granular user preferences for fine-grained customization';
COMMENT ON COLUMN user_profiles.profile_completeness IS 'Auto-calculated score (0-100) indicating profile completion';
COMMENT ON COLUMN user_profiles.notification_preferences IS 'User notification settings across all channels';
COMMENT ON COLUMN user_profiles.ui_preferences IS 'User interface customization preferences';
COMMENT ON COLUMN user_profiles.privacy_settings IS 'Profile visibility and privacy controls';
COMMENT ON COLUMN user_profiles.security_settings IS 'Security-related preferences and 2FA settings';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
