# API Catalog & Integration Map

**Union Claims Platform - Complete Reference**

## Authentication & Authorization

### Clerk Authentication (Primary)

- **Provider:** Clerk.com
- **Flow:** OAuth 2.0 / JWT
- **Endpoints:**
  - Sign-in: `https://[tenant].clerk.accounts.dev/sign-in`
  - Sign-up: `https://[tenant].clerk.accounts.dev/sign-up`
  - User management: Clerk Dashboard API

### JWT Token Structure

```typescript
interface ClerkJWT {
  sub: string;              // User ID
  email: string;
  tenant_id: string;
  org_id: string;
  org_role: string;         // 'admin', 'steward', 'member'
  org_permissions: string[];
  iat: number;
  exp: number;
}
```

### Authorization Middleware

```typescript
// All protected routes require:
headers: {
  'Authorization': 'Bearer <jwt_token>',
  'X-Tenant-ID': '<tenant_id>'
}
```

---

## Core API Services

### 1. Claims Management API

**Base URL:** `/api/claims`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/claims` | List all claims (tenant-filtered) | Yes |
| POST | `/api/claims` | Create new claim | Yes |
| GET | `/api/claims/:id` | Get claim details | Yes |
| PUT | `/api/claims/:id` | Update claim | Yes |
| DELETE | `/api/claims/:id` | Delete claim (soft) | Admin |
| POST | `/api/claims/:id/assign` | Assign steward | Admin/Steward |
| POST | `/api/claims/:id/status` | Update status | Yes |
| GET | `/api/claims/:id/timeline` | Get activity timeline | Yes |
| POST | `/api/claims/:id/comment` | Add comment | Yes |
| GET | `/api/claims/:id/documents` | List documents | Yes |
| POST | `/api/claims/:id/documents` | Upload document | Yes |

**Query Parameters:**

```typescript
interface ClaimQueryParams {
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string;
  member_id?: string;
  from_date?: string; // ISO 8601
  to_date?: string;
  limit?: number;
  offset?: number;
}
```

### 2. Member Management API

**Base URL:** `/api/members`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/members` | List members | Yes |
| POST | `/api/members` | Create member | Admin |
| GET | `/api/members/:id` | Get member profile | Yes |
| PUT | `/api/members/:id` | Update member | Admin |
| POST | `/api/members/:id/deactivate` | Deactivate member | Admin |
| GET | `/api/members/:id/claims` | Member's claims | Yes |
| GET | `/api/members/:id/stats` | Member statistics | Yes |
| POST | `/api/members/bulk-import` | Import from CSV | Admin |

### 3. Deadlines API

**Base URL:** `/api/deadlines`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/deadlines` | List deadlines | Yes |
| POST | `/api/deadlines` | Create deadline | Yes |
| GET | `/api/deadlines/:id` | Get deadline | Yes |
| PUT | `/api/deadlines/:id` | Update deadline | Yes |
| POST | `/api/deadlines/:id/complete` | Mark complete | Yes |
| POST | `/api/deadlines/:id/extend` | Request extension | Yes |
| GET | `/api/deadlines/upcoming` | Upcoming (7 days) | Yes |
| GET | `/api/deadlines/overdue` | Overdue list | Yes |

### 4. Documents API

**Base URL:** `/api/documents`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/documents/upload` | Upload document | Yes |
| GET | `/api/documents/:id` | Get document metadata | Yes |
| GET | `/api/documents/:id/download` | Download file | Yes |
| DELETE | `/api/documents/:id` | Delete document | Yes |
| POST | `/api/documents/:id/analyze` | AI analysis | Yes |
| GET | `/api/documents/:id/preview` | Get preview URL | Yes |

**Upload Format:**

```typescript
// multipart/form-data
{
  file: File;
  document_type: 'grievance' | 'contract' | 'evidence' | 'correspondence';
  claim_id?: string;
  metadata?: {
    title: string;
    description?: string;
    tags?: string[];
  };
}
```

### 5. Notifications API

**Base URL:** `/api/notifications`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/notifications` | Get user notifications | Yes |
| PUT | `/api/notifications/:id/read` | Mark as read | Yes |
| PUT | `/api/notifications/read-all` | Mark all as read | Yes |
| GET | `/api/notifications/preferences` | Get preferences | Yes |
| PUT | `/api/notifications/preferences` | Update preferences | Yes |
| POST | `/api/notifications/test` | Send test notification | Admin |

---

## AI Services

### 1. AI Service API

**Base URL:** `http://localhost:3005/api/ai`

