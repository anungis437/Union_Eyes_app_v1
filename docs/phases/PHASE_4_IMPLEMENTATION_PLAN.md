# Phase 4: Communications & Organizing - Implementation Plan

**Status:** 🚀 ACTIVE DEVELOPMENT  
**Started:** February 13, 2026  
**Goal:** Build messaging infrastructure and organizer workflows to surpass incumbent weakness

---

## Strategic Context

From ROADMAP_TO_SURPASS_INCUMBENTS.md:

> **Phase 4: Communications & Organizing (Adoption + Value)**  
> Goal: Credible baseline where incumbents are weak

**Acceptance Criteria:**
- Local can run compliant campaign in <15 minutes without external tools
- Segmented member outreach with consent compliance
- Organizer workflows reduce administrative overhead

---

## Architecture Overview

### Core Components

```
Phase 4 Stack:
├─ Messaging Infrastructure
│  ├─ Email Service (Resend/SendGrid adapter)
│  ├─ SMS Service (Twilio adapter)
│  ├─ Message Queue (background jobs)
│  └─ Delivery Tracking (opens, clicks, bounces)
│
├─ Campaign Management
│  ├─ Campaign Builder UI
│  ├─ Segment Integration (from member lists)
│  ├─ Template Library
│  └─ Schedule & Send Engine
│
├─ Consent & Preferences
│  ├─ Preference Center UI
│  ├─ Opt-in/Opt-out Management
│  ├─ Communication Consent Tracking
│  └─ Privacy Compliance (CASL, GDPR)
│
├─ Organizer Workflows
│  ├─ Steward Assignment Engine
│  ├─ Member Outreach Sequences
│  ├─ Task Management
│  └─ Field Notes & Relationship CRM
│
└─ Push Notifications
   ├─ PWA Push Service Worker
   ├─ Critical Alerts (strike votes, urgent notices)
   └─ Notification Preferences
```

---

## Week 1: Messaging Core Infrastructure (Days 1-5)

**Goal:** Build pluggable messaging service layer

### Day 1-2: Database Schema & Core Services

**Schema:**
```sql
-- Communication Channels
CREATE TABLE communication_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  provider VARCHAR(50) NOT NULL, -- 'resend', 'sendgrid', 'twilio'
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  daily_limit INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Templates
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push'
  category VARCHAR(100), -- 'campaign', 'transactional', 'alert'
  subject VARCHAR(500),
  body TEXT NOT NULL,
  variables JSONB, -- [{name, description, required, default}]
  metadata JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'broadcast', 'sequence', 'triggered'
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'
  template_id UUID REFERENCES message_templates(id),
  segment_id UUID, -- Reference to saved member segment
  audience_count INTEGER,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Log (immutable)
CREATE TABLE message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campaign_id UUID REFERENCES campaigns(id),
  recipient_id UUID NOT NULL, -- member/user ID
  channel_type VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_message_id VARCHAR(255),
  subject VARCHAR(500),
  status VARCHAR(50) NOT NULL, -- 'queued', 'sent', 'delivered', 'bounced', 'failed', 'opened', 'clicked'
  error_message TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication Preferences
CREATE TABLE communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  categories JSONB DEFAULT '{}', -- {campaign: true, transactional: true, alert: true}
  frequency VARCHAR(50) DEFAULT 'real_time', -- 'real_time', 'daily_digest', 'weekly_digest'
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE communication_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;
```

**Services:**
- `lib/services/messaging/email-service.ts` - Email provider abstraction
- `lib/services/messaging/sms-service.ts` - SMS provider abstraction
- `lib/services/messaging/campaign-service.ts` - Campaign orchestration
- `lib/services/messaging/consent-service.ts` - Consent management

### Day 3: API Endpoints

**Routes:**
```
POST   /api/messaging/campaigns              - Create campaign
GET    /api/messaging/campaigns              - List campaigns
GET    /api/messaging/campaigns/:id          - Get campaign details
PUT    /api/messaging/campaigns/:id          - Update campaign
POST   /api/messaging/campaigns/:id/send     - Send campaign
POST   /api/messaging/campaigns/:id/schedule - Schedule campaign
DELETE /api/messaging/campaigns/:id          - Cancel campaign

POST   /api/messaging/templates              - Create template
GET    /api/messaging/templates              - List templates
GET    /api/messaging/templates/:id          - Get template
PUT    /api/messaging/templates/:id          - Update template
DELETE /api/messaging/templates/:id          - Delete template

GET    /api/messaging/preferences            - Get user preferences
PUT    /api/messaging/preferences            - Update preferences
POST   /api/messaging/unsubscribe            - Unsubscribe user

GET    /api/messaging/analytics              - Campaign analytics
GET    /api/messaging/delivery-log           - Delivery log (paginated)
```

### Day 4-5: Campaign Builder UI

**Components:**
- Campaign creation wizard (4 steps)
- Template selector with preview
- Audience segment picker
- Schedule and send controls

---

## Week 2: Consent & Preference Management (Days 6-10)

