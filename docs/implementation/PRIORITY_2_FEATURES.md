# Priority 2 Features: AI, Accessibility & International Support

## Overview

This document covers the implementation of Union Eyes v2.0 Priority 2 features:

1. **AI Chatbot** - Union rights Q&A with RAG (Retrieval-Augmented Generation)
2. **Accessibility Audit** - WCAG 2.2 AA compliance testing and monitoring
3. **International Addresses** - Global address formats with validation

---

## 1. AI Chatbot with RAG

### Features

- **Multi-Provider Support**: OpenAI (GPT-4), Anthropic (Claude), Google (Gemini)
- **RAG (Retrieval-Augmented Generation)**: Semantic search over union knowledge base
- **Vector Search**: pgvector integration for document similarity
- **Content Safety**: OpenAI Moderation API filtering
- **Session Management**: Persistent conversation history
- **Citation Tracking**: Show sources for AI responses
- **Feedback System**: Thumbs up/down for response quality
- **Analytics**: Token usage, response times, satisfaction metrics

### Database Schema

#### Tables
- `chat_sessions` - Conversation threads
- `chat_messages` - Individual messages with RAG context
- `knowledge_base` - Vector-embedded documents (collective agreements, policies, laws)
- `chatbot_suggestions` - Quick-start prompts by category
- `chatbot_analytics` - Usage metrics aggregated by time period
- `ai_safety_filters` - Content moderation audit log

#### Enums
- `chat_session_status`: active, archived, deleted
- `message_role`: user, assistant, system, function
- `ai_provider`: openai, anthropic, google, internal
- `knowledge_document_type`: collective_agreement, union_policy, labor_law, precedent, faq, guide

### Service Layer

**Location**: `lib/ai/chatbot-service.ts`

#### ChatSessionManager
```typescript
await sessionManager.createSession({
  userId: "user_xxx",
  tenantId: "tenant_001",
  title: "Grievance Question",
  aiProvider: "openai",
  model: "gpt-4",
  contextTags: ["grievance", "workplace_rights"],
});
```

#### RAGService
```typescript
// Add document to knowledge base
await ragService.addDocument({
  tenantId: "tenant_001",
  title: "CBA Section 12: Grievance Procedure",
  documentType: "collective_agreement",
  content: "Full text of CBA section...",
  createdBy: "user_xxx",
});

// Search documents (cosine similarity)
const docs = await ragService.searchDocuments(
  "How do I file a grievance?",
  { tenantId: "tenant_001", limit: 3 }
);
```

#### ChatbotService
```typescript
const chatbot = new ChatbotService();

// Send message with RAG
const response = await chatbot.sendMessage({
  sessionId: "session_uuid",
  userId: "user_xxx",
  content: "What are my rights during disciplinary action?",
  useRAG: true, // Retrieve relevant documents
});

// Response includes:
// - AI-generated answer
// - Retrieved documents with relevance scores
// - Response time and token usage
```

### UI Component

**Location**: `components/ai/ai-chatbot.tsx`

```tsx
import { AIChatbot } from "@/components/ai/ai-chatbot";

<AIChatbot />
```

**Features**:
- Chat history sidebar with session management
- Real-time message streaming (optional)
- Citation display with document links
- Helpful/unhelpful feedback buttons
- Suggested questions by category
- Token usage and response time display

### API Endpoints

#### POST /api/chatbot/sessions
Create new chat session
```json
{
  "title": "Grievance Question",
  "aiProvider": "openai",
  "model": "gpt-4"
}
```

#### GET /api/chatbot/sessions
Get user's chat sessions

#### GET /api/chatbot/sessions/:id/messages
Get messages for session

#### POST /api/chatbot/messages
Send message and get AI response
```json
{
  "sessionId": "uuid",
  "content": "How do I file a grievance?",
  "useRAG": true
}
```

#### POST /api/chatbot/messages/:id/feedback
Provide feedback on AI response
```json
{
  "helpful": true
}
```

