# Phase 5: Member Communications System

**Goal:** Bring member communications from 40% to 75-80% feature parity with market leaders  
**Timeline:** 3-4 weeks  
**Priority:** HIGH - Critical engagement differentiator  
**Status:** 🔄 IN PROGRESS

---

## 🎯 Objectives

### Current State (40% Complete)

- ✅ Email notifications (Resend integration)
- ✅ Basic notification system with queue
- ✅ In-app notifications
- ✅ Notification templates with variables
- ✅ User preferences per notification type

### Target State (75-80% Complete)

- ✅ Email notifications (existing)
- ➕ **SMS/text messaging** (Twilio integration)
- ➕ **Survey and polling tools** (member feedback)
- ➕ **Newsletter builder** (campaign communications)
- ➕ **Communication analytics** (engagement tracking)
- ➕ **Mobile push notifications** (FCM integration)
- ⏳ Two-way communication (Phase 6)
- ⏳ Social media integration (Phase 6)

**Feature Gap Closed:** 40% → 75% = **+35% improvement**

---

## 📋 Implementation Plan

### Week 1: SMS Integration (Twilio)

#### Database Schema

```sql
-- SMS configuration and templates
CREATE TABLE sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  message_template TEXT NOT NULL, -- With ${variable} placeholders
  variables TEXT[] DEFAULT '{}',
  category TEXT, -- 'notification', 'campaign', 'alert', 'reminder'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SMS message log
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'undelivered')),
  twilio_sid TEXT, -- Twilio message SID
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SMS campaigns
CREATE TABLE sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Two-way SMS conversations (webhook handling)
CREATE TABLE sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message TEXT NOT NULL,
  twilio_sid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sms_messages_tenant_user ON sms_messages(tenant_id, user_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_sent_at ON sms_messages(sent_at);
CREATE INDEX idx_sms_campaigns_tenant ON sms_campaigns(tenant_id);
CREATE INDEX idx_sms_campaigns_status ON sms_campaigns(status);
CREATE INDEX idx_sms_conversations_tenant_phone ON sms_conversations(tenant_id, phone_number);
```

#### Environment Variables

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_WEBHOOK_URL=https://yourdomain.com/api/webhooks/twilio
```

#### API Routes

1. **POST /api/communications/sms/send** - Send single SMS
2. **POST /api/communications/sms/bulk** - Send bulk SMS
3. **GET /api/communications/sms/templates** - List SMS templates
4. **POST /api/communications/sms/templates** - Create SMS template
5. **POST /api/communications/sms/campaigns** - Create SMS campaign
6. **GET /api/communications/sms/campaigns/:id** - Get campaign status
7. **POST /api/webhooks/twilio** - Handle Twilio webhooks (delivery status, incoming SMS)

#### Service Implementation

```typescript
// services/sms-service.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(
  to: string,
  message: string,
  tenantId: string,
  userId?: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const result = await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
      body: message,
    });

    // Log to database
    await db.insert(smsMessages).values({
      tenantId,
      userId,
      phoneNumber: to,
      message,
      status: 'sent',
      twilioSid: result.sid,
      sentAt: new Date(),
    });

    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS send error:', error);
    
    // Log failure
    await db.insert(smsMessages).values({
      tenantId,
      userId,
      phoneNumber: to,
      message,
      status: 'failed',
      errorMessage: error.message,
    });

    return { success: false, error: error.message };
  }
}

export async function sendBulkSMS(
  recipients: { phone: string; userId?: string }[],
  message: string,
  tenantId: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await sendSMS(recipient.phone, message, tenantId, recipient.userId);
    if (result.success) sent++;
    else failed++;

    // Rate limiting: 1 message per second (Twilio limit)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return { sent, failed };
}

