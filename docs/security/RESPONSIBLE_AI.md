# Responsible AI Framework for Union Eyes

**Last Updated:** November 13, 2025  
**Status:** Phase 1 Planning  
**Owner:** Union Eyes Development Team

## Executive Summary

Union Eyes uses AI to **accelerate case research, improve consistency, and surface insights** while protecting member privacy and maintaining human accountability. This document defines our AI mission, use cases, risk controls, and development principles.

---

## 1. Core AI Mission

**Reduce time to analyze and triage grievances/claims** – Help union staff quickly find relevant precedents and understand case context.

**Improve consistency and quality of case prep** – Generate structured summaries and draft talking points that staff can review and approve.

**Surface patterns across thousands of cases** – Identify trends in employers, arbitrators, issues, and outcomes to inform strategy.

**Protect members' rights and privacy** – All AI features must respect PIPEDA, Law 25, and union confidentiality standards.

---

## 2. Priority AI Use Cases (Phase 1–2)

### U1. Smart Case & Precedent Search (RAG)

**Goal:** Let users ask natural language questions like "Show me past cases about overtime for part-time workers against Employer X in Ontario."

**Implementation:**

- `ai_documents` + `ai_chunks` tables in Supabase with embeddings
- `/api/ai/search` endpoint with retrieval + LLM summarization
- Returns: Ranked cases + snippets + filters (employer, arbitrator, issue, outcome)
- **Always shows sources with citations and confidence scores**

**Risk Controls:**

- RAG only over curated corpus (uploaded awards, licensed databases)
- Never invent cases – prompt rule: "Only reference documents explicitly provided"
- Template response for weak matches: "No high-confidence matches found"

### U2. Case Summaries & Brief Drafts (Human-in-the-loop)

**Goal:** One-click summary of grievance file: "Facts / Issues / Arguments / Outcome"

**Implementation:**

- Background job triggered on case upload
- Output stored in `case_summaries` table with `created_by = 'ai'`, `approved_by` for human sign-off
- Draft first-pass briefs that lawyers/staff edit before finalizing

**Risk Controls:**

- All outputs labeled "AI Assistant Suggestion" – never "approved" automatically
- Require explicit human review and edit before any summary becomes official
- Log all generation requests in `ai_query_logs`

### U3. Similar-Case Recommender

**Goal:** Surface "You may also want to review…" when viewing a case

**Implementation:**

- Re-use embeddings from U1 to compute nearest neighbours
- UI component inside case detail page
- No new LLM calls – deterministic similarity search

**Risk Controls:**

- Transparent explanation: "Similar based on issue tags, employer, arbitrator"
- User can dismiss or provide feedback on recommendations

### U4. Pattern Detection & Dashboards

**Goal:** Show trends – spike in discipline cases, repeat violators, arbitrator leanings

**Implementation:**

- Use existing Supabase schema + BI layer (Power BI / custom dashboards)
- AI assists in tagging cases (issue type, violation type, stage)
- Dashboards are deterministic SQL queries

**Risk Controls:**

- Quarterly bias audit: check if certain employers/regions are under-represented
- Human approves AI-suggested tags before they become training data

---

## 3. AI Risk Areas & Controls

### 3.1 Hallucinations

**Risk:** Model invents case law that doesn't exist or misstates outcomes.

**Controls:**

- ✅ RAG only over curated corpus (uploaded awards, licensed databases)
- ✅ Always show source list (case ID, citation, link to PDF)
- ✅ Confidence indicator / retrieval score
- ✅ Template response if evidence is weak
- ✅ Prompt rule: `"Never invent a case. Only reference documents explicitly provided in the context. If unsure, say you don't know."`

### 3.2 Copyright / Intellectual Property

**Risk:** Using non-licensed decisions or third-party content in training/responses.

**Controls:**

- ✅ Restrict ingestion to:
  - Union's own case files
  - Licensed databases or public domain sources
- ✅ Metadata fields in `ai_documents`:
  - `source_type` ('internal' | 'licensed' | 'public')
  - `license_notes`
- ✅ Policy: "No scraping of paid services or members-only portals without explicit agreements"

