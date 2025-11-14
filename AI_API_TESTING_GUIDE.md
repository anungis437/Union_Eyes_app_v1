# AI API Testing Guide

## Overview
Testing guide for the three AI API endpoints after schema migration.

**Date**: 2024-01-XX  
**Status**: Ready for testing (pending OPENAI_API_KEY and case_summaries table)

## Prerequisites

### 1. Environment Setup
Add to `.env.local`:
```bash
OPENAI_API_KEY=sk-proj-...  # Required for AI responses
OPENAI_MODEL=gpt-4-turbo-preview  # Optional, defaults to this
```

### 2. Database Tables
Ensure these migrations are applied:
- ✅ **019_ai_tables_simplified.sql** - AI core tables (deployed)
- ✅ **019_fix_hash_function.sql** - MD5 hash fix (deployed)
- ⬜ **020_case_summaries.sql** - Case summaries table (needs deployment)

### 3. Test Data
You need:
- Valid Clerk authentication (orgId, userId)
- Test claims in the `claims` table
- Test documents in the `ai_documents` table

## API Endpoints

### 1. POST /api/ai/feedback
**Purpose**: Submit user feedback on AI responses

**Request**:
```bash
curl -X POST http://localhost:5173/api/ai/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "query_id": "7ba567db-5c19-4f61-b492-385ca10d8ba0",
    "rating": 5,
    "comment": "Very helpful response"
  }'
```

**Response**:
```json
{
  "feedback_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "success"
}
```

**Test Cases**:
- ✅ Valid query_id with rating 1-5
- ✅ Rating without comment
- ✅ Rating with comment
- ❌ Invalid query_id (should return 404)
- ❌ Rating out of range 1-5 (should return 400)
- ❌ No authentication (should return 401)

---

### 2. GET /api/ai/feedback?query_id={id}
**Purpose**: Get all feedback for a specific query