// Handle Twilio webhook for delivery status
export async function handleTwilioWebhook(data: any): Promise<void> {
  const { MessageSid, MessageStatus } = data;

  await db.update(smsMessages)
    .set({
      status: MessageStatus,
      deliveredAt: MessageStatus === 'delivered' ? new Date() : undefined,
      errorMessage: data.ErrorCode ? data.ErrorMessage : undefined,
    })
    .where(eq(smsMessages.twilioSid, MessageSid));
}
```

#### UI Components

- SMS template editor (`components/communications/sms-template-editor.tsx`)
- SMS campaign builder (`components/communications/sms-campaign-builder.tsx`)
- SMS conversation viewer (`components/communications/sms-conversations.tsx`)

**Deliverables:**

- ✅ Twilio integration working
- ✅ SMS templates created
- ✅ Bulk SMS sending
- ✅ Delivery tracking
- ✅ Webhook handling for status updates
- ✅ Two-way SMS receiving

---

### Week 2: Survey & Polling System

#### Database Schema

```sql
-- Survey definitions
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  anonymous BOOLEAN DEFAULT FALSE,
  allow_multiple_responses BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Survey questions
CREATE TABLE survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'checkbox', 'text', 'rating', 'yes_no', 'scale')),
  options JSONB, -- For multiple choice, checkbox: ["Option 1", "Option 2"]
  required BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Survey responses
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL if anonymous
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual question answers
CREATE TABLE survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_options TEXT[], -- For multiple choice/checkbox
  answer_number INTEGER, -- For rating/scale
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quick polls (simplified surveys)
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- ["Option 1", "Option 2", "Option 3"]
  status TEXT NOT NULL CHECK (status IN ('active', 'closed')),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poll_id, user_id) -- One vote per person
);

-- Indexes
CREATE INDEX idx_surveys_tenant_status ON surveys(tenant_id, status);
CREATE INDEX idx_survey_questions_survey ON survey_questions(survey_id, order_index);
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX idx_survey_answers_response ON survey_answers(response_id);
CREATE INDEX idx_polls_tenant_status ON polls(tenant_id, status);
CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);
```

#### API Routes

1. **POST /api/communications/surveys** - Create survey
2. **GET /api/communications/surveys** - List surveys
3. **GET /api/communications/surveys/:id** - Get survey details
4. **POST /api/communications/surveys/:id/questions** - Add question
5. **POST /api/communications/surveys/:id/responses** - Submit response
6. **GET /api/communications/surveys/:id/results** - Get results with analytics
7. **POST /api/communications/polls** - Create quick poll
8. **POST /api/communications/polls/:id/vote** - Cast vote
9. **GET /api/communications/polls/:id/results** - Get poll results

#### UI Components

- Survey builder with drag-drop questions (`components/communications/survey-builder.tsx`)
- Survey response form (`components/communications/survey-form.tsx`)
- Survey results dashboard (`components/communications/survey-results.tsx`)
- Quick poll creator (`components/communications/poll-creator.tsx`)
- Poll widget for embedding (`components/communications/poll-widget.tsx`)

**Deliverables:**

- ✅ Survey creation UI
- ✅ 6 question types (multiple choice, checkbox, text, rating, yes/no, scale)
- ✅ Response collection
- ✅ Results analytics (charts, percentages, breakdown)
- ✅ Quick polls
- ✅ Anonymous responses option

---

### Week 3: Newsletter Builder

#### Database Schema

```sql
-- Newsletter templates
CREATE TABLE newsletter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  html_content TEXT NOT NULL,
  thumbnail_url TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Newsletters (campaigns)
CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  template_id UUID REFERENCES newsletter_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Newsletter recipients
CREATE TABLE newsletter_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  resend_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Newsletter distribution lists
CREATE TABLE distribution_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filter_criteria JSONB, -- Dynamic filters: {"role": "member", "status": "active"}
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_newsletter_templates_tenant ON newsletter_templates(tenant_id);
CREATE INDEX idx_newsletters_tenant_status ON newsletters(tenant_id, status);
CREATE INDEX idx_newsletter_recipients_newsletter ON newsletter_recipients(newsletter_id);
CREATE INDEX idx_newsletter_recipients_status ON newsletter_recipients(status);
CREATE INDEX idx_distribution_lists_tenant ON distribution_lists(tenant_id);
```

#### API Routes

1. **GET /api/communications/newsletters/templates** - List templates
2. **POST /api/communications/newsletters/templates** - Create template
3. **POST /api/communications/newsletters** - Create newsletter
4. **GET /api/communications/newsletters** - List newsletters
5. **GET /api/communications/newsletters/:id** - Get newsletter details
6. **PUT /api/communications/newsletters/:id** - Update newsletter
7. **POST /api/communications/newsletters/:id/send** - Send newsletter
8. **POST /api/communications/newsletters/:id/schedule** - Schedule newsletter
9. **GET /api/communications/newsletters/:id/analytics** - Get campaign analytics
10. **POST /api/communications/distribution-lists** - Create distribution list
11. **GET /api/communications/distribution-lists** - List distribution lists

#### Service Implementation

```typescript
// services/newsletter-service.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendNewsletter(
  newsletterId: string,
  tenantId: string
): Promise<{ sent: number; failed: number }> {
  // Get newsletter and recipients
  const newsletter = await db.query.newsletters.findFirst({
    where: eq(newsletters.id, newsletterId),
  });

  const recipients = await db.query.newsletterRecipients.findMany({
    where: eq(newsletterRecipients.newsletterId, newsletterId),
  });

  let sent = 0;
  let failed = 0;

  // Send to each recipient (batch by 100)
  for (let i = 0; i < recipients.length; i += 100) {
    const batch = recipients.slice(i, i + 100);

    try {
      const results = await resend.emails.sendBatch(
        batch.map(recipient => ({
          from: process.env.EMAIL_FROM,
          to: recipient.email,
          subject: newsletter.subject,
          html: newsletter.htmlContent,
          text: newsletter.plainTextContent,
          headers: {
            'X-Newsletter-Id': newsletterId,
            'X-Recipient-Id': recipient.id,
          },
        }))
      );

      // Update recipients status
      for (const result of results) {
        if (result.error) {
          failed++;
          await db.update(newsletterRecipients)
            .set({ status: 'bounced' })
            .where(eq(newsletterRecipients.id, result.id));
        } else {
          sent++;
          await db.update(newsletterRecipients)
            .set({
              status: 'sent',
              sentAt: new Date(),
              resendMessageId: result.id,
            })
            .where(eq(newsletterRecipients.id, result.id));
        }
      }
    } catch (error) {
      console.error('Batch send error:', error);
      failed += batch.length;
    }

    // Rate limiting: 1 batch per second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Update newsletter status
  await db.update(newsletters)
    .set({
      status: 'sent',
      sentAt: new Date(),
      recipientCount: recipients.length,
    })
    .where(eq(newsletters.id, newsletterId));

  return { sent, failed };
}

// Track email opens (via tracking pixel)
export async function trackNewsletterOpen(
  recipientId: string
): Promise<void> {
  await db.update(newsletterRecipients)
    .set({
      status: 'opened',
      openedAt: new Date(),
    })
    .where(eq(newsletterRecipients.id, recipientId));
}

// Track link clicks
export async function trackNewsletterClick(
  recipientId: string
): Promise<void> {
  await db.update(newsletterRecipients)
    .set({
      status: 'clicked',
      clickedAt: new Date(),
    })
    .where(eq(newsletterRecipients.id, recipientId));
}
```

#### UI Components

- WYSIWYG newsletter editor with blocks (`components/communications/newsletter-editor.tsx`)
- Template gallery (`components/communications/template-gallery.tsx`)
- Recipient list builder (`components/communications/recipient-list-builder.tsx`)
- Campaign scheduler (`components/communications/campaign-scheduler.tsx`)
- Newsletter preview (`components/communications/newsletter-preview.tsx`)

**Deliverables:**

- ✅ WYSIWYG editor (drag-drop blocks)
- ✅ Template library (5+ professional templates)
- ✅ Distribution list management
- ✅ Scheduling system
- ✅ Send tracking (opens, clicks)
- ✅ Unsubscribe handling

---

### Week 4: Communication Analytics & Push Notifications

#### Communication Analytics

**Database Schema:**

```sql
-- Communication analytics aggregates
CREATE TABLE communication_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed')),
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, date, channel, metric_type)
);