### 3.3 Ethical Use / Bias

**Risk:** AI suggestions systematically favour one side or under-surface certain case types.

**Controls:**

- ✅ Define allowed AI decisions:
  - AI may: summarize, organize, suggest precedents
  - AI may not: decide whether to file, settle, or drop a case
- ✅ Regular bias audit:
  - Export AI usage logs by issue, employer, arbitrator
  - Check if categories are under-represented in recommendations
- ✅ Prompting: `"Remain neutral. Present arguments and precedents from both union and employer perspectives where relevant."`

### 3.4 Cybersecurity

**Risk:** New attack surface via AI endpoints & data ingestion.

**Controls:**

- ✅ Only expose AI routes server-side in Next.js (`/app/api/ai/*/route.ts`)
- ✅ Clerk auth → union staff only
- ✅ Org-level RLS in Supabase (`organization_id`)
- ✅ Store API keys only in Azure app settings / Key Vault
- ✅ No keys in frontend or public config
- ✅ Add `ai_query_log` table with:
  - `user_id`, `organization_id`, `input_hash`, `timestamp`, `latency_ms`, `status`
- ✅ Rate limiting middleware on AI endpoints

### 3.5 Privacy

**Risk:** Member names, health details, discipline info leaking in prompts, logs, or training data.

**Controls:**

- ✅ Pre-processing pipeline for documents:
  - Detect & mask personal identifiers (name, SIN, address, health info) before sending to external LLMs
- ✅ Clear per-tenant data boundaries with Supabase RLS:
  - Every AI table includes `organization_id` + `claim_id` and inherits RLS policies
- ✅ Turn OFF vendor data-retention / training flags (e.g., "do not train on this data" for OpenAI / Azure OpenAI)
- ✅ Add "Privacy Mode" toggle in UI for exported answers (remove names by default)

### 3.6 Lack of Transparency

**Risk:** Staff don't know where answers come from or how to challenge them.

**Controls:**

- ✅ UI patterns:
  - Always show "Sources (N)" with clickable list
  - Show compact explanation: "Why you're seeing this" (filters, issue tags, date range)
- ✅ Explainability docs:
  - "How Union Eyes AI Works" page inside the app
- ✅ Feedback loop:
  - `ai_feedback` table with `rating` (good/bad), `comment`, `user_id`, `query_id`

---

## 4. Foundational AI Principles (Microsoft Framework Mapping)

### Validity & Reliability

- ✅ Only deploy AI features after test suite passes
- ✅ Golden-set of manually evaluated queries + expected sources
- ✅ Monitor precision/recall of search results over time

### Accountability

- ✅ All final legal/strategic decisions belong to human reps/lawyers
- ✅ AI outputs labeled as "assistant suggestions," not "approved positions"

### Fairness & Bias Detection

- ✅ Quarterly audit of:
  - Which employers, demographics, regions are most represented
  - Whether certain groups are systematically under-served in recommendations

### Safety & Security

- ✅ Follow Azure + Supabase security baseline
- ✅ No direct external calls from browser to LLMs
- ✅ Every AI request goes through authenticated server route

### Data Privacy

- ✅ PIPEDA / Law 25 oriented:
  - Data minimization in prompts
  - Right to deletion respected at record level (also remove from embeddings)

### Explainability & Transparency

- ✅ Provide "View Answer Detail" drawer:
  - Prompt template (sanitized)
  - Top retrieved documents + similarity scores

---

## 5. AI Maturity & Roadmap

### Phase 0 – Non-AI Foundation (✅ Complete)

- Claims intake, orgs & users, basic workflows
- Deterministic analytics (SQL-based dashboards)
- Logging, RBAC, RLS

### Phase 1 – Safe RAG Pilot (Internal Only) [Current Phase]

**Goal:** Get one high-value, low-risk AI feature into production

**Tasks:**

1. Create `ai_documents`, `ai_chunks`, `ai_queries`, `ai_query_logs` tables in Supabase
2. Ingest small, clean corpus (200 redacted decisions + internal memos)
3. Build `/api/ai/search` endpoint:
   - Accept: query string, filters (employer, arbitrator, date range, issue)
   - Do: retrieve chunks → call LLM → build answer + citations → log query
