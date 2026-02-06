-- Fix log_ai_query function to use MD5 instead of SHA-256
-- MD5 is built-in to PostgreSQL, SHA-256 requires pgcrypto extension

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
  -- Generate MD5 hash of query (built-in function)
  query_hash := md5(p_query_text);
  
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