### Configuration

**Environment Variables**:
```bash
# OpenAI (GPT-4)
OPENAI_API_KEY=sk-xxx

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-xxx

# Google AI (Gemini)
GOOGLE_AI_API_KEY=xxx

# Default provider
AI_CHATBOT_DEFAULT_PROVIDER=openai
AI_CHATBOT_DEFAULT_MODEL=gpt-4
AI_CHATBOT_TEMPERATURE=0.7

# RAG Configuration
CHATBOT_RAG_ENABLED=true
CHATBOT_RAG_MIN_SIMILARITY=0.7
CHATBOT_RAG_MAX_DOCUMENTS=3

# Content Safety
CONTENT_SAFETY_ENABLED=true
```

### Knowledge Base Population

1. **Seed CBA Documents**:
```typescript
// scripts/seed-knowledge-base.ts
const ragService = new RAGService();

await ragService.addDocument({
  tenantId: "global",
  title: "Ontario Labour Relations Act",
  documentType: "labor_law",
  content: fs.readFileSync("./docs/olra.txt", "utf8"),
  sourceType: "legislation",
  sourceUrl: "https://ontario.ca/laws/statute/95l01",
  isPublic: true,
  createdBy: "system",
});
```

2. **Auto-import from existing CBAs**:
```sql
-- Extract CBA sections as knowledge base documents
INSERT INTO knowledge_base (tenant_id, title, document_type, content, source_type, source_id, created_by)
SELECT 
  tenant_id,
  cba_name || ' - ' || clause_title,
  'collective_agreement',
  clause_full_text,
  'cba',
  cba_id,
  'system'
FROM collective_agreements_clauses;
```

### Best Practices

1. **Vector Embeddings**: Regenerate embeddings when changing models
2. **Context Window**: Limit conversation history to last 10 messages
3. **Token Budgets**: Set `maxTokens` to prevent cost overruns
4. **Safety Filters**: Always run input/output through moderation
5. **Citation Accuracy**: Verify RAG retrieval relevance scores
6. **Feedback Loop**: Use thumbs up/down to retrain knowledge base

---

## 2. Accessibility Audit (WCAG 2.2 AA)

### Features

- **Automated Testing**: Integration with axe-core, Pa11y, Lighthouse
- **Manual Testing**: User testing session tracking
- **WCAG 2.2 Coverage**: All Level A and AA success criteria
- **Issue Management**: Severity classification, assignment, resolution tracking
- **Compliance Reporting**: Score calculation, trend analysis
- **Real-time Monitoring**: CI/CD integration with pre-deployment checks
- **Assistive Technology Testing**: Screen reader, keyboard navigation, color blindness simulation

### Database Schema

#### Tables
- `accessibility_audits` - Audit sessions with summary metrics
- `accessibility_issues` - Individual WCAG violations
- `wcag_success_criteria` - Reference table for WCAG 2.2 criteria
- `accessibility_test_suites` - Pre-configured test suites
- `accessibility_user_testing` - Manual testing sessions with real users

#### Enums
- `wcag_level`: A, AA, AAA
- `audit_status`: pending, in_progress, completed, failed
- `a11y_issue_severity`: critical, serious, moderate, minor
- `a11y_issue_status`: open, in_progress, resolved, wont_fix, duplicate

### Service Layer

**Location**: `lib/accessibility/accessibility-service.ts`

#### AccessibilityAuditManager
```typescript
const manager = new AccessibilityAuditManager();

// Create and run audit
const audit = await manager.createAudit({
  tenantId: "tenant_001",
  auditName: "Pre-deployment Audit",
  auditType: "automated",
  targetUrl: "https://app.unioneyes.com",
  targetEnvironment: "staging",
  conformanceLevel: "AA",
  toolsUsed: [
    { name: "axe-core", version: "4.7.0" },
    { name: "lighthouse", version: "11.0.0" }
  ],
  scheduledBy: "user_xxx",
  triggeredBy: "ci/cd",
});

await manager.runAutomatedAudit(audit.id);
```

