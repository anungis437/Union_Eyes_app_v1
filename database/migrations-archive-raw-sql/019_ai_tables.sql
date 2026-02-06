-- Union Eyes AI Tables Migration
-- Version: 1.0
-- Date: 2025-11-13
-- Purpose: Add tables for RAG-based AI search, summaries, and pattern detection

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector; -- For pgvector support

-- ================================================================
-- AI Documents Table
-- Stores documents ingested for AI search (arbitration awards, policies, etc.)
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Chunk content
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  
  -- Embedding vector (1536 dimensions for OpenAI ada-002)
  embedding VECTOR(1536),
  
  -- Chunk-level metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one chunk per document index
  CONSTRAINT unique_document_chunk UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_ai_chunks_document ON ai_chunks(document_id);
CREATE INDEX idx_ai_chunks_org ON ai_chunks(organization_id);
CREATE INDEX idx_ai_chunks_embedding ON ai_chunks USING ivfflat (embedding vector_cosine_ops);

-- ================================================================
-- AI Queries Table
-- Stores user queries and AI responses for auditing
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID
  
  -- Query details
  query_text TEXT NOT NULL,
  query_hash TEXT NOT NULL, -- SHA-256 hash for deduplication
  filters JSONB DEFAULT '{}',
  
  -- Response
  answer TEXT,
  sources JSONB DEFAULT '[]', -- Array of source references
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'error')),
  latency_ms INTEGER,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_queries_org ON ai_queries(organization_id);
CREATE INDEX idx_ai_queries_user ON ai_queries(user_id);
CREATE INDEX idx_ai_queries_hash ON ai_queries(query_hash);
CREATE INDEX idx_ai_queries_created ON ai_queries(created_at DESC);

