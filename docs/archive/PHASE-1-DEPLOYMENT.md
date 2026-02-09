# Phase 1: Deployment Guide

## Overview

This document provides step-by-step instructions for deploying the Phase 1 Messages System to production.

## Prerequisites

- PostgreSQL database access (connection string in `DATABASE_URL`)
- Vercel Blob storage configured (`BLOB_READ_WRITE_TOKEN`)
- All Phase 1 code deployed and build-validated

## Deployment Steps

### 1. Database Migration

The Messages System requires 5 new database tables. Use the standalone migration file:

```bash
# Option A: Using psql command line
psql -U <username> -d <database> -f db/migrations/0004_messages_only.sql

# Option B: Using database GUI (pgAdmin, DBeaver, etc.)
# Open db/migrations/0004_messages_only.sql and execute contents
```

### 2. Verify Database Schema

After running the migration, verify all tables were created:

```sql
-- Check tables exist
\dt message*

-- Should show:
-- message_threads
-- messages
-- message_read_receipts
-- message_participants
-- message_notifications

-- Check enums
SELECT enumlabel FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE typname IN ('message_status', 'message_type');

-- Should show:
-- message_status: sent, delivered, read
-- message_type: text, file, system

-- Check indexes
\di message*

-- Should show 7 indexes:
-- idx_messages_thread_id
-- idx_messages_created_at
-- idx_message_threads_member_id
-- idx_message_threads_staff_id
-- idx_message_threads_organization_id
-- idx_message_notifications_user_id
-- idx_message_notifications_is_read
```

### 3. Environment Variables

Ensure these variables are set in production:

```env
# Database connection
DATABASE_URL=postgresql://user:password@host:5432/database

# Vercel Blob storage (for file attachments)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxx

# Optional: Sentry error tracking
SENTRY_DSN=https://xxxx@sentry.io/xxxx
```

### 4. Test API Endpoints

Test each API route to ensure functionality:

#### Thread Management

```bash
# List threads (GET)
curl -X GET https://your-domain.com/api/messages/threads \
  -H "Authorization: Bearer <token>"

# Create thread (POST)
curl -X POST https://your-domain.com/api/messages/threads \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Thread",
    "category": "general",
    "priority": "normal",
    "initialMessage": "Test message content"
  }'

# Get single thread (GET)
curl -X GET https://your-domain.com/api/messages/threads/[threadId] \
  -H "Authorization: Bearer <token>"

# Update thread (PATCH)
curl -X PATCH https://your-domain.com/api/messages/threads/[threadId] \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved"}'

# Archive thread (DELETE)
curl -X DELETE https://your-domain.com/api/messages/threads/[threadId] \
  -H "Authorization: Bearer <token>"
```

#### Messages

```bash
# Send text message (POST)
curl -X POST https://your-domain.com/api/messages/threads/[threadId]/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test message",
    "messageType": "text"
  }'

# Send file message (POST with multipart/form-data)
curl -X POST https://your-domain.com/api/messages/threads/[threadId]/messages \
  -H "Authorization: Bearer <token>" \
  -F "content=File attached" \
  -F "messageType=file" \
  -F "file=@/path/to/file.pdf"
```

#### Notifications

```bash
# Get notifications (GET)
curl -X GET https://your-domain.com/api/messages/notifications \
  -H "Authorization: Bearer <token>"

# Mark as read (PATCH)
curl -X PATCH https://your-domain.com/api/messages/notifications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"notificationIds": ["id1", "id2"]}'

# Mark all as read (PATCH)
curl -X PATCH https://your-domain.com/api/messages/notifications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"markAllAsRead": true}'
```

### 5. Frontend Testing

Test the UI components:

1. **Messages Dashboard** (`/[locale]/portal/messages`)
   - [ ] Thread list displays correctly
   - [ ] Search functionality works
   - [ ] Status filter works (all/open/resolved/closed)
   - [ ] "New Thread" button creates modal
   - [ ] Thread cards show unread count
   - [ ] Pagination works correctly