#### WCAGChecker
```typescript
const checker = new WCAGChecker();

// Check color contrast (WCAG 1.4.3)
const contrastResult = checker.checkColorContrast(
  "#3366cc", // Foreground
  "#ffffff", // Background
  16, // Font size (px)
  false // Is bold
);

// Returns:
// {
//   passes: true,
//   ratio: 4.87,
//   requiredRatio: 4.5,
//   level: "AA"
// }

// Check keyboard accessibility (WCAG 2.1.1)
const keyboardResult = checker.checkKeyboardAccessibility({
  tagName: "div",
  tabIndex: -1,
  role: "button",
  hasOnClick: true,
});

// Check alt text (WCAG 1.1.1)
const altResult = checker.checkAltText({
  tagName: "img",
  alt: "Company logo",
});

// Check heading hierarchy (WCAG 1.3.1)
const headingResult = checker.checkHeadingHierarchy([
  { level: 1, text: "Page Title" },
  { level: 2, text: "Section 1" },
  { level: 3, text: "Subsection" },
]);
```

#### AccessibilityReportGenerator
```typescript
const generator = new AccessibilityReportGenerator();

const report = await generator.generateComplianceReport("tenant_001", {
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-02-01"),
});

// Returns:
// {
//   summary: {
//     totalIssues: 47,
//     openIssues: 12,
//     resolvedIssues: 35,
//     bySeverity: { critical: 2, serious: 5, moderate: 3, minor: 2 },
//     byWCAGCriteria: { "1.4.3": 5, "2.1.1": 3, ... }
//   },
//   complianceScore: 82,
//   criteriaCoverage: [...],
//   recommendations: [...]
// }
```

### UI Component

**Location**: `components/accessibility/accessibility-dashboard.tsx`

```tsx
import { AccessibilityDashboard } from "@/components/accessibility/accessibility-dashboard";

<AccessibilityDashboard />
```

**Features**:
- Accessibility score gauge (0-100)
- Issue breakdown by severity (critical, serious, moderate, minor)
- WCAG criteria coverage table
- Audit history with trend graphs
- Issue details with fix suggestions
- Quick actions: Run audit, resolve issue, view WCAG docs

### API Endpoints

#### POST /api/accessibility/audits
Start new audit
```json
{
  "auditName": "Weekly Audit",
  "auditType": "automated",
  "targetUrl": "https://app.unioneyes.com",
  "targetEnvironment": "production",
  "conformanceLevel": "AA"
}
```

#### GET /api/accessibility/audits/:id
Get audit results

#### GET /api/accessibility/issues
Get accessibility issues
```
?status=open&severity=critical,serious&limit=20
```

#### POST /api/accessibility/issues/:id/resolve
Mark issue as resolved
```json
{
  "resolvedBy": "user_xxx",
  "resolutionNotes": "Fixed contrast ratio to 4.8:1"
}
```

#### GET /api/accessibility/compliance-report
Get WCAG compliance report

### Configuration

**Environment Variables**:
```bash
# Axe-core Configuration
ACCESSIBILITY_AXE_ENABLED=true
ACCESSIBILITY_AXE_RULES=wcag21aa,wcag22aa,best-practice

# Lighthouse Configuration
ACCESSIBILITY_LIGHTHOUSE_ENABLED=true
LIGHTHOUSE_CHROME_PATH=/usr/bin/google-chrome

# Scheduled Audits
ACCESSIBILITY_AUDIT_SCHEDULE="0 2 * * *" # Daily at 2 AM
ACCESSIBILITY_AUDIT_ENVIRONMENTS=staging,production

# Notification Configuration
ACCESSIBILITY_NOTIFY_ON_CRITICAL=true
ACCESSIBILITY_NOTIFY_EMAILS=accessibility-team@union.org
ACCESSIBILITY_SLACK_WEBHOOK=https://hooks.slack.com/xxx

# Score Thresholds
ACCESSIBILITY_MIN_SCORE=80
ACCESSIBILITY_BLOCK_DEPLOY_ON_CRITICAL=true
```

