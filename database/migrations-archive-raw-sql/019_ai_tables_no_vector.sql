-- Union Eyes AI Tables Migration (Modified for Azure PostgreSQL)
-- Version: 1.0
-- Date: 2025-11-13
-- Purpose: Add tables for RAG-based AI search, summaries, and pattern detection
-- Note: This version uses TEXT for embeddings until pgvector is enabled

-- Note: uuid-ossp is restricted in Azure, but gen_random_uuid() is built-in to PostgreSQL 13+
-- Note: pgvector extension requires Azure admin approval - embeddings stored as TEXT (JSON array) for now

-- ================================================================
-- AI Documents Table
-- Stores documents ingested for AI search (arbitration awards, policies, etc.)
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
  
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT ai_documents_source_type_check CHECK (source_type IN ('internal', 'licensed', 'public'))
);

CREATE INDEX idx_ai_documents_org ON ai_documents(organization_id);
CREATE INDEX idx_ai_documents_claim ON ai_documents(claim_id);
CREATE INDEX idx_ai_documents_source_type ON ai_documents(source_type);
CREATE INDEX idx_ai_documents_metadata ON ai_documents USING gin(metadata);

-- ================================================================
-- AI Chunks Table
-- Stores chunked text with embeddings for retrieval
-- Note: Using TEXT for embedding until pgvector is enabled
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
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

CREATE INDEX idx_ai_chunks_document ON ai_chunks(document_id);
CREATE INDEX idx_ai_chunks_org ON ai_chunks(organization_id);
-- Vector index will be added when pgvector is enabled:
-- CREATE INDEX idx_ai_chunks_embedding ON ai_chunks USING ivfflat (embedding vector_cosine_ops);

-- ================================================================
-- AI Queries Table
-- Stores user queries and AI responses for auditing and feedback
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT ai_queries_status_check CHECK (status IN ('success', 'error', 'no_results'))
);

CREATE INDEX idx_ai_queries_org ON ai_queries(organization_id);
CREATE INDEX idx_ai_queries_user ON ai_queries(user_id);
CREATE INDEX idx_ai_queries_hash ON ai_queries(query_hash);
CREATE INDEX idx_ai_queries_created ON ai_queries(created_at DESC);

-- ================================================================
-- AI Query Logs Table
-- Privacy-preserving audit logs (no query text, just hashes)
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Privacy: store only hash, not actual query
  input_hash TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  latency_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'no_results'))
);

CREATE INDEX idx_ai_query_logs_org ON ai_query_logs(organization_id);
CREATE INDEX idx_ai_query_logs_timestamp ON ai_query_logs(timestamp DESC);

-- ================================================================
-- AI Feedback Table
-- User feedback on AI-generated content
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES ai_queries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  
  rating TEXT NOT NULL CHECK (rating IN ('good', 'bad')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_feedback_query ON ai_feedback(query_id);
CREATE INDEX idx_ai_feedback_org ON ai_feedback(organization_id);

-- ================================================================
-- Row-Level Security (RLS)
-- ================================================================
ALTER TABLE ai_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  -- This should be populated by your application context
  -- For now, return NULL; update based on your auth setup
  RETURN current_setting('app.current_organization_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY ai_documents_org_isolation ON ai_documents
  FOR ALL USING (organization_id = get_user_organization_id());

CREATE POLICY ai_chunks_org_isolation ON ai_chunks
  FOR ALL USING (organization_id = get_user_organization_id());

CREATE POLICY ai_queries_org_isolation ON ai_queries
  FOR ALL USING (organization_id = get_user_organization_id());

CREATE POLICY ai_query_logs_org_isolation ON ai_query_logs
  FOR ALL USING (organization_id = get_user_organization_id());

CREATE POLICY ai_feedback_org_isolation ON ai_feedback
  FOR ALL USING (organization_id = get_user_organization_id());

-- ================================================================
-- Views for Analytics
-- ================================================================

-- AI Usage by Organization
CREATE OR REPLACE VIEW ai_usage_by_org AS
SELECT 
  organization_id,
  COUNT(*) as total_queries,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_queries,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_queries,
  AVG(latency_ms) as avg_latency_ms,
  MAX(created_at) as last_query_at
FROM ai_queries
GROUP BY organization_id;

-- AI Feedback Summary
CREATE OR REPLACE VIEW ai_feedback_summary AS
SELECT 
  organization_id,
  COUNT(*) as total_feedback,
  COUNT(CASE WHEN rating = 'good' THEN 1 END) as positive_feedback,
  COUNT(CASE WHEN rating = 'bad' THEN 1 END) as negative_feedback,
  ROUND(
    100.0 * COUNT(CASE WHEN rating = 'good' THEN 1 END) / NULLIF(COUNT(*), 0), 
    2
  ) as positive_rate_pct
FROM ai_feedback
GROUP BY organization_id;

-- ================================================================
-- Helper Functions
-- ================================================================

-- Note: This is a placeholder until pgvector is enabled
-- When pgvector is available, replace with proper vector similarity search
CREATE OR REPLACE FUNCTION search_ai_chunks_text(
  query_embedding_text TEXT,
  org_id UUID,
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
  -- After enabling pgvector, implement cosine similarity search
  RETURN QUERY
  SELECT 
    c.id as chunk_id,
    c.document_id,
    c.content,
    0.0::FLOAT as similarity
  FROM ai_chunks c
  WHERE c.organization_id = org_id
  LIMIT 0; -- Return nothing for now
END;
$$ LANGUAGE plpgsql;

-- Function to log queries with privacy protection
CREATE OR REPLACE FUNCTION log_ai_query(
  p_organization_id UUID,
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
    organization_id,
    user_id,
    query_text,
    query_hash,
    answer,
    sources,
    status,
    latency_ms
  ) VALUES (
    p_organization_id,
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
    organization_id,
    input_hash,
    latency_ms,
    status
  ) VALUES (
    p_organization_id,
    query_hash,
    p_latency_ms,
    p_status
  );
  
  RETURN query_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- Comments
-- ================================================================
COMMENT ON TABLE ai_documents IS 'Documents ingested for AI search (awards, policies, etc.)';
COMMENT ON TABLE ai_chunks IS 'Text chunks with embeddings for semantic search (embeddings as TEXT until pgvector enabled)';
COMMENT ON TABLE ai_queries IS 'User queries and AI responses for auditing';
COMMENT ON TABLE ai_query_logs IS 'Privacy-preserving audit logs';
COMMENT ON TABLE ai_feedback IS 'User feedback on AI-generated content';

-- ================================================================
-- Grants (adjust based on your role setup)
-- ================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ai_documents TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ai_chunks TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ai_queries TO app_user;
-- GRANT SELECT, INSERT ON ai_query_logs TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ai_feedback TO app_user;

-- GRANT SELECT ON ai_usage_by_org TO app_user;
-- GRANT SELECT ON ai_feedback_summary TO app_user;
