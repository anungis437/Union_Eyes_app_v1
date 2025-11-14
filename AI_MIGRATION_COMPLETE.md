# AI Tables Migration - Completed ✅

**Date:** November 13, 2025  
**Database:** unioneyes (Azure PostgreSQL Staging)  
**Status:** Successfully deployed

## What Was Deployed

Successfully created 5 tables, 2 views, and 2 helper functions for the AI feature set.

### Tables Created

1. **ai_documents** - Stores documents for AI search
   - Fields: id, tenant_id, claim_id, title, content, source_type, license_notes, metadata, timestamps
   - 5 indexes including GIN index on metadata JSONB

2. **ai_chunks** - Text chunks with embeddings
   - Fields: id, document_id, tenant_id, content, chunk_index, embedding (TEXT format)
   - 2 indexes on document_id and tenant_id

3. **ai_queries** - User queries and AI responses
   - Fields: id, tenant_id, user_id, query_text, query_hash, answer, sources, status, latency_ms
   - 4 indexes including descending index on created_at

4. **ai_query_logs** - Privacy-preserving audit logs
   - Fields: id, tenant_id, input_hash, timestamp, latency_ms, status
   - 2 indexes for tenant and timestamp

5. **ai_feedback** - User feedback on AI responses
   - Fields: id, query_id, tenant_id, user_id, rating, comment, created_at
   - 2 indexes on query_id and tenant_id

### Views Created

1. **ai_usage_by_tenant** - Query statistics by tenant
   - Metrics: total_queries, successful_queries, failed_queries, avg_latency_ms, last_query_at

2. **ai_feedback_summary** - Feedback statistics by tenant
   - Metrics: total_feedback, positive_feedback, negative_feedback, positive_rate_pct

### Functions Created

1. **log_ai_query()** - Logs queries with MD5 hashing for privacy
   - Parameters: tenant_id, user_id, query_text, answer, sources, status, latency_ms
   - Returns: query_id (UUID)
   - Note: Uses MD5 instead of SHA-256 (pgcrypto extension not enabled)

2. **search_ai_chunks_text()** - Placeholder for vector search
   - Parameters: query_embedding_text, tenant_id, max_results, similarity_threshold
   - Returns: TABLE(chunk_id, document_id, content, similarity)
   - Note: Currently returns empty results until pgvector is enabled

## Important Notes

### 1. pgvector Extension Not Enabled
**Status:** ⚠️ Requires Azure Admin Approval

The `vector` extension (pgvector) is available but not enabled because Azure PostgreSQL requires administrator approval for this extension.

- **What this means:** Embeddings are stored as TEXT (JSON arrays) instead of native VECTOR type
- **Impact:** No semantic search functionality yet
- **Workaround:** `search_ai_chunks_text()` function exists but returns empty results
- **Next steps:** Contact Azure admin to enable the extension, then run upgrade migration

**To request pgvector enablement:**
```bash
# Azure portal or CLI command needed to allow-list the extension
# See: https://go.microsoft.com/fwlink/?linkid=2301063
```

### 2. Multi-Tenancy Approach Changed

**Original Design:** Used `organization_id UUID` with foreign key to `organizations` table  
**Deployed Design:** Uses `tenant_id TEXT` storing Clerk organization ID directly

**Why the change:**
- The staging database doesn't have an `organizations` table
- This approach is simpler and aligns with Clerk authentication
- No foreign key constraints needed - tenant isolation via application logic

### 3. No RLS Policies Deployed

The original migration included Row-Level Security (RLS) policies, but these were omitted because:
- RLS requires setting `app.current_organization_id` session variable
- Current application doesn't use RLS pattern
- Tenant isolation will be enforced at application layer in API routes

## API Routes Status

The 3 API routes need minor updates to work with the deployed schema:

### ✅ Ready to Work (with env variables):
- `/api/ai/feedback` - POST and GET handlers
- `/api/ai/summarize` - Case summary generation

### ⚠️ Needs Update:
- `/api/ai/search` - Currently calls `search_ai_chunks()` which doesn't exist
  - Update to use `search_ai_chunks_text()` 
  - Or implement client-side similarity search until pgvector is enabled

## Environment Variables Needed

Add to `.env.local`:

```env
# OpenAI API Key (required for all AI features)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: OpenAI Organization ID
OPENAI_ORG_ID=org-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Next Steps

### Immediate (To Make Features Work):

1. **Add OpenAI API Key**
   ```bash
   # Add to .env.local
   OPENAI_API_KEY=your-key-here
   ```

2. **Update Search Route**
   - Modify `/api/ai/search/route.ts` to handle no-vector scenario
   - Options:
     - Use keyword search temporarily
     - Implement client-side similarity (slow)
     - Wait for pgvector and disable search endpoint

3. **Test Feedback Endpoint**
   ```bash
   # Should work immediately
   curl -X POST http://localhost:3000/api/ai/feedback \
     -H "Content-Type: application/json" \
     -d '{"query_id": "uuid", "rating": "good"}'
   ```

### Short-term (Enable Vector Search):

4. **Request pgvector Extension**
   - Contact Azure PostgreSQL admin
   - Request allow-listing of `vector` extension
   - May require Enterprise tier

5. **Run Vector Upgrade Migration**
   - After pgvector enabled, run:
   ```sql
   CREATE EXTENSION vector;
   ALTER TABLE ai_chunks ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector;
   CREATE INDEX idx_ai_chunks_embedding ON ai_chunks USING ivfflat (embedding vector_cosine_ops);
   ```

6. **Update Search Function**
   - Replace `search_ai_chunks_text()` with actual cosine similarity query

### Medium-term (Production Readiness):

7. **Document Ingestion**
   - Create `/api/ai/ingest` endpoint
   - Build document parser (PDF, DOCX support)
   - Generate embeddings for uploaded docs
   - Store in ai_documents/ai_chunks

8. **Rate Limiting**
   - Implement 100 queries/hour per tenant
   - Add Redis or in-memory rate limiter

9. **Monitoring**
   - Create dashboards using ai_usage_by_tenant view
   - Set up alerts for high latency or error rates
   - Track token usage and costs

10. **Testing**
    - Unit tests for PII masking
    - Integration tests for API routes
    - Load testing for vector search performance

## Cost Estimates

Based on typical usage:

- **OpenAI API Costs:**
  - Embeddings: $0.0001 per 1K tokens (~$0.10 per 1M tokens)
  - GPT-4 Turbo: $0.01 per 1K input tokens, $0.03 per 1K output
  - Estimated: $50-100/month for 100 queries/day

- **Azure PostgreSQL Storage:**
  - ~1MB per 100 document chunks
  - Embeddings: 1536 floats × 4 bytes = 6KB per chunk
  - Estimated: <$1/month for 10K documents

## Rollback Plan

If needed, to remove all AI tables:

```sql
DROP VIEW IF EXISTS ai_feedback_summary;
DROP VIEW IF EXISTS ai_usage_by_tenant;
DROP FUNCTION IF EXISTS search_ai_chunks_text;
DROP FUNCTION IF EXISTS log_ai_query;
DROP TABLE IF EXISTS ai_feedback CASCADE;
DROP TABLE IF EXISTS ai_query_logs CASCADE;
DROP TABLE IF EXISTS ai_queries CASCADE;
DROP TABLE IF EXISTS ai_chunks CASCADE;
DROP TABLE IF EXISTS ai_documents CASCADE;
```

## Verification

Run these queries to verify the migration:

```sql
-- Check table row counts (should all be 0 initially)
SELECT 'ai_documents' as table_name, COUNT(*) as rows FROM ai_documents
UNION ALL
SELECT 'ai_chunks', COUNT(*) FROM ai_chunks
UNION ALL
SELECT 'ai_queries', COUNT(*) FROM ai_queries
UNION ALL
SELECT 'ai_query_logs', COUNT(*) FROM ai_query_logs
UNION ALL
SELECT 'ai_feedback', COUNT(*) FROM ai_feedback;

-- Test log_ai_query function
SELECT log_ai_query(
  'test-tenant-id',
  'user_12345',
  'What is the grievance process?',
  'The grievance process includes three steps...',
  '[]'::jsonb,
  'success',
  1250
);

-- Verify log was created
SELECT * FROM ai_queries ORDER BY created_at DESC LIMIT 1;
SELECT * FROM ai_query_logs ORDER BY timestamp DESC LIMIT 1;
```

## Documentation References

- **AI Implementation Summary:** `AI_IMPLEMENTATION_SUMMARY.md`
- **AI Quick Start Guide:** `AI_QUICK_START.md`
- **Responsible AI Framework:** `RESPONSIBLE_AI.md`
- **API Package:** `packages/ai/README.md`
- **Migration Files:**
  - Original: `database/migrations/019_ai_tables.sql` (requires pgvector)
  - Simplified: `database/migrations/019_ai_tables_simplified.sql` (✅ deployed)

---

**Migration completed successfully!** 🎉

The database is ready for AI features. Next step: Add OpenAI API key and test the endpoints.