| Method | Endpoint | Description | Internal Only |
|--------|----------|-------------|---------------|
| POST | `/api/ai/analyze/document` | Analyze legal document | Yes |
| POST | `/api/ai/analyze/contract` | Analyze contract | Yes |
| POST | `/api/ai/document/summarize` | Summarize document | Yes |
| POST | `/api/ai/predict/outcome` | Predict case outcome | Yes |
| POST | `/api/ai/predict/timeline` | Estimate timeline | Yes |
| POST | `/api/ai/predict/resources` | Resource recommendation | Yes |
| POST | `/api/ai/predict/settlement` | Settlement estimate | Yes |
| POST | `/api/ai/nlp/query` | Natural language query | Yes |
| GET | `/api/ai/health` | Health check | Yes |

**Document Analysis Request:**

```typescript
interface DocumentAnalysisRequest {
  documentText: string;
  documentType?: 'grievance' | 'contract' | 'policy' | 'correspondence';
  options?: {
    extractEntities?: boolean;
    analyzeSentiment?: boolean;
    identifyIssues?: boolean;
    suggestActions?: boolean;
  };
}
```

**Prediction Request:**

```typescript
interface OutcomePredictionRequest {
  claimId: string;
  claimData: {
    type: string;
    description: string;
    evidence: string[];
    historicalContext?: object;
  };
}
```

### 2. Workflow Service API

**Base URL:** `http://localhost:3006/api`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/workflows` | List workflows | Yes |
| POST | `/api/workflows` | Create workflow | Admin |
| GET | `/api/workflows/:id` | Get workflow | Yes |
| PUT | `/api/workflows/:id` | Update workflow | Admin |
| DELETE | `/api/workflows/:id` | Delete workflow | Admin |
| POST | `/api/workflows/:id/start` | Start workflow | Yes |
| GET | `/api/workflow-instances` | List instances | Yes |
| GET | `/api/workflow-instances/:id` | Get instance | Yes |
| POST | `/api/workflow-instances/:id/pause` | Pause instance | Yes |
| POST | `/api/workflow-instances/:id/resume` | Resume instance | Yes |
| POST | `/api/workflow-instances/:id/cancel` | Cancel instance | Yes |
| GET | `/api/workflow-templates` | List templates | Yes |
| POST | `/api/workflows/from-template/:id` | Create from template | Admin |
| GET | `/api/approvals/pending` | Pending approvals | Yes |
| POST | `/api/approvals/:id/respond` | Approve/reject | Yes |

**Workflow Definition:**

```typescript
interface WorkflowDefinition {
  name: string;
  category: 'claim-processing' | 'approval' | 'notification' | 'custom';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, any>;
}

interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'task' | 'decision' | 'approval' | 'notification' | 'ai-prediction';
  name: string;
  config: {
    assignee?: string;
    approver?: string;
    notificationTemplate?: string;
    aiModel?: string;
    condition?: string;
  };
}
```

---

## External Integrations

### 1. Stripe Payment Processing

**Purpose:** Subscription billing, donations, payment processing

**Webhooks:**

```
POST /api/webhooks/stripe
Events:
  - payment_intent.succeeded
  - payment_intent.payment_failed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - charge.succeeded
  - charge.failed
```

**API Calls (Backend):**

```typescript
// Create subscription
stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  trial_period_days: 14
});

// Create payment intent
stripe.paymentIntents.create({
  amount: 10000, // $100.00
  currency: 'cad',
  metadata: { tenant_id, transaction_id }
});

// Process refund
stripe.refunds.create({
  payment_intent: paymentIntentId
});
```

### 2. Supabase Backend

**Purpose:** Database, authentication, storage, real-time subscriptions

**Services Used:**

- PostgreSQL Database (Supabase Postgres)
- Storage (S3-compatible)
- Real-time subscriptions (WebSocket)
- Row Level Security (RLS)

**Connection:**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

**Real-time Subscriptions:**

```typescript
// Subscribe to claim updates
supabase
  .channel('claims-channel')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'claims', filter: `tenant_id=eq.${tenantId}` },
    (payload) => handleClaimUpdate(payload)
  )
  .subscribe();