4. Frontend: "AI Search (Beta)" panel in research area
5. Governance: Add "Responsible AI" page with principles & disclaimers
6. **Pilot users: Internal union staff only**

### Phase 2 – Summaries, Brief Drafts & Similar Cases

1. Add background jobs using workflow package:
   - Trigger: `case_created` or `document_uploaded`
   - Action: generate structured summary, store in `case_summaries`
2. Add "Generate draft notes" button on case view
3. Implement similar-case panel using existing embeddings

### Phase 3 – Pattern Analysis & Maturity

1. Enhance tagging with AI:
   - AI suggests issue type, stage, outcome category
   - Human approves → becomes training data for future models
2. Power BI / internal dashboard:
   - Case load by issue/employer/arbitrator
   - Win/loss or settlement patterns
   - Time-to-resolution trends

### Phase 4 – Conversational Assistant & Externalization

1. Build chat-style "Research Copilot" for expert staff
2. Limited version for smaller locals or regional offices (if validated)

---

## 6. Technical Architecture

### Database Schema

```sql
-- Documents ingested for AI search
CREATE TABLE ai_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  claim_id UUID REFERENCES claims(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('internal', 'licensed', 'public')),
  license_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chunked text with embeddings for retrieval
CREATE TABLE ai_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI ada-002 or equivalent
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User queries and responses
CREATE TABLE ai_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL,
  query_text TEXT NOT NULL,
  query_hash TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  answer TEXT,
  sources JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('pending', 'success', 'error')),
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query logs for monitoring
CREATE TABLE ai_query_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID REFERENCES ai_queries(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  latency_ms INTEGER,
  status TEXT CHECK (status IN ('success', 'error'))
);

-- User feedback on AI responses
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID NOT NULL REFERENCES ai_queries(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL,
  rating TEXT CHECK (rating IN ('good', 'bad')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies (enable for all tables)
ALTER TABLE ai_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Example RLS policy
CREATE POLICY "Users can only access their org's AI data"
  ON ai_documents
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::UUID);
```

### API Routes

```typescript
// /app/api/ai/search/route.ts
// Authenticated via Clerk, org-scoped via RLS
// Never exposes API keys client-side

// /app/api/ai/feedback/route.ts
// Log user feedback on AI responses

// /app/api/ai/summarize/route.ts
// Background job endpoint for case summaries
```

### Package Structure

```
packages/ai/
├── src/
│   ├── client/
│   │   ├── openai.ts         # LLM client wrapper
│   │   └── embeddings.ts     # Embedding generation
│   ├── prompts/
│   │   ├── search.ts         # Search prompt templates
│   │   ├── summarize.ts      # Summary prompt templates
│   │   └── constraints.ts    # Shared AI constraints
│   ├── types/
│   │   ├── query.ts          # AiQuery, AiAnswer types
│   │   └── document.ts       # AiDocument, AiChunk types
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

## 7. Development Constraints for AI-Assisted Coding

**When using AI coding assistants (GitHub Copilot, Cursor, etc.) to build Union Eyes AI features:**

### System Prompt for AI-Assisted Development

```
You are working in the Union Eyes app (Next.js + Supabase + Clerk, multi-tenant).

All AI features must follow these constraints:

1. **Never expose LLM API keys client-side.**
   - All keys in Azure app settings / Key Vault
   - Server-side API routes only

2. **All AI routes are server-side and authenticated via Clerk.**
   - Use `auth()` from `@clerk/nextjs`
   - Org-scoped RLS in Supabase

3. **Use retrieval-augmented generation over our own documents.**
   - Never fabricate sources
   - Only reference documents in ai_documents/ai_chunks

4. **Every AI answer must include citations and log an entry.**
   - Return sources array with case IDs and confidence scores
   - Log to ai_query_logs with user_id, org_id, timestamp

5. **Treat outputs as assistive, not authoritative.**
   - Do not automate final legal decisions
   - Label all outputs as "AI Assistant Suggestion"