-- Member engagement scores
CREATE TABLE member_engagement_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  engagement_score INTEGER DEFAULT 0, -- 0-100
  email_opens INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,
  sms_responses INTEGER DEFAULT 0,
  survey_completions INTEGER DEFAULT 0,
  last_engaged_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_communication_analytics_tenant_date ON communication_analytics(tenant_id, date);
CREATE INDEX idx_member_engagement_tenant_score ON member_engagement_scores(tenant_id, engagement_score);
```

**API Routes:**

1. **GET /api/communications/analytics/overview** - Overall stats
2. **GET /api/communications/analytics/emails** - Email campaign performance
3. **GET /api/communications/analytics/sms** - SMS campaign performance
4. **GET /api/communications/analytics/engagement** - Member engagement scores
5. **GET /api/communications/analytics/trends** - Engagement trends over time

**UI Component:**

- Analytics dashboard (`app/[locale]/dashboard/communications/analytics/page.tsx`)
  - Channel comparison charts (email vs SMS vs push)
  - Campaign performance table
  - Engagement heatmap
  - Top engaged members list
  - Trend graphs (7/30/90 days)

#### Mobile Push Notifications

**Database Schema:**

```sql
-- Device tokens for push notifications
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Push notification log
CREATE TABLE push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  fcm_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active);
CREATE INDEX idx_push_notifications_tenant_user ON push_notifications(tenant_id, user_id);
```

**Environment Variables:**

```env
# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

**Service Implementation:**

```typescript
// services/push-notification-service.ts
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

export async function sendPushNotification(
  userId: string,
  tenantId: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Get active device tokens for user
    const tokens = await db.query.deviceTokens.findMany({
      where: and(
        eq(deviceTokens.userId, userId),
        eq(deviceTokens.isActive, true)
      ),
    });

    if (tokens.length === 0) {
      return { success: false, error: 'No active device tokens' };
    }

    // Send to all devices
    const results = await admin.messaging().sendEachForMulticast({
      tokens: tokens.map(t => t.token),
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
    });

    // Log notification
    await db.insert(pushNotifications).values({
      tenantId,
      userId,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      status: results.successCount > 0 ? 'sent' : 'failed',
      fcmMessageId: results.responses[0]?.messageId,
      sentAt: new Date(),
    });

    return {
      success: results.successCount > 0,
      messageId: results.responses[0]?.messageId,
    };
  } catch (error) {
    console.error('Push notification error:', error);
    return { success: false, error: error.message };
  }
}
```

**API Routes:**

1. **POST /api/communications/push/register** - Register device token
2. **POST /api/communications/push/send** - Send push notification
3. **POST /api/communications/push/unregister** - Remove device token

**Deliverables:**

- ✅ Firebase Cloud Messaging setup
- ✅ Device token registration
- ✅ Push notification sending
- ✅ Analytics dashboard
- ✅ Engagement scoring
- ✅ Trend analysis

---

## 📊 Success Metrics

### Feature Completion

- ✅ SMS integration (Twilio) → +10% feature parity
- ✅ Survey/polling tools → +10% feature parity
- ✅ Newsletter builder → +10% feature parity
- ✅ Communication analytics → +5% feature parity
- ✅ Push notifications → +5% feature parity

**Total Improvement:** 40% → 80% = **+40% feature parity**

### Competitive Position

**Before Phase 5:**

- Member Communications: 40% complete
- Overall Feature Parity: 87%

**After Phase 5:**

- Member Communications: 80% complete
- Overall Feature Parity: 91%

### Usage Metrics (Track After Launch)

- Email open rate: Target 25-35%
- SMS delivery rate: Target 95%+
- Survey response rate: Target 20-30%
- Newsletter click-through rate: Target 3-5%
- Push notification delivery: Target 90%+

---

## 🚀 Launch Checklist

### Pre-Launch (Week 4)

- [ ] All database migrations tested
- [ ] Twilio account configured and verified
- [ ] Firebase project set up for FCM
- [ ] SMS templates created (10+ templates)
- [ ] Newsletter templates created (5+ templates)
- [ ] Survey question types tested
- [ ] Analytics dashboard populated with sample data
- [ ] User documentation written
- [ ] Admin training materials prepared

