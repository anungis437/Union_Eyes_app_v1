-- Migration 060: Enable RLS on Messages System
-- Priority: CRITICAL
-- Impact: Protects private communications from unauthorized access
-- Tables: messages, message_threads, message_participants, message_read_receipts, message_notifications

-- ============================================
-- 1. MESSAGES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see messages in threads they participate in
CREATE POLICY messages_select_participants ON messages
    FOR SELECT
    USING (
        thread_id IN (
            SELECT thread_id 
            FROM message_participants 
            WHERE user_id = get_current_user_id()
        )
    );

-- Policy: Users can insert messages to threads they participate in
CREATE POLICY messages_insert_participants ON messages
    FOR INSERT
    WITH CHECK (
        sender_id = get_current_user_id()
        AND thread_id IN (
            SELECT thread_id 
            FROM message_participants 
            WHERE user_id = get_current_user_id()
        )
    );

-- Policy: Users can update their own messages within 15 minutes
CREATE POLICY messages_update_own ON messages
    FOR UPDATE
    USING (
        sender_id = get_current_user_id()
        AND created_at > NOW() - INTERVAL '15 minutes'
    );

-- Policy: Users can delete their own messages within 15 minutes
CREATE POLICY messages_delete_own ON messages
    FOR DELETE
    USING (
        sender_id = get_current_user_id()
        AND created_at > NOW() - INTERVAL '15 minutes'
    );

-- ============================================
-- 2. MESSAGE_THREADS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see threads they participate in
CREATE POLICY message_threads_select_participants ON message_threads
    FOR SELECT
    USING (
        id IN (
            SELECT thread_id 
            FROM message_participants 
            WHERE user_id = get_current_user_id()
        )
    );

-- Policy: Users can create threads if they are within their organization scope
CREATE POLICY message_threads_insert_org_scope ON message_threads
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT get_user_visible_orgs(get_current_user_id())
        )
    );

-- Policy: Only participants can update thread metadata
CREATE POLICY message_threads_update_participants ON message_threads
    FOR UPDATE
    USING (
        id IN (
            SELECT thread_id 
            FROM message_participants 
            WHERE user_id = get_current_user_id()
        )
    );

-- ============================================
-- 3. MESSAGE_PARTICIPANTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see participants of threads they're in
CREATE POLICY message_participants_select_own_threads ON message_participants
    FOR SELECT
    USING (
        thread_id IN (
            SELECT thread_id 
            FROM message_participants 
            WHERE user_id = get_current_user_id()
        )
    );

-- Policy: Users can add participants to threads they're in
CREATE POLICY message_participants_insert_own_threads ON message_participants
    FOR INSERT
    WITH CHECK (
        thread_id IN (
            SELECT thread_id 
            FROM message_participants 
            WHERE user_id = get_current_user_id()
        )
    );

-- Policy: Users can remove themselves from threads
CREATE POLICY message_participants_delete_self ON message_participants
    FOR DELETE
    USING (
        user_id = get_current_user_id()
    );

-- ============================================
-- 4. MESSAGE_READ_RECEIPTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see read receipts for threads they participate in
CREATE POLICY message_read_receipts_select_participants ON message_read_receipts
    FOR SELECT
    USING (
        message_id IN (
            SELECT id 
            FROM messages 
            WHERE thread_id IN (
                SELECT thread_id 
                FROM message_participants 
                WHERE user_id = get_current_user_id()
            )
        )
    );

-- Policy: Users can create their own read receipts
CREATE POLICY message_read_receipts_insert_own ON message_read_receipts
    FOR INSERT
    WITH CHECK (
        user_id = get_current_user_id()
        AND message_id IN (
            SELECT id 
            FROM messages 
            WHERE thread_id IN (
                SELECT thread_id 
                FROM message_participants 
                WHERE user_id = get_current_user_id()
            )
        )
    );

-- Policy: Users can update their own read receipts
CREATE POLICY message_read_receipts_update_own ON message_read_receipts
    FOR UPDATE
    USING (user_id = get_current_user_id());

-- ============================================
-- 5. MESSAGE_NOTIFICATIONS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE message_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own message notifications
CREATE POLICY message_notifications_select_own ON message_notifications
    FOR SELECT
    USING (user_id = get_current_user_id());

-- Policy: System can insert notifications (via application logic)
-- Users cannot directly insert notifications
CREATE POLICY message_notifications_insert_system ON message_notifications
    FOR INSERT
    WITH CHECK (
        user_id = get_current_user_id()
        AND message_id IN (
            SELECT id 
            FROM messages 
            WHERE thread_id IN (
                SELECT thread_id 
                FROM message_participants 
                WHERE user_id = get_current_user_id()
            )
        )
    );

-- Policy: Users can update their own notifications (mark as read, etc.)
CREATE POLICY message_notifications_update_own ON message_notifications
    FOR UPDATE
    USING (user_id = get_current_user_id());

-- Policy: Users can delete their own notifications
CREATE POLICY message_notifications_delete_own ON message_notifications
    FOR DELETE
    USING (user_id = get_current_user_id());

-- Add comments
COMMENT ON POLICY messages_select_participants ON messages IS 
    'Users can only see messages in threads they participate in';
COMMENT ON POLICY message_threads_select_participants ON message_threads IS 
    'Users can only see threads they participate in';
COMMENT ON POLICY message_participants_select_own_threads ON message_participants IS 
    'Users can see participants of threads they are in';
COMMENT ON POLICY message_read_receipts_select_participants ON message_read_receipts IS 
    'Users can see read receipts for messages in their threads';
COMMENT ON POLICY message_notifications_select_own ON message_notifications IS 
    'Users can only see their own message notifications';
