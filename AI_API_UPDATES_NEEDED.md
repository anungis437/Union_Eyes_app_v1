# AI API Routes - Required Updates

## Summary

The AI tables were successfully deployed to the database, but the API routes need updates to match the deployed schema:

### Schema Changes:
- ✅ Database uses `tenant_id TEXT` (Clerk org ID)
- ❌ API routes expect `organization_id UUID`
- ✅ Function is `log_ai_query()` with MD5 hash
- ❌ Search function is `search_ai_chunks_text()` not `search_ai_chunks()`
- ⚠️ pgvector not enabled - search returns empty results

## Files Requiring Updates

### 1. app/api/ai/search/route.ts
**Issues:**
- Line 86: Calls `search_ai_chunks` → should be `search_ai_chunks_text`
- Line 89: Parameter `org_id` → should be `p_tenant_id`
- Line 296: Parameter `p_organization_id` → should be `p_tenant_id`
- Multiple: RLS context setting not needed (no RLS deployed)

**Quick Fix:**
```typescript
// OLD:
const { data: chunks, error: searchError } = await supabase.rpc(
  'search_ai_chunks',
  {
    query_embedding: queryEmbedding,
    org_id: orgId || null,
    max_results: maxSources * 2,
    similarity_threshold: 0.6,
  }
);

// NEW (temporary until pgvector enabled):
// Since pgvector isn't enabled, implement keyword search
const { data: documents, error: searchError } = await supabase
  .from('ai_documents')
  .select('id, title, content, metadata')
  .eq('tenant_id', orgId || '')
  .textSearch('content', query, { type: 'websearch' })
  .limit(maxSources);

// Convert documents to chunks format
const chunks = documents?.map(doc => ({
  chunk_id: doc.id,
  document_id: doc.id,
  content: doc.content.substring(0, 500), // First 500 chars
  similarity: 0.8, // Placeholder
  metadata: doc.metadata
})) || [];
```

### 2. app/api/ai/feedback/route.ts
**Issues:**
- Line 46: Selects `organization_id` → should be `tenant_id`
- Line 58, 70: References `organization_id` → should be `tenant_id`

**Quick Fix:**
```typescript
// OLD:
.select('id, organization_id')
if (orgId && query.organization_id !== orgId) {
  // ...
}

// NEW:
.select('id, tenant_id')
if (orgId && query.tenant_id !== orgId) {
  // ...
}
```

### 3. app/api/ai/summarize/route.ts
**Issues:**
- Line 98, 150: References `claim.organization_id` 
- Note: This references claims table which may not have organization_id either

**Status:** ⚠️ Depends on claims table schema

### 4. Helper Functions in API Routes

The `logAiQuery` helper function needs updating:

**OLD:**
```typescript
async function logAiQuery({
  supabase,
  organizationId,
  userId,
  queryText,
  answer,
  sources,
  status,
  latencyMs,
}: LogAiQueryParams): Promise<string | null> {
  // ...
  const { data, error } = await supabase.rpc('log_ai_query', {
    p_organization_id: organizationId,
    p_user_id: userId,
    p_query_text: queryText,
    p_answer: answer,
    p_sources: sources,
    p_status: status,
    p_latency_ms: latencyMs,
  });
```

**NEW:**
```typescript
async function logAiQuery({
  supabase,
  tenantId, // Changed
  userId,
  queryText,
  answer,
  sources,
  status,
  latencyMs,
}: LogAiQueryParams): Promise<string | null> {
  // ...
  const { data, error } = await supabase.rpc('log_ai_query', {
    p_tenant_id: tenantId, // Changed
    p_user_id: userId,
    p_query_text: queryText,
    p_answer: answer,
    p_sources: sources,
    p_status: status,
    p_latency_ms: latencyMs,
  });
```

## Option 1: Quick Patches (Recommended)

Apply minimal changes to make routes work:

1. **Remove RLS context setting** (lines with `set_config`)
2. **Change all `organization_id` → `tenant_id`**
3. **Use keyword search instead of vector search temporarily**
4. **Update log_ai_query calls**

## Option 2: Disable Search Until pgvector

Comment out the search route or return a "coming soon" message:

```typescript
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'AI search temporarily unavailable',
      message: 'Vector search requires pgvector extension. Contact admin to enable.'
    },
    { status: 503 }
  );
}
```

## Option 3: Enable pgvector (Best Long-term)

1. Contact Azure admin to allow-list `vector` extension
2. Run upgrade migration:

```sql
CREATE EXTENSION vector;

-- Convert embedding column from TEXT to VECTOR
ALTER TABLE ai_chunks 
  ALTER COLUMN embedding TYPE vector(1536) 
  USING (embedding::text)::vector;

-- Create vector index
CREATE INDEX idx_ai_chunks_embedding 
  ON ai_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Update search function
CREATE OR REPLACE FUNCTION search_ai_chunks(
  query_embedding vector(1536),
  p_tenant_id TEXT,
  max_results INTEGER DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as chunk_id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    d.metadata
  FROM ai_chunks c
  JOIN ai_documents d ON c.document_id = d.id
  WHERE c.tenant_id = p_tenant_id
    AND 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
```

3. Update API route to use `search_ai_chunks()` with proper parameters

## Testing After Updates

### Test 1: Feedback Endpoint (Should work now)

```bash
# Get test query ID
curl http://localhost:3000/api/ai/feedback?limit=1

# Submit feedback
curl -X POST http://localhost:3000/api/ai/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "query_id": "7ba567db-5c19-4f61-b492-385ca10d8ba0",
    "rating": "good",
    "comment": "Very helpful!"
  }'
```

### Test 2: Search Endpoint (After fixes)

```bash
curl -X POST http://localhost:3000/api/ai/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "query": "What is the grievance process?",
    "max_sources": 5
  }'
```

### Test 3: Summarize Endpoint

```bash
curl -X POST http://localhost:3000/api/ai/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "claim_id": "YOUR_CLAIM_UUID"
  }'
```

## Next Steps

**Immediate (before any AI feature usage):**

1. ✅ Database migration complete
2. ⬜ Add OPENAI_API_KEY to environment
3. ⬜ Update API routes (organization_id → tenant_id)
4. ⬜ Choose search strategy:
   - Option A: Keyword search temporarily
   - Option B: Disable search route
   - Option C: Request pgvector enablement

**Short-term:**

5. ⬜ Create document ingestion endpoint
6. ⬜ Test all 3 API routes end-to-end
7. ⬜ Add rate limiting
8. ⬜ Set up monitoring dashboards

**Medium-term:**

9. ⬜ Enable pgvector and upgrade
10. ⬜ Implement proper vector search
11. ⬜ Add unit tests
12. ⬜ Production deployment

## Environment Variables

Add to `.env.local`:

```env
# Required for all AI features
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional
OPENAI_ORG_ID=org-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1  # Or Azure OpenAI endpoint
```

## Migration Status

- ✅ Tables created (ai_documents, ai_chunks, ai_queries, ai_query_logs, ai_feedback)
- ✅ Views created (ai_usage_by_tenant, ai_feedback_summary)
- ✅ Functions created (log_ai_query, search_ai_chunks_text)
- ✅ Test data inserted and verified
- ⚠️ pgvector not enabled (requires Azure admin)
- ⚠️ API routes need schema updates
- ⬜ OPENAI_API_KEY not configured
- ⬜ No documents ingested yet

---

**Status:** Database ready ✅ | API routes need updates ⚠️ | pgvector needed for production 🔄