### CI/CD Integration

**GitHub Actions**:
```yaml
# .github/workflows/accessibility.yml
name: Accessibility Audit

on:
  pull_request:
  push:
    branches: [main, staging]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Accessibility Audit
        run: |
          npm run accessibility:audit
      - name: Check Score
        run: |
          SCORE=$(cat audit-report.json | jq '.accessibilityScore')
          if [ "$SCORE" -lt 80 ]; then
            echo "Accessibility score $SCORE below threshold 80"
            exit 1
          fi
```

### WCAG 2.2 New Criteria

Union Eyes implements all new WCAG 2.2 criteria:

| Criterion | Level | Description | Status |
|-----------|-------|-------------|--------|
| 2.4.11 | AA | Focus Not Obscured (Minimum) | ✅ Implemented |
| 2.4.12 | AAA | Focus Not Obscured (Enhanced) | ✅ Implemented |
| 2.5.7 | AA | Dragging Movements | ✅ Implemented |
| 2.5.8 | AA | Target Size (Minimum) | ✅ Implemented |
| 3.2.6 | A | Consistent Help | ✅ Implemented |
| 3.3.7 | A | Redundant Entry | ✅ Implemented |
| 3.3.8 | AA | Accessible Authentication (Minimum) | ✅ Implemented |
| 3.3.9 | AAA | Accessible Authentication (Enhanced) | ✅ Implemented |

---

## 3. International Address Formats

### Features

- **Multi-Country Support**: 23+ countries with localized formats
- **Address Validation**: Google Maps, SmartyStreets, HERE integration
- **Geocoding**: Latitude/longitude resolution
- **Standardization**: Postal service formatting (USPS, Canada Post, Royal Mail)
- **Validation Caching**: 30-day cache to reduce API calls
- **Postal Code Validation**: Regex patterns for 20+ countries
- **Change History**: Audit trail for address modifications

### Database Schema

#### Tables
- `international_addresses` - Flexible address records
- `country_address_formats` - Country-specific configuration
- `address_validation_cache` - Cached validation results
- `address_change_history` - Address modification audit log

#### Enums
- `address_type`: mailing, residential, business, billing, shipping, temporary
- `address_status`: active, inactive, unverified, invalid

### Service Layer

**Location**: `lib/address/address-service.ts`

#### AddressService
```typescript
const addressService = new AddressService();

// Save and validate address
const address = await addressService.saveAddress({
  tenantId: "tenant_001",
  userId: "user_xxx",
  addressType: "mailing",
  countryCode: "US",
  addressLine1: "1600 Pennsylvania Avenue NW",
  locality: "Washington",
  administrativeArea: "DC",
  postalCode: "20500",
  validate: true, // Auto-validate
  geocode: true, // Get lat/lng
  isPrimary: true,
});

// Manual validation
const validation = await addressService.validateAddress({
  addressLine1: "10 Downing Street",
  locality: "London",
  postalCode: "SW1A 2AA",
  countryCode: "GB",
});

// Returns:
// {
//   isValid: true,
//   confidence: "high",
//   deliverability: "deliverable",
//   corrections: { ... },
//   metadata: { placeId: "...", plusCode: "..." }
// }

// Geocode address
const geocode = await addressService.geocodeAddress({
  addressLine1: "1600 Amphitheatre Parkway",
  locality: "Mountain View",
  administrativeArea: "CA",
  postalCode: "94043",
  countryCode: "US",
});

// Returns:
// {
//   latitude: "37.422408",
//   longitude: "-122.084068",
//   accuracy: "rooftop",
//   placeId: "ChIJ...",
//   plusCode: "849VCWC7+R6"
// }
```

