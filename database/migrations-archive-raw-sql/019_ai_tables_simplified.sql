-- Union Eyes AI Tables Migration (Simplified for existing database)
-- Version: 1.1
-- Date: 2025-11-13
-- Purpose: Add AI tables without external dependencies
-- Note: Using TEXT for embeddings until pgvector is enabled

-- ================================================================
-- AI Documents Table
-- Stores documents ingested for AI search (arbitration awards, policies, etc.)
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL, -- Clerk organization ID
  claim_id UUID, -- Optional reference to claims
  
  -- Document content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- Source tracking for copyright compliance
  source_type TEXT NOT NULL CHECK (source_type IN ('internal', 'licensed', 'public')),
  license_notes TEXT,
  
  -- Flexible metadata (employer, arbitrator, issue type, etc.)
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_documents_tenant ON ai_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_documents_claim ON ai_documents(claim_id);
CREATE INDEX IF NOT EXISTS idx_ai_documents_source_type ON ai_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_ai_documents_metadata ON ai_documents USING gin(metadata);

-- ================================================================
-- AI Chunks Table
-- Stores chunked text with embeddings for retrieval
-- Note: Using TEXT for embedding until pgvector is enabled
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  
  -- Chunk content
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  
  -- Embedding stored as TEXT (JSON array) until pgvector is enabled
  -- Format: "[0.123, -0.456, ...]" (1536 dimensions for text-embedding-ada-002)
  embedding TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_ai_chunks_document ON ai_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_chunks_tenant ON ai_chunks(tenant_id);

-- ================================================================
-- AI Queries Table
-- Stores user queries and AI responses for auditing and feedback
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- Clerk user ID
  
  -- Query details
  query_text TEXT NOT NULL,
  query_hash TEXT NOT NULL, -- SHA-256 hash for deduplication
  answer TEXT,
  sources JSONB DEFAULT '[]',
  
  -- Performance metrics
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'no_results')),
  latency_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_queries_tenant ON ai_queries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_queries_user ON ai_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_queries_hash ON ai_queries(query_hash);
CREATE INDEX IF NOT EXISTS idx_ai_queries_created ON ai_queries(created_at DESC);

-- ================================================================
-- AI Query Logs Table
-- Privacy-preserving audit logs (no query text, just hashes)
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  
  -- Privacy: store only hash, not actual query
  input_hash TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  latency_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'no_results'))
);

CREATE INDEX IF NOT EXISTS idx_ai_query_logs_tenant ON ai_query_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_timestamp ON ai_query_logs(timestamp DESC);

-- ================================================================
-- AI Feedback Table
-- User feedback on AI-generated content
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES ai_queries(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  rating TEXT NOT NULL CHECK (rating IN ('good', 'bad')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_query ON ai_feedback(query_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_tenant ON ai_feedback(tenant_id);

-- ================================================================
-- Helper Functions
-- ================================================================

-- Function to log queries with privacy protection
CREATE OR REPLACE FUNCTION log_ai_query(
  p_tenant_id TEXT,
  p_user_id TEXT,
  p_query_text TEXT,
  p_answer TEXT,
  p_sources JSONB,
  p_status TEXT,
  p_latency_ms INTEGER
)
RETURNS UUID AS $$
DECLARE
  query_id UUID;
  query_hash TEXT;
BEGIN
  -- Generate SHA-256 hash of query
  query_hash := encode(digest(p_query_text, 'sha256'), 'hex');
  
  -- Insert into ai_queries
  INSERT INTO ai_queries (
    tenant_id,
    user_id,
    query_text,
    query_hash,
    answer,
    sources,
    status,
    latency_ms
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_query_text,
    query_hash,
    p_answer,
    p_sources,
    p_status,
    p_latency_ms
  ) RETURNING id INTO query_id;
  
  -- Insert privacy-preserving log
  INSERT INTO ai_query_logs (
    tenant_id,
    input_hash,
    latency_ms,
    status
  ) VALUES (
    p_tenant_id,
    query_hash,
    p_latency_ms,
    p_status
  );
  
  RETURN query_id;
END;
$$ LANGUAGE plpgsql;

-- Placeholder search function (until pgvector is enabled)
CREATE OR REPLACE FUNCTION search_ai_chunks_text(
  query_embedding_text TEXT,
  p_tenant_id TEXT,
  max_results INTEGER DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  -- Placeholder: Returns empty results until pgvector is enabled
  RETURN QUERY
  SELECT 
    c.id as chunk_id,
    c.document_id,
    c.content,
    0.0::FLOAT as similarity
  FROM ai_chunks c
  WHERE c.tenant_id = p_tenant_id
  LIMIT 0;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- Views for Analytics
-- ================================================================

CREATE OR REPLACE VIEW ai_usage_by_tenant AS
SELECT 
  tenant_id,
  COUNT(*) as total_queries,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_queries,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_queries,
  AVG(latency_ms) as avg_latency_ms,
  MAX(created_at) as last_query_at
FROM ai_queries
GROUP BY tenant_id;

CREATE OR REPLACE VIEW ai_feedback_summary AS
SELECT 
  tenant_id,
  COUNT(*) as total_feedback,
  COUNT(CASE WHEN rating = 'good' THEN 1 END) as positive_feedback,
  COUNT(CASE WHEN rating = 'bad' THEN 1 END) as negative_feedback,
  ROUND(
    100.0 * COUNT(CASE WHEN rating = 'good' THEN 1 END) / NULLIF(COUNT(*), 0), 
    2
  ) as positive_rate_pct
FROM ai_feedback
GROUP BY tenant_id;

-- ================================================================
-- Comments
-- ================================================================
COMMENT ON TABLE ai_documents IS 'Documents ingested for AI search (awards, policies, etc.)';
COMMENT ON TABLE ai_chunks IS 'Text chunks with embeddings for semantic search (embeddings as TEXT until pgvector enabled)';
COMMENT ON TABLE ai_queries IS 'User queries and AI responses for auditing';
COMMENT ON TABLE ai_query_logs IS 'Privacy-preserving audit logs';
COMMENT ON TABLE ai_feedback IS 'User feedback on AI-generated content';
COMMENT ON FUNCTION log_ai_query IS 'Log AI queries with privacy protection (hash-based)';
COMMENT ON FUNCTION search_ai_chunks_text IS 'Placeholder for vector search until pgvector is enabled';
COMMENT ON VIEW ai_usage_by_tenant IS 'Query statistics by tenant/organization';
COMMENT ON VIEW ai_feedback_summary IS 'Feedback statistics by tenant/organization';
