-- Migration: 020_case_summaries.sql
-- Description: Create case_summaries table for AI-generated summaries
-- Date: 2024-01-XX
-- Dependencies: claims table, ai_tables (019)

-- ====================
-- Table: case_summaries
-- ====================
-- Stores AI-generated summaries of claims/cases
-- Used by /api/ai/summarize endpoint

CREATE TABLE IF NOT EXISTS case_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL,
    tenant_id TEXT NOT NULL,  -- Clerk orgId for multi-tenant isolation
    
    -- Summary content
    summary_text TEXT NOT NULL,
    
    -- Creator tracking
    created_by VARCHAR(50) NOT NULL,  -- 'ai' or user_id
    
    -- Metadata (AI model, purpose, validation, timing, etc.)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to claims table
    CONSTRAINT fk_case_summaries_claim FOREIGN KEY (claim_id) 
        REFERENCES claims(claim_id) ON DELETE CASCADE
);

-- ====================
-- Indexes
-- ====================
-- Query summaries by claim
CREATE INDEX idx_case_summaries_claim ON case_summaries(claim_id);

-- Query AI-generated summaries
CREATE INDEX idx_case_summaries_created_by ON case_summaries(created_by);

-- Multi-tenant filtering
CREATE INDEX idx_case_summaries_tenant ON case_summaries(tenant_id);

-- Recent summaries
CREATE INDEX idx_case_summaries_created_at ON case_summaries(created_at DESC);

-- ====================
-- Comments
-- ====================
COMMENT ON TABLE case_summaries IS 'AI-generated summaries of claims/cases';
COMMENT ON COLUMN case_summaries.claim_id IS 'Reference to the claim being summarized';
COMMENT ON COLUMN case_summaries.tenant_id IS 'Clerk organization ID for isolation';
COMMENT ON COLUMN case_summaries.summary_text IS 'AI-generated summary text (marked as [AI DRAFT])';
COMMENT ON COLUMN case_summaries.created_by IS 'Creator: "ai" for AI-generated, or user_id for human';
COMMENT ON COLUMN case_summaries.metadata IS 'Additional data: purpose, AI model, validation, latency, etc.';