#### PostalCodeValidator
```typescript
const validator = new PostalCodeValidator();

// US ZIP code
const usResult = validator.validate("94043", "US");
// { isValid: true, formatted: "94043" }

// Canada postal code
const caResult = validator.validate("K1A0B1", "CA");
// { isValid: true, formatted: "K1A 0B1" }

// UK postcode
const gbResult = validator.validate("SW1A2AA", "GB");
// { isValid: true, formatted: "SW1A 2AA" }
```

### UI Component

**Location**: `components/address/international-address-input.tsx`

```tsx
import { InternationalAddressInput } from "@/components/address/international-address-input";

<InternationalAddressInput
  value={address}
  onChange={setAddress}
  onValidate={setIsValid}
  autoValidate
  showMap
/>
```

**Features**:
- Country-aware field labels (City vs Locality, State vs Province)
- Dynamic required fields based on country
- Postal code pattern validation
- Real-time validation with correction suggestions
- Geocoded map preview
- State/province dropdowns for supported countries

### API Endpoints

#### GET /api/address/country-format
Get address format for country
```
?countryCode=US
```

#### POST /api/address/validate
Validate address
```json
{
  "countryCode": "US",
  "addressLine1": "1600 Pennsylvania Ave NW",
  "locality": "Washington",
  "administrativeArea": "DC",
  "postalCode": "20500"
}
```

#### POST /api/address/geocode
Geocode address

#### POST /api/address
Save address

#### GET /api/address/:id
Get address by ID

### Configuration

**Environment Variables**:
```bash
# Google Maps API
GOOGLE_MAPS_API_KEY=AIzaSyXXX
GOOGLE_MAPS_ENABLE_VALIDATION=true
GOOGLE_MAPS_ENABLE_GEOCODING=true

# SmartyStreets (US addresses)
SMARTYSTREETS_AUTH_ID=xxx
SMARTYSTREETS_AUTH_TOKEN=xxx
SMARTYSTREETS_ENABLE_USPS=true

# HERE Technologies
HERE_API_KEY=xxx
HERE_ENABLE_VALIDATION=true

# Loqate (formerly PCA Predict)
LOQATE_API_KEY=xxx

# Validation Configuration
ADDRESS_VALIDATION_ENABLED=true
ADDRESS_VALIDATION_CACHE_TTL=2592000 # 30 days
ADDRESS_VALIDATION_AUTO=true
ADDRESS_GEOCODING_ENABLED=true

# Storage
ADDRESS_CHANGE_HISTORY_RETENTION=2555 # 7 years (compliance)
```

### Supported Countries

| Country | Code | Postal Code Pattern | Validation Provider | Standardization |
|---------|------|---------------------|---------------------|-----------------|
| United States | US | `\d{5}(-\d{4})?` | SmartyStreets, Google | USPS |
| Canada | CA | `[A-Z]\d[A-Z] \d[A-Z]\d` | Canada Post, Google | Canada Post |
| United Kingdom | GB | `[A-Z]{1,2}\d{1,2} \d[A-Z]{2}` | Royal Mail, Google | Royal Mail |
| Australia | AU | `\d{4}` | Australia Post, Google | Australia Post |
| Germany | DE | `\d{5}` | Google, HERE | Deutsche Post |
| France | FR | `\d{5}` | Google, HERE | La Poste |
| Italy | IT | `\d{5}` | Google | Poste Italiane |
| Spain | ES | `\d{5}` | Google | Correos |
| Netherlands | NL | `\d{4} [A-Z]{2}` | PostNL, Google | PostNL |
| Belgium | BE | `\d{4}` | bpost, Google | bpost |
| Switzerland | CH | `\d{4}` | Google | Swiss Post |
| Austria | AT | `\d{4}` | Google | Austrian Post |
| Sweden | SE | `\d{3} \d{2}` | Google | PostNord |
| Norway | NO | `\d{4}` | Google | Posten Norge |
| Denmark | DK | `\d{4}` | Google | PostNord |
| Finland | FI | `\d{5}` | Google | Posti |
| Ireland | IE | `[A-Z]\d{2} [A-Z0-9]{4}` | Google | An Post |
| New Zealand | NZ | `\d{4}` | Google | NZ Post |
| Japan | JP | `\d{3}-\d{4}` | Google | Japan Post |
| South Korea | KR | `\d{5}` | Google | Korea Post |
| India | IN | `\d{6}` | Google | India Post |
| Brazil | BR | `\d{5}-\d{3}` | Google | Correios |
| Mexico | MX | `\d{5}` | Google | Correos de México |