### Deliverables:
1. Preference Center UI (/dashboard/preferences/communications)
2. Opt-in/Opt-out workflows
3. CASL & GDPR compliance tracking
4. Unsubscribe landing pages

---

## Week 3: Organizer Workflows (Days 11-15)

**Goal:** Steward assignment and member outreach tools

### Database Schema:
```sql
-- Steward Assignments
CREATE TABLE steward_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  steward_id UUID NOT NULL,
  member_id UUID NOT NULL,
  assignment_type VARCHAR(50) NOT NULL, -- 'primary', 'backup', 'temporary'
  effective_date DATE NOT NULL,
  end_date DATE,
  worksite_id UUID,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach Sequences
CREATE TABLE outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL, -- 'manual', 'case_opened', 'new_member', 'campaign'
  steps JSONB NOT NULL, -- [{step, delay_days, template_id, action_type}]
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field Notes (Organizer CRM)
CREATE TABLE field_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  member_id UUID NOT NULL,
  author_id UUID NOT NULL,
  note_type VARCHAR(50), -- 'contact', 'grievance', 'organizing', 'meeting', 'personal'
  content TEXT NOT NULL,
  sentiment VARCHAR(50), -- 'positive', 'neutral', 'negative', 'concerned'
  follow_up_date DATE,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizer Tasks
CREATE TABLE organizer_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  assigned_to UUID NOT NULL,
  member_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### UI Components:
- Steward assignment dashboard
- Member outreach sequences builder
- Field notes interface
- Task management board

---

## Week 4: Push Notifications & PWA (Days 16-20)

### Deliverables:
1. Service Worker for PWA push
2. Push notification API endpoints
3. Critical alerts system (strike votes, urgent notices)
4. Notification preferences UI

---

## Technical Implementation Notes

### Email Provider Integration

**Primary:** Resend (modern, developer-friendly)
**Fallback:** SendGrid

```typescript
// lib/services/messaging/providers/resend-adapter.ts
export class ResendAdapter implements EmailProvider {
  async send(message: EmailMessage): Promise<SendResult> {
    // Implementation
  }
  
  async sendBatch(messages: EmailMessage[]): Promise<SendResult[]> {
    // Batch sending for campaigns
  }
}
```

### SMS Provider Integration

**Primary:** Twilio

```typescript
// lib/services/messaging/providers/twilio-adapter.ts
export class TwilioAdapter implements SMSProvider {
  async send(message: SMSMessage): Promise<SendResult> {
    // Implementation
  }
}
```

### Campaign Orchestration

```typescript
// lib/services/messaging/campaign-service.ts
export class CampaignService {
  async sendCampaign(campaignId: string): Promise<void> {
    // 1. Load campaign + template
    // 2. Resolve audience (segment query)
    // 3. Check consent for each recipient
    // 4. Queue messages (background job)
    // 5. Update campaign status
  }
  
  async processMessageQueue(): Promise<void> {
    // Background worker: dequeue and send
  }
}
```

---

## Compliance Requirements

### CASL (Canada's Anti-Spam Legislation)
- ✅ Express consent required for commercial messages
- ✅ Clear identification of sender
- ✅ Unsubscribe mechanism in every message
- ✅ Consent records with timestamp

### GDPR (for international members)
- ✅ Lawful basis for processing (consent/legitimate interest)
- ✅ Data portability (export preferences)
- ✅ Right to erasure (unsubscribe + data deletion)

---

## Testing Strategy

### Unit Tests
- Email/SMS provider adapters
- Campaign service logic
- Consent validation

### Integration Tests
- End-to-end campaign flow
- Unsubscribe workflow
- Template rendering with variables

### Load Tests
- Campaign sending performance (target: 1,000 emails/minute)
- Message queue throughput

---

## Success Metrics

### Operational
- Campaign setup time: **<15 minutes** (target from roadmap)
- Email delivery rate: **>98%**
- SMS delivery rate: **>95%**
- Unsubscribe rate: **<2%**

### Technical
- Message queue latency: **<5 seconds**
- Template rendering time: **<100ms**
- API response time (p95): **<500ms**

---

## Phase 4 Milestones

| Week | Milestone | Status |
|------|-----------|--------|
| 1 | Messaging Core Infrastructure | 🔄 In Progress |
| 2 | Consent & Preference Management | 📋 Planned |
| 3 | Organizer Workflows | 📋 Planned |
| 4 | Push Notifications & PWA | 📋 Planned |

**Target Completion:** March 13, 2026 (4 weeks)

---

## Next Immediate Steps

1. ✅ Create implementation plan (this document)
2. 🔄 Create database migration for messaging schema
3. 🔄 Build email service adapter (Resend)
4. 📋 Build campaign service
5. 📋 Create campaign management UI

---

## References

- [ROADMAP_TO_SURPASS_INCUMBENTS.md](./ROADMAP_TO_SURPASS_INCUMBENTS.md)
- CASL Compliance: https://crtc.gc.ca/eng/com500/faq500.htm
- GDPR Communications: https://gdpr.eu/email-consent/
