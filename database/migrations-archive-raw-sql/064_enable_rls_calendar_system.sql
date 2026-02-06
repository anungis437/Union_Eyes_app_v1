-- Migration 064: Enable RLS on Calendar System
-- Priority: MEDIUM
-- Impact: Protects calendar data and event details from unauthorized access
-- Tables: calendars, calendar_events, calendar_sharing, event_attendees

-- ============================================
-- 1. CALENDARS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own calendars
CREATE POLICY calendars_select_owner ON calendars
    FOR SELECT
    USING (user_id = get_current_user_id());

-- Policy: Users can see calendars shared with them
CREATE POLICY calendars_select_shared ON calendars
    FOR SELECT
    USING (
        id IN (
            SELECT calendar_id 
            FROM calendar_sharing 
            WHERE shared_with_user_id = get_current_user_id()
        )
    );

-- Policy: Users can create their own calendars
CREATE POLICY calendars_insert_own ON calendars
    FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- Policy: Owners can update their calendars
CREATE POLICY calendars_update_owner ON calendars
    FOR UPDATE
    USING (user_id = get_current_user_id());

-- Policy: Owners can delete their calendars
CREATE POLICY calendars_delete_owner ON calendars
    FOR DELETE
    USING (user_id = get_current_user_id());

-- ============================================
-- 2. CALENDAR_EVENTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see events in their calendars or shared calendars
CREATE POLICY calendar_events_select_via_calendar ON calendar_events
    FOR SELECT
    USING (
        calendar_id IN (
            SELECT id 
            FROM calendars 
            WHERE user_id = get_current_user_id()
        )
        OR calendar_id IN (
            SELECT calendar_id 
            FROM calendar_sharing 
            WHERE shared_with_user_id = get_current_user_id()
        )
        OR id IN (
            SELECT event_id 
            FROM event_attendees 
            WHERE user_id = get_current_user_id()
        )
    );

-- Policy: Users can create events in calendars they own or have edit access to
CREATE POLICY calendar_events_insert_calendar_owner ON calendar_events
    FOR INSERT
    WITH CHECK (
        created_by = get_current_user_id()
        AND (
            calendar_id IN (
                SELECT id 
                FROM calendars 
                WHERE user_id = get_current_user_id()
            )
            OR calendar_id IN (
                SELECT calendar_id 
                FROM calendar_sharing 
                WHERE shared_with_user_id = get_current_user_id()
                    AND can_edit = true
            )
        )
    );

-- Policy: Event creators and calendar owners can update events
CREATE POLICY calendar_events_update_creator_or_owner ON calendar_events
    FOR UPDATE
    USING (
        created_by = get_current_user_id()
        OR calendar_id IN (
            SELECT id 
            FROM calendars 
            WHERE user_id = get_current_user_id()
        )
        OR calendar_id IN (
            SELECT calendar_id 
            FROM calendar_sharing 
            WHERE shared_with_user_id = get_current_user_id()
                AND can_edit = true
        )
    );

-- Policy: Event creators and calendar owners can delete events
CREATE POLICY calendar_events_delete_creator_or_owner ON calendar_events
    FOR DELETE
    USING (
        created_by = get_current_user_id()
        OR calendar_id IN (
            SELECT id 
            FROM calendars 
            WHERE user_id = get_current_user_id()
        )
    );

-- ============================================
-- 3. CALENDAR_SHARING TABLE
-- ============================================

-- Enable RLS
ALTER TABLE calendar_sharing ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see sharing records for their calendars or where they are shared with
CREATE POLICY calendar_sharing_select_participant ON calendar_sharing
    FOR SELECT
    USING (
        calendar_id IN (
            SELECT id 
            FROM calendars 
            WHERE user_id = get_current_user_id()
        )
        OR shared_with_user_id = get_current_user_id()
    );

-- Policy: Calendar owners can create sharing records
CREATE POLICY calendar_sharing_insert_owner ON calendar_sharing
    FOR INSERT
    WITH CHECK (
        shared_by = get_current_user_id()
        AND calendar_id IN (
            SELECT id 
            FROM calendars 
            WHERE user_id = get_current_user_id()
        )
    );

-- Policy: Sharers can update their sharing records
CREATE POLICY calendar_sharing_update_sharer ON calendar_sharing
    FOR UPDATE
    USING (shared_by = get_current_user_id());

-- Policy: Sharers can revoke sharing
CREATE POLICY calendar_sharing_delete_sharer ON calendar_sharing
    FOR DELETE
    USING (shared_by = get_current_user_id());

-- ============================================
-- 4. EVENT_ATTENDEES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see attendees for events they can access
CREATE POLICY event_attendees_select_via_event ON event_attendees
    FOR SELECT
    USING (
        event_id IN (
            SELECT ce.id 
            FROM calendar_events ce
            WHERE ce.calendar_id IN (
                SELECT id 
                FROM calendars 
                WHERE user_id = get_current_user_id()
            )
            OR ce.calendar_id IN (
                SELECT calendar_id 
                FROM calendar_sharing 
                WHERE shared_with_user_id = get_current_user_id()
            )
            OR ce.id IN (
                SELECT event_id 
                FROM event_attendees 
                WHERE user_id = get_current_user_id()
            )
        )
    );

-- Policy: Event creators and calendar owners can add attendees
CREATE POLICY event_attendees_insert_event_owner ON event_attendees
    FOR INSERT
    WITH CHECK (
        added_by = get_current_user_id()
        AND event_id IN (
            SELECT ce.id 
            FROM calendar_events ce
            WHERE ce.calendar_id IN (
                SELECT id 
                FROM calendars 
                WHERE user_id = get_current_user_id()
            )
            OR ce.created_by = get_current_user_id()
        )
    );

-- Policy: Attendees can update their own attendance status
CREATE POLICY event_attendees_update_self ON event_attendees
    FOR UPDATE
    USING (
        user_id = get_current_user_id()
        OR event_id IN (
            SELECT ce.id 
            FROM calendar_events ce
            WHERE ce.calendar_id IN (
                SELECT id 
                FROM calendars 
                WHERE user_id = get_current_user_id()
            )
        )
    );

-- Policy: Event creators and attendees themselves can remove attendees
CREATE POLICY event_attendees_delete_creator_or_self ON event_attendees
    FOR DELETE
    USING (
        user_id = get_current_user_id()
        OR event_id IN (
            SELECT ce.id 
            FROM calendar_events ce
            WHERE ce.calendar_id IN (
                SELECT id 
                FROM calendars 
                WHERE user_id = get_current_user_id()
            )
        )
    );

-- Add comments
COMMENT ON POLICY calendars_select_owner ON calendars IS 
    'Users can see their own calendars';
COMMENT ON POLICY calendars_select_shared ON calendars IS 
    'Users can see calendars shared with them';
COMMENT ON POLICY calendar_events_select_via_calendar ON calendar_events IS 
    'Users can see events in calendars they own, have access to, or are attending';
COMMENT ON POLICY calendar_sharing_select_participant ON calendar_sharing IS 
    'Users can see sharing records for their calendars or where they are participants';
COMMENT ON POLICY event_attendees_select_via_event ON event_attendees IS 
    'Users can see attendees for events they can access';