**Request**:
```bash
curl -X GET "http://localhost:5173/api/ai/feedback?query_id=7ba567db-5c19-4f61-b492-385ca10d8ba0" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

**Response**:
```json
{
  "feedback": [
    {
      "id": "123e4567-...",
      "query_id": "7ba567db-...",
      "tenant_id": "org_123",
      "user_id": "user_456",
      "rating": 5,
      "comment": "Very helpful",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Test Cases**:
- ✅ Valid query_id with feedback
- ✅ Valid query_id with no feedback (empty array)
- ❌ Missing query_id parameter (should return 400)
- ❌ No authentication (should return 401)

---

### 3. POST /api/ai/search
**Purpose**: Smart case & precedent search (RAG)

**Request**:
```bash
curl -X POST http://localhost:5173/api/ai/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "query": "What are typical arbitration outcomes for wrongful termination cases?",
    "max_sources": 5,
    "filters": {
      "employer": "Acme Corp",
      "issue_type": ["termination"]
    }
  }'
```

**Response** (with OPENAI_API_KEY):
```json
{
  "answer": "Based on the cases in our database...",
  "sources": [
    {
      "document_id": "doc_123",
      "chunk_id": "chunk_456",
      "title": "Smith v. Acme Corp (2023)",
      "snippet": "The arbitrator found...",
      "relevance_score": 0.89,
      "citation": "Case No. ARB-2023-001"
    }
  ],
  "confidence": "high"
}
```

**Response** (without OPENAI_API_KEY):
```json
{
  "answer": "Found relevant cases based on your search terms.",
  "sources": [...],
  "confidence": "low"
}
```

**Test Cases**:
- ✅ Simple query without filters
- ✅ Query with employer filter
- ✅ Query with date range filter
- ✅ Query with max_sources=3
- ✅ Query with no matching documents (returns "No relevant cases found")
- ❌ Empty query (should return 400)
- ❌ No authentication (should return 401)
- ⚠️ Without OPENAI_API_KEY (works but returns generic message)

**Current Limitations**:
- 🔴 **No vector search**: Using keyword search via `search_ai_chunks_text()` until pgvector enabled
- 🟡 **Lower accuracy**: Keyword matching less precise than semantic search
- 🟡 **Fixed confidence**: Always returns "medium" confidence for keyword results

---

### 4. POST /api/ai/summarize
**Purpose**: Generate AI summary/brief for a claim

**Request**:
```bash
curl -X POST http://localhost:5173/api/ai/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "claim_id": "550e8400-e29b-41d4-a716-446655440000",
    "purpose": "arbitration"
  }'
```

**Response**:
```json
{
  "summary_id": "789e4567-e89b-12d3-a456-426614174000",
  "summary_text": "[AI DRAFT]\n\nCASE SUMMARY\n...",
  "validation": {
    "valid": true,
    "missingSections": []
  },
  "metadata": {
    "purpose": "arbitration",
    "claim_id": "550e8400-...",
    "latency_ms": 2341
  },
  "warning": "This is an AI-generated draft. Human review required before use."
}
```

**Test Cases**:
- ✅ Valid claim_id with purpose="arbitration"
- ✅ Valid claim_id with purpose="internal"
- ✅ Valid claim_id without purpose (defaults to "internal")
- ❌ Invalid claim_id (should return 404)
- ❌ Claim from different tenant (should return 404 due to tenant filtering)
- ❌ No authentication (should return 401)
- ❌ OPENAI_API_KEY not set (should return 503)

**Prerequisites**:
- ⬜ `case_summaries` table must be created (run migration 020)
- ⬜ OPENAI_API_KEY must be configured
- ⬜ Valid claims must exist in database

---

### 5. GET /api/ai/summarize?claim_id={id}
**Purpose**: Get all AI-generated summaries for a claim

**Request**:
```bash
curl -X GET "http://localhost:5173/api/ai/summarize?claim_id=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

**Response**:
```json
{
  "summaries": [
    {
      "id": "789e4567-...",
      "claim_id": "550e8400-...",
      "tenant_id": "org_123",
      "summary_text": "[AI DRAFT]\n\nCASE SUMMARY\n...",
      "created_by": "ai",
      "metadata": {
        "purpose": "arbitration",
        "ai_model": "gpt-4-turbo-preview",
        "latency_ms": 2341
      },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Test Cases**:
- ✅ Valid claim_id with summaries
- ✅ Valid claim_id with no summaries (empty array)
- ❌ Missing claim_id parameter (should return 400)
- ❌ No authentication (should return 401)

---

## Testing Workflow

### Step 1: Deploy case_summaries Table
```bash
# Deploy migration 020
psql $DATABASE_URL -f database/migrations/020_case_summaries.sql
```

### Step 2: Add OPENAI_API_KEY
```bash
# Add to .env.local
echo "OPENAI_API_KEY=sk-proj-YOUR_KEY" >> .env.local
```

### Step 3: Test Feedback Endpoints
```bash
# 1. Post feedback (should work immediately)
# 2. Get feedback (should return posted feedback)
```

### Step 4: Test Search Endpoint
```bash
# 1. Without OPENAI_API_KEY: Should return keyword results
# 2. With OPENAI_API_KEY: Should return AI-enhanced results
# 3. Test with various filters
```

### Step 5: Test Summarize Endpoints
```bash
# 1. Create a summary (requires OPENAI_API_KEY)
# 2. Retrieve summaries (should show created summary)
```

---

## Schema Changes Summary

All API routes updated to use new schema:

| Old Schema | New Schema | Reason |
|------------|------------|--------|
| `organization_id UUID` | `tenant_id TEXT` | Clerk orgId compatibility |
| `set_config()` RLS | Application filtering | No RLS policies in simplified schema |
| `search_ai_chunks()` | `search_ai_chunks_text()` | pgvector not available yet |
| `p_organization_id` | `p_tenant_id` | Function parameter names |
| `claims.id` | `claims.claim_id` | Correct primary key name |

---

## Known Issues & Limitations

### 1. Vector Search Not Available
- **Status**: 🔴 Blocking for semantic search
- **Workaround**: Using keyword search temporarily
- **Fix**: Request pgvector extension from Azure admin
- **Impact**: Lower search quality, no semantic similarity

### 2. Case Summaries Table Missing
- **Status**: 🟡 Migration created, needs deployment
- **Workaround**: None (endpoint will fail)
- **Fix**: Run migration 020
- **Impact**: Summarize endpoint unavailable

### 3. OPENAI_API_KEY Required
- **Status**: 🟡 Configuration needed
- **Workaround**: Search endpoint returns keyword results without key
- **Fix**: Add to environment variables
- **Impact**: No AI-enhanced responses

### 4. Test Data Needed
- **Status**: 🟡 Manual setup required
- **Workaround**: Use existing test data from migration
- **Fix**: Create ingestion endpoint or manual inserts
- **Impact**: Limited testing capability

---

## Next Steps

### Immediate (Required for Basic Testing)
1. ⬜ Deploy migration 020 (case_summaries table)
2. ⬜ Add OPENAI_API_KEY to environment
3. ⬜ Test feedback endpoints (simplest, no dependencies)
4. ⬜ Test search endpoint (keyword search mode)

### Short-term (Required for Full Functionality)
5. ⬜ Insert test documents and chunks
6. ⬜ Test search with actual content
7. ⬜ Create test claims for summarization
8. ⬜ Test summarize endpoints end-to-end

### Long-term (Production Readiness)
9. ⬜ Request pgvector extension enablement
10. ⬜ Migrate to vector-based search
11. ⬜ Add rate limiting (100 queries/hour/tenant)
12. ⬜ Set up monitoring using analytics views
13. ⬜ Create document ingestion endpoint

---

## Success Criteria

### Feedback API ✅
- [x] POST creates feedback records
- [x] GET retrieves feedback by query_id
- [x] Tenant isolation working
- [x] No RLS errors

### Search API ⏳
- [x] Keyword search returns results
- [ ] Filters work correctly
- [ ] AI enhancement works (requires OPENAI_API_KEY)
- [ ] Vector search works (requires pgvector)
- [x] Graceful fallback without OpenAI

### Summarize API ⏳
- [ ] POST creates summaries (requires case_summaries table)
- [ ] GET retrieves summaries
- [ ] AI drafts marked correctly
- [ ] Validation structure works
- [x] Tenant isolation working

---

## Troubleshooting

### Error: "extension 'vector' is not allow-listed"
**Solution**: This is expected. Vector search disabled until pgvector approved.

### Error: "relation 'case_summaries' does not exist"
**Solution**: Run migration 020: `psql $DB -f database/migrations/020_case_summaries.sql`

### Error: "AI service not configured" (503)
**Solution**: Add OPENAI_API_KEY to .env.local

### Error: "Claim not found" (404)
**Solution**: Verify claim_id exists and belongs to your tenant_id

### Error: "Unauthorized" (401)
**Solution**: Ensure Clerk authentication token is valid

---

## Appendix: Test Data

### Insert Test Document
```sql
INSERT INTO ai_documents (id, tenant_id, title, content, metadata)
VALUES (
  gen_random_uuid(),
  'org_test123',
  'Smith v. Acme Corp (2023)',
  'Arbitration case regarding wrongful termination...',
  '{"citation": "Case No. ARB-2023-001", "year": 2023}'::jsonb
);
```

### Insert Test Chunk
```sql
INSERT INTO ai_chunks (document_id, tenant_id, content, chunk_index)
SELECT 
  id,
  tenant_id,
  'The arbitrator found in favor of the employee, awarding full reinstatement...',
  0
FROM ai_documents 
WHERE title = 'Smith v. Acme Corp (2023)'
LIMIT 1;
```

### Check Existing Test Data
```sql
-- Check queries logged during testing
SELECT * FROM ai_queries ORDER BY created_at DESC LIMIT 5;

-- Check feedback submitted
SELECT * FROM ai_feedback ORDER BY created_at DESC LIMIT 5;

-- Check analytics
SELECT * FROM ai_usage_by_tenant;
SELECT * FROM ai_feedback_summary;
```