### Best Practices

1. **Always Validate**: Run validation before saving addresses
2. **Cache Results**: Use validation cache to reduce API costs
3. **Standardize**: Apply postal service formatting
4. **Geocode Important**: Geocode shipping/delivery addresses for route optimization
5. **History Tracking**: Maintain change history for audit compliance
6. **Privacy**: Mask full addresses in logs (show only locality + postal code)
7. **Fallback**: Have manual override for validation failures

---

## Testing

### AI Chatbot Tests
```bash
# Unit tests
pnpm test lib/ai/chatbot-service.test.ts

# Integration tests
pnpm test:integration tests/integration/chatbot.test.ts

# Load test (concurrent users)
pnpm test:load tests/load/chatbot.test.ts
```

### Accessibility Tests
```bash
# Automated audit
pnpm accessibility:audit

# Specific page
pnpm accessibility:audit --url=/dashboard

# Manual test checklist
pnpm accessibility:checklist

# Generate compliance report
pnpm accessibility:report
```

### Address Validation Tests
```bash
# Unit tests
pnpm test lib/address/address-service.test.ts

# Test postal code patterns
pnpm test:postal-codes

# Integration tests (requires API keys)
pnpm test:integration tests/integration/address-validation.test.ts
```

---

## Deployment

### Database Migration
```bash
# Generate migration
pnpm drizzle-kit generate

# Apply migration
pnpm drizzle-kit push

# Verify tables
psql -d union_eyes -c "\d+ chat_sessions"
psql -d union_eyes -c "\d+ accessibility_audits"
psql -d union_eyes -c "\d+ international_addresses"
```

### Seed Data
```bash
# Seed WCAG criteria reference table
pnpm seed:wcag-criteria

# Seed country address formats
pnpm seed:country-formats

# Seed knowledge base (sample union docs)
pnpm seed:knowledge-base
```

### Environment Setup
```bash
# Copy example
cp .env.example .env

# Configure AI providers (at least one required)
# OpenAI, Anthropic, or Google AI

# Configure address validation (choose one or more)
# Google Maps (recommended), SmartyStreets, HERE, Loqate

# Enable accessibility testing
# Install axe-core, Lighthouse, Pa11y
```

---

## Monitoring

### AI Chatbot Metrics
- **Token usage** by provider, model, time period
- **Response times** (p50, p95, p99)
- **Satisfaction rate** (helpful vs unhelpful)
- **RAG retrieval accuracy** (citation clicks)
- **Cost tracking** (OpenAI/Anthropic/Google billing)

### Accessibility Metrics
- **Accessibility score** trend over time
- **Open issues** by severity
- **Mean time to resolution** (MTTR)
- **WCAG criteria coverage** percentage
- **Audit frequency** and pass rate

### Address Validation Metrics
- **Validation success rate** by country
- **Geocoding accuracy** by provider
- **API call costs** by provider
- **Cache hit rate** (should be >80%)
- **Validation corrections** frequency

---

## Costs

### AI Chatbot (Monthly Estimates)

| Provider | Model | Input (1M tokens) | Output (1M tokens) | Avg. Conversation Cost |
|----------|-------|-------------------|---------------------|------------------------|
| OpenAI | GPT-4 | $10 | $30 | $0.08-0.15 |
| OpenAI | GPT-3.5 Turbo | $1 | $2 | $0.01-0.03 |
| Anthropic | Claude Opus | $15 | $75 | $0.12-0.25 |
| Anthropic | Claude Sonnet | $3 | $15 | $0.03-0.08 |
| Google | Gemini Pro | $0.50 | $1.50 | $0.005-0.02 |