6. **Respect privacy.**
   - Minimize personal data in prompts
   - Never log raw sensitive text where not needed
   - Mask PII before sending to external LLMs

When writing code, explain how your changes satisfy these constraints.
```

---

## 8. Monitoring & Audit Requirements

### Weekly Monitoring

- [ ] Review `ai_query_logs` for error rates and latency spikes
- [ ] Check `ai_feedback` for patterns in negative ratings
- [ ] Monitor token usage and costs

### Monthly Audit

- [ ] Review top 20 queries for hallucinations or inappropriate responses
- [ ] Verify RLS policies are working correctly (spot-check cross-org leaks)
- [ ] Update golden-set test cases based on new queries

### Quarterly Audit

- [ ] Bias analysis:
  - Export queries by employer, region, issue type
  - Check if certain categories are under-served
- [ ] Security review:
  - Verify API keys not exposed in logs
  - Review rate limiting effectiveness
- [ ] Privacy compliance:
  - Confirm data minimization practices
  - Verify deletion requests are reflected in embeddings

---

## 9. Compliance & Legal

### PIPEDA & Law 25 Requirements

- ✅ Data minimization: Only include necessary context in prompts
- ✅ Transparency: "How Union Eyes AI Works" page accessible to all users
- ✅ Right to deletion: When member data is deleted, embeddings are also removed
- ✅ No training on member data: Configure LLM providers with "do not train" flag

### Union-Specific Considerations

- ✅ Member confidentiality: No PII in logs or external API calls
- ✅ Legal privilege: AI-generated drafts do not create attorney-client privilege automatically
- ✅ Transparency with members: Explain when AI was used in case prep (if required by union policy)

---

## 10. Success Metrics

### Phase 1 KPIs

- **Adoption:** % of staff using AI search vs manual search
- **Satisfaction:** Average feedback rating on AI responses
- **Efficiency:** Time saved per query (manual research time - AI-assisted time)
- **Accuracy:** % of AI responses with correct citations (manual validation of 50 queries/month)

### Phase 2+ KPIs

- **Case prep time:** Average hours to prepare case brief (before vs after AI summaries)
- **Pattern detection value:** # of strategic insights surfaced by AI dashboards
- **Coverage:** % of case corpus successfully ingested and searchable

---

## 11. Training & Change Management

### Staff Training

- [ ] "Introduction to Union Eyes AI" webinar (1 hour)
- [ ] "How to Validate AI Responses" guide (PDF + video)
- [ ] Office hours for Q&A during pilot phase

### Communication Plan

- [ ] Email announcement to pilot users (internal staff only)
- [ ] In-app onboarding tour for AI Search panel
- [ ] Monthly newsletter highlighting new AI features and best practices

---

## 12. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-13 | Initial framework | Development Team |

---

## Appendix: Prompt Templates

### Search Prompt Template

```
You are an assistant for union representatives researching labor arbitration cases.

CONTEXT:
{retrieved_chunks}

USER QUERY:
{user_query}

CONSTRAINTS:
- Only reference documents explicitly provided in CONTEXT
- Never invent case citations or outcomes
- If unsure or no high-confidence match exists, say "I don't have enough information"
- Remain neutral – present arguments from both union and employer perspectives where relevant
- Always cite sources with case ID and chunk reference

RESPONSE FORMAT:
1. Brief answer (2-3 sentences)
2. Supporting evidence with citations
3. List of source documents (case ID, title, relevance score)

Generate your response now.
```

### Summary Prompt Template

```
You are assisting with case preparation for a union grievance.

CASE FILE:
{case_content}

TASK:
Generate a structured summary with these sections:
1. **Facts**: Key events, dates, parties involved
2. **Issues**: Legal or contractual questions at stake
3. **Arguments**: Union position and employer position
4. **Relevant Precedents**: Similar cases (if any in context)
5. **Recommended Next Steps**: Suggested actions (subject to human review)

CONSTRAINTS:
- Mask any personal identifiers (names, SIN, health details)
- Label this output as "AI-Generated Draft – Requires Human Review"
- Do not make final recommendations on filing, settling, or dropping the case

Generate the summary now.
```

---

**End of Document**