```

### 3. Twilio Communications (Optional)

**Purpose:** SMS notifications, voice calls

**Endpoints:**

```
POST /api/integrations/twilio/sms
POST /api/integrations/twilio/voice-call
```

**Configuration:**

```typescript
interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string; // Twilio number
}
```

### 4. SendGrid Email (Optional)

**Purpose:** Transactional emails, marketing

**Templates:**

- Claim status update
- Deadline reminder
- Weekly digest
- Password reset
- Welcome email

---

## Webhooks & Events

### Outbound Webhooks

```typescript
interface WebhookEvent {
  event: string;
  timestamp: string;
  tenant_id: string;
  data: object;
  signature: string; // HMAC-SHA256
}

// Available events:
- claim.created
- claim.updated
- claim.status_changed
- claim.assigned
- claim.resolved
- deadline.approaching
- deadline.missed
- member.created
- workflow.completed
- payment.received
```

### Inbound Webhooks

```
POST /api/webhooks/stripe          - Stripe events
POST /api/webhooks/github          - GitHub Actions (CI/CD)
POST /api/webhooks/custom          - Custom integrations
```

---

## Real-time Channels

### WebSocket Subscriptions

```typescript
// Claims updates
ws://localhost:3000/realtime/claims?tenant_id={id}

// Notifications
ws://localhost:3000/realtime/notifications?user_id={id}

// Workflow approvals
ws://localhost:3000/realtime/approvals?user_id={id}

// Analytics dashboard
ws://localhost:3000/realtime/analytics?tenant_id={id}
```

---

## Rate Limiting

### Global Limits

```yaml
Tier: Free
  - 100 requests/minute per IP
  - 1,000 requests/hour per tenant
  
Tier: Professional
  - 500 requests/minute per IP
  - 10,000 requests/hour per tenant
  
Tier: Enterprise
  - Unlimited (fair use)
```

### Specific Endpoints

```yaml
POST /api/ai/*:
  - 50 requests/hour (Free)
  - 500 requests/hour (Professional)
  - Unlimited (Enterprise)

POST /api/documents/upload:
  - 100 MB/day (Free)
  - 1 GB/day (Professional)
  - 10 GB/day (Enterprise)
```

---

## Error Handling

### Standard Error Response

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: object;
    timestamp: string;
    request_id: string;
  };
}

// Example:
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "timestamp": "2025-11-16T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

### HTTP Status Codes

```
200 - OK
201 - Created
204 - No Content
400 - Bad Request
401 - Unauthorized
403 - Forbidden
404 - Not Found
409 - Conflict
422 - Unprocessable Entity
429 - Too Many Requests
500 - Internal Server Error
503 - Service Unavailable
```

---

## API Versioning

### Current Version: v1

```
Base URL: /api/v1/*
Header: Accept: application/vnd.unionclaims.v1+json
```

### Deprecation Policy

- 6 months notice before deprecation
- 12 months support for deprecated endpoints
- Migration guide provided

---

## SDK & Client Libraries

### JavaScript/TypeScript

```typescript
import { UnionClaimsClient } from '@unionclaims/sdk';

const client = new UnionClaimsClient({
  apiKey: process.env.API_KEY,
  tenantId: 'your-tenant-id'
});

await client.claims.list({ status: 'open' });
```

### Python (Future)

```python
from unionclaims import Client

client = Client(api_key="...", tenant_id="...")
claims = client.claims.list(status="open")
```

---

## Health & Monitoring

### Health Check Endpoints

```
GET /health                    - Overall health
GET /health/db                 - Database connectivity
GET /health/ai-service         - AI service status
GET /health/workflow-service   - Workflow service status
GET /health/storage            - Storage service status
```

### Metrics Endpoint (Prometheus)

```
GET /metrics
```

---

## Security Headers

### Required for All Requests

```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
X-XSS-Protection: 1; mode=block
```

### CORS Configuration

```yaml
Allowed Origins:
  - https://app.unionclaims.com
  - https://*.unionclaims.com
  
Allowed Methods:
  - GET, POST, PUT, DELETE, OPTIONS
  
Allowed Headers:
  - Authorization, Content-Type, X-Tenant-ID
  
Max Age: 86400
```