**Embeddings** (OpenAI ada-002): $0.10 per 1M tokens

**Example**: 1,000 users, 5 conversations/month, 10 messages each = 50,000 conversations
- GPT-4: ~$4,000-7,500/month
- GPT-3.5: ~$500-1,500/month
- Gemini Pro: ~$250-1,000/month

### Address Validation

| Provider | Pricing | Notes |
|----------|---------|-------|
| Google Maps | $5/1000 requests | Address Validation API |
| Google Maps | $5/1000 requests | Geocoding API |
| SmartyStreets | $0.50-2.00/1000 | US addresses only, volume pricing |
| HERE Technologies | $1-3/1000 | Global coverage |
| Loqate | $0.10-0.50/lookup | UK/Ireland specialist |

**Example**: 10,000 new addresses/month with validation + geocoding
- Google: ~$100/month (with 30-day cache: ~$30/month)
- SmartyStreets (US): ~$50/month

### Accessibility Testing

| Tool | Cost | Notes |
|------|------|-------|
| axe-core | Free | Open source |
| Lighthouse | Free | Open source (Google) |
| Pa11y | Free | Open source |
| WAVE | Free/Paid | Free for manual, paid API ($500-2000/year) |
| Deque Enterprise | $10k-50k/year | Enterprise accessibility platform |

**Recommended**: Use free open-source tools (axe-core + Lighthouse) for CI/CD

---

## Support

### AI Chatbot Troubleshooting

**Issue**: "AI responses are slow (>10s)"
- **Solution**: Switch to faster model (GPT-3.5 or Gemini Pro), reduce RAG document count, increase temperature for faster sampling

**Issue**: "RAG retrieval returns irrelevant documents"
- **Solution**: Increase similarity threshold (0.7 → 0.8), regenerate embeddings, improve document chunking (smaller sections)

**Issue**: "Content safety filter blocking legitimate content"
- **Solution**: Adjust moderation thresholds, review false positives log, add exception handling

### Accessibility Troubleshooting

**Issue**: "Audit takes too long (>5 minutes)"
- **Solution**: Limit pages scanned, increase timeout, run audits in background queue

**Issue**: "False positive accessibility issues"
- **Solution**: Whitelist elements with `aria-hidden="true"`, improve selectors, mark as duplicate/won't fix

**Issue**: "Score doesn't match manual testing"
- **Solution**: Automated tools catch ~40% of issues, supplement with manual testing and user feedback

### Address Validation Troubleshooting

**Issue**: "Validation failing for valid addresses"
- **Solution**: Check API key/quota, enable fallback providers, allow manual override

**Issue**: "Geocoding returns wrong coordinates"
- **Solution**: Increase address specificity (add building number), verify postal code, use placeId instead of text search

**Issue**: "High API costs"
- **Solution**: Enable validation cache (30 days), batch geocoding requests, validate only on submit (not on every keystroke)

---

## Roadmap

### Phase 1 (Complete) ✅
- AI chatbot with RAG
- Accessibility audit automation
- International address formats

### Phase 2 (Q2 2026)
- **AI Features**:
  - Voice input/output (speech-to-text, text-to-speech)
  - Multi-language support (French, Spanish)
  - Function calling (create claim, file grievance from chat)
  - Fine-tuning on union-specific data
  
- **Accessibility**:
  - Automated remediation suggestions (code fixes)
  - Screen reader simulation
  - WCAG 2.2 AAA compliance
  - Accessibility statement generator
  
- **Address**:
  - Address autocomplete with Google Places
  - Bulk address validation (CSV import)
  - Address book management
  - Shipping rate calculation integration

### Phase 3 (Q3 2026)
- AI-powered document analysis (CBA clause extraction)
- Predictive accessibility issues (ML model)
- Address verification via SMS/email confirmation