2. **Thread View** (click on thread)
   - [ ] Messages load and display
   - [ ] Real-time polling (new messages appear every 5s)
   - [ ] Send text message works
   - [ ] File upload works (10MB limit enforced)
   - [ ] Read receipts display correctly
   - [ ] Message status shows (sent/delivered/read)

3. **Notification Badge** (top nav)
   - [ ] Badge shows unread count
   - [ ] Polling updates count every 30s
   - [ ] Clicking badge shows dropdown
   - [ ] Mark as read functionality works

### 6. Authorization Testing

Verify security checks:

```bash
# Test unauthorized access (should return 401)
curl -X GET https://your-domain.com/api/messages/threads

# Test accessing another member's thread (should return 403)
curl -X GET https://your-domain.com/api/messages/threads/[other-member-thread] \
  -H "Authorization: Bearer <member-token>"

# Staff should access any thread (should return 200)
curl -X GET https://your-domain.com/api/messages/threads/[any-thread] \
  -H "Authorization: Bearer <staff-token>"
```

### 7. Performance Testing

Monitor key metrics:

- **Database query times**: < 100ms for thread list, < 50ms for messages
- **File upload**: Complete within 5 seconds for 5MB files
- **Real-time polling**: No memory leaks, stable performance over time
- **Notification polling**: Minimal server load from 30s intervals

### 8. Error Monitoring

Set up Sentry alerts for:

- File upload failures
- Database connection errors
- Authorization failures
- Network timeouts

## Rollback Plan

If issues occur, rollback the database migration:

```sql
-- Drop tables in reverse order (respects foreign keys)
DROP TABLE IF EXISTS message_notifications CASCADE;
DROP TABLE IF EXISTS message_participants CASCADE;
DROP TABLE IF EXISTS message_read_receipts CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS message_threads CASCADE;

-- Drop enums
DROP TYPE IF EXISTS message_status;
DROP TYPE IF EXISTS message_type;
```

## Post-Deployment Validation

Run the test suite:

```bash
pnpm test __tests__/phase-1-messages-integration.test.ts
```

All tests should pass.

## Phase 1 Complete Checklist

### Database

- [x] Phase 1.4: Dues SQL functions deployed
- [ ] Phase 1.5: Messages schema deployed (5 tables, 2 enums, 7 indexes)
- [ ] All foreign keys and constraints working
- [ ] Indexes created for performance

### Backend APIs

- [x] Phase 1.3: Portal dashboard APIs (`/api/portal/*`)
- [x] Phase 1.4: Dues payment API (`/api/dues-payments`)
- [x] Phase 1.4: Receipt generation working
- [x] Phase 1.4: RL-1 tax slip generation working
- [ ] Phase 1.5: Thread management API (`/api/messages/threads`)
- [ ] Phase 1.5: Message sending API (`/api/messages/threads/[id]/messages`)
- [ ] Phase 1.5: Notifications API (`/api/messages/notifications`)

### Frontend

- [x] Phase 1.1: 31 accessibility fixes applied
- [x] Phase 1.2: 5 CSS conflicts resolved
- [x] Phase 1.3: Portal dashboard UI
- [x] Phase 1.4: Dues payment UI
- [ ] Phase 1.5: Messages dashboard (`/[locale]/portal/messages`)
- [ ] Phase 1.5: Thread view component
- [ ] Phase 1.5: Notification badge component

### Testing

- [x] Build validation passed (195 static pages)
- [ ] Integration tests passed
- [ ] Authorization tests passed
- [ ] Performance tests passed

### Documentation

- [x] Code implementation documented
- [ ] Deployment guide reviewed
- [ ] Environment variables configured
- [ ] Rollback plan prepared

## Support

If you encounter issues:

1. Check database logs for errors
2. Review Sentry error reports
3. Verify environment variables are set
4. Ensure Vercel Blob storage is configured
5. Test database connectivity

## Next Steps

Once Phase 1 is fully deployed and validated:

- **Phase 2**: Enhanced Analytics & Reports (7 days)
- **Phase 3**: Mobile Optimization (3-4 days)
- **Phase 4**: Advanced Features (5-7 days)
