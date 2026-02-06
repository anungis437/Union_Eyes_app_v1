-- Migration 061: Enable RLS on In-App Notifications
-- Priority: CRITICAL
-- Impact: Protects user privacy - users should only see their own notifications

-- Enable RLS
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY in_app_notifications_select_own ON in_app_notifications
    FOR SELECT
    USING (user_id = get_current_user_id());

-- Policy: System can create notifications (via application logic)
-- This allows the application to create notifications for users
CREATE POLICY in_app_notifications_insert_system ON in_app_notifications
    FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- Policy: Users can update their own notifications (mark as read, etc.)
CREATE POLICY in_app_notifications_update_own ON in_app_notifications
    FOR UPDATE
    USING (user_id = get_current_user_id());

-- Policy: Users can delete their own notifications
CREATE POLICY in_app_notifications_delete_own ON in_app_notifications
    FOR DELETE
    USING (user_id = get_current_user_id());

-- Add comments
COMMENT ON POLICY in_app_notifications_select_own ON in_app_notifications IS 
    'Users can only see their own notifications';
COMMENT ON POLICY in_app_notifications_insert_system ON in_app_notifications IS 
    'System can create notifications for users via application logic';
COMMENT ON POLICY in_app_notifications_update_own ON in_app_notifications IS 
    'Users can update their own notifications (e.g., mark as read)';
COMMENT ON POLICY in_app_notifications_delete_own ON in_app_notifications IS 
    'Users can delete their own notifications';
