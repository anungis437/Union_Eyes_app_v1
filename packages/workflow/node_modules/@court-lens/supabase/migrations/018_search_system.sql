-- ============================================================================
-- Search System Database Schema
-- ============================================================================
--
-- Comprehensive database schema for advanced search and filtering system
-- Includes tables for search indexes, saved searches, search history, and metadata
--
-- @author CourtLens Platform Team
-- @date October 23, 2025
-- @phase Phase 2 Week 1 Day 8
--
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Search Index Table
-- Stores searchable content from all entities across the platform
CREATE TABLE IF NOT EXISTS search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  url TEXT NOT NULL,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  searchable_text TSVECTOR,
  relevance_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate entries
  UNIQUE(entity_type, entity_id)
);

-- Saved Searches Table
-- Stores user-created saved searches with sharing capabilities
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  sort_by TEXT,
  sort_order TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  shared_with UUID[],
  shared_with_teams UUID[],
  color TEXT,
  icon TEXT,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Search History Table
-- Tracks all search queries for analytics and suggestions
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  result_count INTEGER DEFAULT 0,
  search_count INTEGER DEFAULT 1,
  clicked_results UUID[],
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search Clicks Table
-- Tracks which results users click for relevance tuning
CREATE TABLE IF NOT EXISTS search_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  result_id UUID NOT NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search Metadata Table
-- Stores system metadata like last reindex timestamp
CREATE TABLE IF NOT EXISTS search_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Search Index Table Indexes
CREATE INDEX IF NOT EXISTS idx_search_index_entity_type ON search_index(entity_type);
CREATE INDEX IF NOT EXISTS idx_search_index_source ON search_index(source);
CREATE INDEX IF NOT EXISTS idx_search_index_firm_id ON search_index(firm_id);
CREATE INDEX IF NOT EXISTS idx_search_index_user_id ON search_index(user_id);
CREATE INDEX IF NOT EXISTS idx_search_index_matter_id ON search_index(matter_id);
CREATE INDEX IF NOT EXISTS idx_search_index_client_id ON search_index(client_id);
CREATE INDEX IF NOT EXISTS idx_search_index_created_at ON search_index(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_index_updated_at ON search_index(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_index_indexed_at ON search_index(indexed_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_index_tags ON search_index USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_search_index_metadata ON search_index USING GIN(metadata);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_search_index_fts ON search_index USING GIN(searchable_text);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_search_index_firm_entity ON search_index(firm_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_search_index_matter_entity ON search_index(matter_id, entity_type);

-- Saved Searches Table Indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_firm_id ON saved_searches(firm_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_is_favorite ON saved_searches(is_favorite);
CREATE INDEX IF NOT EXISTS idx_saved_searches_is_shared ON saved_searches(is_shared);
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_used ON saved_searches(last_used_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_saved_searches_shared_with ON saved_searches USING GIN(shared_with);

-- Search History Table Indexes
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_firm_id ON search_history(firm_id);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);
CREATE INDEX IF NOT EXISTS idx_search_history_last_searched ON search_history(last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_search_count ON search_history(search_count DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_search_history_user_last_searched ON search_history(user_id, last_searched_at DESC);

-- Search Clicks Table Indexes
CREATE INDEX IF NOT EXISTS idx_search_clicks_user_id ON search_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_search_clicks_query ON search_clicks(query);
CREATE INDEX IF NOT EXISTS idx_search_clicks_result_id ON search_clicks(result_id);
CREATE INDEX IF NOT EXISTS idx_search_clicks_clicked_at ON search_clicks(clicked_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_clicks ENABLE ROW LEVEL SECURITY;

-- Search Index RLS Policies
-- Users can only search within their firm's data
CREATE POLICY search_index_select_policy ON search_index
  FOR SELECT
  USING (
    firm_id IN (
      SELECT firm_id FROM user_firms WHERE user_id = auth.uid()
    )
    OR firm_id IS NULL -- Public/system records
  );

-- Only system can insert/update/delete search index
CREATE POLICY search_index_insert_policy ON search_index
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY search_index_update_policy ON search_index
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY search_index_delete_policy ON search_index
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Saved Searches RLS Policies
-- Users can see their own searches and shared searches
CREATE POLICY saved_searches_select_policy ON saved_searches
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      is_shared = TRUE
      AND (
        auth.uid() = ANY(shared_with)
        OR EXISTS (
          SELECT 1 FROM team_members
          WHERE team_id = ANY(shared_with_teams)
          AND user_id = auth.uid()
        )
      )
    )
  );

-- Users can only insert their own searches
CREATE POLICY saved_searches_insert_policy ON saved_searches
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own searches
CREATE POLICY saved_searches_update_policy ON saved_searches
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can only delete their own searches
CREATE POLICY saved_searches_delete_policy ON saved_searches
  FOR DELETE
  USING (user_id = auth.uid());

-- Search History RLS Policies
-- Users can only see their own search history
CREATE POLICY search_history_select_policy ON search_history
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY search_history_insert_policy ON search_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY search_history_delete_policy ON search_history
  FOR DELETE
  USING (user_id = auth.uid());

-- Search Clicks RLS Policies
-- Users can only see their own clicks
CREATE POLICY search_clicks_select_policy ON search_clicks
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY search_clicks_insert_policy ON search_clicks
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_search_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER search_index_updated_at
  BEFORE UPDATE ON search_index
  FOR EACH ROW
  EXECUTE FUNCTION update_search_updated_at();

CREATE TRIGGER saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_search_updated_at();

-- Auto-generate searchable_text tsvector on insert/update
CREATE OR REPLACE FUNCTION generate_searchable_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.searchable_text = 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER search_index_generate_fts
  BEFORE INSERT OR UPDATE ON search_index
  FOR EACH ROW
  EXECUTE FUNCTION generate_searchable_text();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to vacuum and analyze search index
CREATE OR REPLACE FUNCTION vacuum_search_index()
RETURNS VOID AS $$
BEGIN
  VACUUM ANALYZE search_index;
  VACUUM ANALYZE search_history;
  VACUUM ANALYZE saved_searches;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get search index size
CREATE OR REPLACE FUNCTION get_search_index_size()
RETURNS TABLE (
  total_size BIGINT,
  index_size BIGINT,
  table_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pg_total_relation_size('search_index'::regclass) AS total_size,
    pg_indexes_size('search_index'::regclass) AS index_size,
    pg_relation_size('search_index'::regclass) AS table_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old search history (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_search_history(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM search_history
    WHERE last_searched_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate search relevance score
CREATE OR REPLACE FUNCTION calculate_relevance_score(
  search_query TEXT,
  index_entry search_index
)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  query_lower TEXT;
  title_lower TEXT;
BEGIN
  query_lower := LOWER(search_query);
  title_lower := LOWER(index_entry.title);
  
  -- Exact title match
  IF title_lower = query_lower THEN
    score := score + 50;
  -- Title starts with query
  ELSIF title_lower LIKE query_lower || '%' THEN
    score := score + 30;
  -- Title contains query
  ELSIF title_lower LIKE '%' || query_lower || '%' THEN
    score := score + 20;
  END IF;
  
  -- Description match
  IF index_entry.description IS NOT NULL AND LOWER(index_entry.description) LIKE '%' || query_lower || '%' THEN
    score := score + 10;
  END IF;
  
  -- Content match
  IF index_entry.content IS NOT NULL AND LOWER(index_entry.content) LIKE '%' || query_lower || '%' THEN
    score := score + 5;
  END IF;
  
  -- Tag match
  IF index_entry.tags IS NOT NULL AND EXISTS (
    SELECT 1 FROM unnest(index_entry.tags) AS tag
    WHERE LOWER(tag) LIKE '%' || query_lower || '%'
  ) THEN
    score := score + 15;
  END IF;
  
  -- Recency boost
  IF index_entry.updated_at > NOW() - INTERVAL '7 days' THEN
    score := score + 10;
  ELSIF index_entry.updated_at > NOW() - INTERVAL '30 days' THEN
    score := score + 5;
  END IF;
  
  RETURN LEAST(100, score);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default metadata
INSERT INTO search_metadata (key, value) VALUES
  ('version', '1.0.0'),
  ('last_reindex_at', NOW()::TEXT),
  ('last_vacuum_at', NOW()::TEXT)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE search_index IS 'Stores searchable content from all entities';
COMMENT ON TABLE saved_searches IS 'User-created saved searches with sharing';
COMMENT ON TABLE search_history IS 'Search query history for analytics';
COMMENT ON TABLE search_clicks IS 'Tracks clicked results for relevance';
COMMENT ON TABLE search_metadata IS 'System metadata for search';

COMMENT ON COLUMN search_index.searchable_text IS 'Full-text search tsvector';
COMMENT ON COLUMN search_index.relevance_score IS 'Cached relevance score';
COMMENT ON COLUMN saved_searches.shared_with IS 'Array of user IDs';
COMMENT ON COLUMN saved_searches.shared_with_teams IS 'Array of team IDs';
COMMENT ON COLUMN search_history.search_count IS 'Number of times searched';
COMMENT ON COLUMN search_history.clicked_results IS 'Array of clicked result IDs';