-- ================================================================
-- AI Query Logs Table
-- Detailed logs for monitoring and debugging
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_query_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID REFERENCES ai_queries(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  
  -- Hash of input for privacy (don't store full query text here)
  input_hash TEXT NOT NULL,
  
  -- Performance metrics
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  latency_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  
  -- Error details (if applicable)
  error_message TEXT
);

CREATE INDEX idx_ai_query_logs_org ON ai_query_logs(organization_id);
CREATE INDEX idx_ai_query_logs_timestamp ON ai_query_logs(timestamp DESC);
CREATE INDEX idx_ai_query_logs_status ON ai_query_logs(status);

-- ================================================================
-- AI Feedback Table
-- User feedback on AI responses
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID NOT NULL REFERENCES ai_queries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  
  -- Feedback
  rating TEXT NOT NULL CHECK (rating IN ('good', 'bad')),
  comment TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_feedback_query ON ai_feedback(query_id);
CREATE INDEX idx_ai_feedback_org ON ai_feedback(organization_id);
CREATE INDEX idx_ai_feedback_rating ON ai_feedback(rating);

-- ================================================================
-- Row-Level Security (RLS) Policies
-- ================================================================

-- Enable RLS on all AI tables
ALTER TABLE ai_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_organization_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policy: Users can only access their organization's AI documents
CREATE POLICY ai_documents_org_isolation ON ai_documents
  FOR ALL
  USING (organization_id = get_user_organization_id());

-- RLS Policy: Users can only access their organization's AI chunks
CREATE POLICY ai_chunks_org_isolation ON ai_chunks
  FOR ALL
  USING (organization_id = get_user_organization_id());

-- RLS Policy: Users can only access their organization's AI queries
CREATE POLICY ai_queries_org_isolation ON ai_queries
  FOR ALL
  USING (organization_id = get_user_organization_id());

-- RLS Policy: Users can only access their organization's AI query logs
CREATE POLICY ai_query_logs_org_isolation ON ai_query_logs
  FOR ALL
  USING (organization_id = get_user_organization_id());

-- RLS Policy: Users can only access their organization's AI feedback
CREATE POLICY ai_feedback_org_isolation ON ai_feedback
  FOR ALL
  USING (organization_id = get_user_organization_id());

-- ================================================================
-- Helper Views for Analytics
-- ================================================================

-- View: AI usage by organization
CREATE OR REPLACE VIEW ai_usage_by_org AS
SELECT
  organization_id,
  COUNT(*) as total_queries,
  COUNT(*) FILTER (WHERE status = 'success') as successful_queries,
  COUNT(*) FILTER (WHERE status = 'error') as failed_queries,
  AVG(latency_ms) as avg_latency_ms,
  MAX(created_at) as last_query_at
FROM ai_queries
GROUP BY organization_id;

-- View: AI feedback summary
CREATE OR REPLACE VIEW ai_feedback_summary AS
SELECT
  organization_id,
  COUNT(*) as total_feedback,
  COUNT(*) FILTER (WHERE rating = 'good') as positive_feedback,
  COUNT(*) FILTER (WHERE rating = 'bad') as negative_feedback,
  ROUND(
    COUNT(*) FILTER (WHERE rating = 'good')::NUMERIC / 
    COUNT(*)::NUMERIC * 100, 
    2
  ) as positive_percentage
FROM ai_feedback
GROUP BY organization_id;

-- ================================================================
-- Functions for AI Operations
-- ================================================================

-- Function: Search chunks by semantic similarity
-- Note: This is a placeholder - actual implementation depends on your vector search setup
CREATE OR REPLACE FUNCTION search_ai_chunks(
  query_embedding VECTOR(1536),
  org_id UUID,
  max_results INTEGER DEFAULT 5,
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
    ac.id,
    ac.document_id,
    ac.content,
    1 - (ac.embedding <=> query_embedding) as similarity,
    ac.metadata
  FROM ai_chunks ac
  WHERE
    ac.organization_id = org_id
    AND 1 - (ac.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY ac.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Log AI query
CREATE OR REPLACE FUNCTION log_ai_query(
  p_organization_id UUID,
  p_user_id TEXT,
  p_query_text TEXT,
  p_filters JSONB,
  p_answer TEXT,
  p_sources JSONB,
  p_status TEXT,
  p_latency_ms INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_query_id UUID;
  v_query_hash TEXT;
BEGIN
  -- Generate hash of query for deduplication
  v_query_hash := encode(digest(p_query_text, 'sha256'), 'hex');
  
  -- Insert into ai_queries
  INSERT INTO ai_queries (
    organization_id,
    user_id,
    query_text,
    query_hash,
    filters,
    answer,
    sources,
    status,
    latency_ms
  )
  VALUES (
    p_organization_id,
    p_user_id,
    p_query_text,
    v_query_hash,
    p_filters,
    p_answer,
    p_sources,
    p_status,
    p_latency_ms
  )
  RETURNING id INTO v_query_id;
  
  -- Insert into ai_query_logs
  INSERT INTO ai_query_logs (
    query_id,
    organization_id,
    user_id,
    input_hash,
    latency_ms,
    status
  )
  VALUES (
    v_query_id,
    p_organization_id,
    p_user_id,
    v_query_hash,
    p_latency_ms,
    p_status
  );
  
  RETURN v_query_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- Triggers
-- ================================================================

-- Trigger: Update ai_documents.updated_at on modification
CREATE OR REPLACE FUNCTION update_ai_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_documents_updated_at
  BEFORE UPDATE ON ai_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_documents_updated_at();

-- ================================================================
-- Grants
-- ================================================================

-- Grant usage to authenticated users (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ================================================================
-- Comments for Documentation
-- ================================================================

COMMENT ON TABLE ai_documents IS 'Documents ingested for AI search (arbitration awards, policies, grievances)';
COMMENT ON TABLE ai_chunks IS 'Chunked text with embeddings for semantic search';
COMMENT ON TABLE ai_queries IS 'User queries and AI responses for auditing';
COMMENT ON TABLE ai_query_logs IS 'Detailed logs for monitoring and debugging AI queries';
COMMENT ON TABLE ai_feedback IS 'User feedback on AI responses';

COMMENT ON COLUMN ai_documents.source_type IS 'Tracks document source for copyright compliance: internal (union files), licensed (paid databases), public (public domain)';
COMMENT ON COLUMN ai_documents.license_notes IS 'Notes about licensing terms for licensed documents';
COMMENT ON COLUMN ai_chunks.embedding IS 'Vector embedding (1536 dimensions for OpenAI ada-002)';
COMMENT ON COLUMN ai_queries.query_hash IS 'SHA-256 hash of query text for deduplication';
COMMENT ON COLUMN ai_query_logs.input_hash IS 'Hash of input for privacy - does not store full query text';