### Launch (Week 5)

- [ ] Deploy to staging
- [ ] Full integration testing
- [ ] Load testing (1000+ recipients)
- [ ] Security audit (SMS/email injection prevention)
- [ ] Rate limiting verified (Twilio, Resend)
- [ ] Webhook handling tested (Twilio, Resend)
- [ ] Deploy to production
- [ ] Monitor error rates

### Post-Launch (Week 6)

- [ ] User feedback collected
- [ ] Performance metrics reviewed
- [ ] Bug fixes prioritized
- [ ] Feature enhancements planned
- [ ] Competitive analysis updated

---

## 💰 Cost Estimate

### Development Time

- SMS Integration: 40 hours
- Survey System: 40 hours
- Newsletter Builder: 40 hours
- Analytics & Push: 40 hours
- Testing & Documentation: 20 hours

**Total:** 180 hours (4.5 weeks at 40 hours/week)

### Third-Party Services

- **Twilio:** $0.0075 per SMS (US/Canada)
  - 10,000 SMS/month = $75/month
- **Resend:** Included in existing plan (50,000 emails/month)
- **Firebase Cloud Messaging:** Free (unlimited)

**Monthly Recurring:** ~$75 for SMS (scales with usage)

---

## 🔄 Future Enhancements (Phase 6)

### Not Included in Phase 5 (Deferred)

- ❌ Social media integration (Facebook, Twitter, Instagram)
- ❌ Two-way SMS conversation UI
- ❌ A/B testing for campaigns
- ❌ Advanced segmentation (behavioral triggers)
- ❌ SMS shortcodes (requires higher Twilio tier)
- ❌ Voice calls (Twilio Voice API)
- ❌ WhatsApp/Telegram integration

### Rationale for Deferral

- Social media integration requires complex OAuth flows and ongoing API maintenance
- Two-way SMS conversation UI is low priority (webhook handling implemented)
- A/B testing needs statistical significance engine (complex)
- Advanced features can wait until core communications proven

**Phase 5 Focus:** Get core communications to 80%, not 100%. Ship fast, iterate based on user feedback.

---

## 📝 Notes

### Architecture Decisions

1. **SMS Provider:** Twilio chosen over Nexmo/MessageBird for better documentation and reliability
2. **Email Provider:** Continue using Resend (already integrated, excellent API)
3. **Push Provider:** Firebase Cloud Messaging (industry standard, free tier)
4. **Survey Storage:** PostgreSQL (not separate SaaS tool) for data ownership and RLS security

### Security Considerations

1. **SMS Injection Prevention:** Validate phone numbers, sanitize message content
2. **Email Spam Prevention:** Rate limiting, unsubscribe links, SPF/DKIM/DMARC
3. **Push Notification Security:** Device token validation, tenant isolation
4. **Survey Privacy:** Anonymous responses option, RLS policies on all tables

### Performance Optimization

1. **Bulk Sending:** Batch API calls (100 emails/SMS per batch)
2. **Rate Limiting:** Respect provider limits (Twilio: 1/sec, Resend: 100/min)
3. **Analytics:** Materialized views for aggregations (refresh daily)
4. **Webhooks:** Async processing with queue (BullMQ)

---

## ✅ Definition of Done

Phase 5 is complete when:

1. ✅ SMS can be sent to individual members and bulk lists
2. ✅ Surveys can be created, shared, and responses collected
3. ✅ Newsletters can be built, scheduled, and sent with tracking
4. ✅ Communication analytics dashboard shows all channels
5. ✅ Push notifications working for web/mobile
6. ✅ All 179 RLS policies updated for new tables
7. ✅ Documentation complete (user guides + API docs)
8. ✅ Integration tests passing (95%+ coverage)
9. ✅ Load testing completed (1000+ concurrent sends)
10. ✅ Competitive analysis document updated (40% → 80%)

**Target Completion:** January 10, 2026 (4 weeks from Dec 6, 2025)
