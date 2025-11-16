-- Migration 011: AI System Tables
-- Description: Creates tables for AI analysis results, predictions, jobs, and usage tracking
-- Created: 2025-01-XX

-- =======================================================================
-- Table: ai_analyses
-- Purpose: Store document analysis and contract analysis results
-- =======================================================================
CREATE TABLE IF NOT EXISTS ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Analysis metadata
    analysis_type VARCHAR(50) NOT NULL, -- 'document', 'contract'
    document_type VARCHAR(100), -- 'grievance', 'contract', 'policy', etc.
    
    -- Input data
    document_text TEXT NOT NULL,
    document_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for deduplication
    
    -- Analysis results (JSONB for flexible structure)
    summary TEXT,
    key_points JSONB,
    entities JSONB,
    sentiment VARCHAR(20),
    category VARCHAR(100),
    legal_issues JSONB,
    suggested_actions JSONB,
    risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Contract-specific fields
    clauses JSONB,
    missing_clauses JSONB,
    recommendations JSONB,
    overall_risk VARCHAR(20),
    
    -- AI model info
    ai_model VARCHAR(100) NOT NULL,
    ai_provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic'
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    
    -- Indexes
    CONSTRAINT ai_analyses_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_analyses_tenant ON ai_analyses(tenant_id);
CREATE INDEX idx_ai_analyses_type ON ai_analyses(analysis_type);
CREATE INDEX idx_ai_analyses_risk ON ai_analyses(risk_level);
CREATE INDEX idx_ai_analyses_created ON ai_analyses(created_at DESC);
CREATE INDEX idx_ai_analyses_hash ON ai_analyses(document_hash);

-- =======================================================================
-- Table: ai_predictions
-- Purpose: Store all AI predictions (outcomes, timelines, resources, settlements)
-- =======================================================================
CREATE TABLE IF NOT EXISTS ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    claim_id UUID, -- NULL for tenant-level predictions
    
    -- Prediction metadata
    prediction_type VARCHAR(50) NOT NULL, -- 'outcome', 'timeline', 'resources', 'settlement', 'anomaly'
    
    -- Input data (JSONB for flexibility)
    input_data JSONB NOT NULL,
    
    -- Prediction results (JSONB for flexible structure)
    prediction_result JSONB NOT NULL,
    
    -- Outcome prediction fields
    predicted_outcome VARCHAR(50), -- 'favorable', 'unfavorable', 'settlement', 'withdrawal'
    outcome_probability DECIMAL(3,2), -- 0.00 to 1.00
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Timeline prediction fields
    estimated_completion_date DATE,
    estimated_duration_days INTEGER,
    
    -- Resource prediction fields
    recommended_assignee_id UUID,
    estimated_effort_hours DECIMAL(6,2),
    priority_score INTEGER, -- 1-10
    
    -- Settlement prediction fields
    settlement_min DECIMAL(12,2),
    settlement_max DECIMAL(12,2),
    settlement_most_likely DECIMAL(12,2),
    
    -- Analysis fields
    factors JSONB, -- Contributing factors
    reasoning TEXT,
    suggested_strategy TEXT,
    
    -- AI model info
    ai_model VARCHAR(100) NOT NULL,
    ai_provider VARCHAR(50) NOT NULL,
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    
    -- Feedback tracking
    actual_outcome VARCHAR(50), -- Set when claim resolves
    actual_completion_date DATE,
    actual_settlement_value DECIMAL(12,2),
    accuracy_score DECIMAL(3,2), -- Calculated after outcome known
    feedback_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ,
    
    -- Indexes
    CONSTRAINT ai_predictions_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT ai_predictions_claim_fk FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_predictions_tenant ON ai_predictions(tenant_id);
CREATE INDEX idx_ai_predictions_claim ON ai_predictions(claim_id);
CREATE INDEX idx_ai_predictions_type ON ai_predictions(prediction_type);
CREATE INDEX idx_ai_predictions_created ON ai_predictions(created_at DESC);
CREATE INDEX idx_ai_predictions_accuracy ON ai_predictions(accuracy_score);

-- =======================================================================
-- Table: ai_jobs
-- Purpose: Track asynchronous AI processing jobs
-- =======================================================================
CREATE TABLE IF NOT EXISTS ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Job metadata
    job_type VARCHAR(50) NOT NULL, -- 'analyze', 'predict', 'report', etc.
    job_id VARCHAR(100) NOT NULL UNIQUE, -- Bull queue job ID
    queue_name VARCHAR(50) NOT NULL,
    
    -- Job status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    progress INTEGER DEFAULT 0, -- 0-100
    
    -- Input/output
    input_data JSONB NOT NULL,
    result_data JSONB,
    error_message TEXT,
    
    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Processing info
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    processing_time_ms INTEGER,
    
    -- Priority
    priority INTEGER DEFAULT 5, -- 1-10, higher = more important
    
    -- Metadata
    created_by UUID,
    
    -- Indexes
    CONSTRAINT ai_jobs_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_jobs_tenant ON ai_jobs(tenant_id);
CREATE INDEX idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX idx_ai_jobs_job_id ON ai_jobs(job_id);
CREATE INDEX idx_ai_jobs_created ON ai_jobs(created_at DESC);
CREATE INDEX idx_ai_jobs_priority ON ai_jobs(priority DESC);

-- =======================================================================
-- Table: ai_usage
-- Purpose: Track AI API usage for billing and rate limiting
-- =======================================================================
CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Usage metadata
    feature VARCHAR(50) NOT NULL, -- 'document_analysis', 'prediction', 'nl_query', etc.
    endpoint VARCHAR(100),
    
    -- API provider
    ai_provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic'
    ai_model VARCHAR(100) NOT NULL,
    
    -- Token usage
    tokens_input INTEGER NOT NULL DEFAULT 0,
    tokens_output INTEGER NOT NULL DEFAULT 0,
    tokens_total INTEGER NOT NULL DEFAULT 0,
    
    -- Cost (estimated, in cents)
    estimated_cost_cents DECIMAL(10,4),
    
    -- Timing
    response_time_ms INTEGER,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Request info
    user_id UUID,
    request_id VARCHAR(100),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Indexes
    CONSTRAINT ai_usage_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_usage_tenant ON ai_usage(tenant_id);
CREATE INDEX idx_ai_usage_timestamp ON ai_usage(timestamp DESC);
CREATE INDEX idx_ai_usage_feature ON ai_usage(feature);
CREATE INDEX idx_ai_usage_provider ON ai_usage(ai_provider);
CREATE INDEX idx_ai_usage_user ON ai_usage(user_id);

-- =======================================================================
-- Table: ai_feedback
-- Purpose: Store user feedback on AI predictions and analyses
-- =======================================================================
CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- What was rated
    feedback_type VARCHAR(50) NOT NULL, -- 'analysis', 'prediction', 'query_answer'
    reference_id UUID NOT NULL, -- ID of the ai_analyses or ai_predictions record
    
    -- Rating
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 stars
    accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
    
    -- Feedback text
    feedback_text TEXT,
    
    -- Improvement suggestions
    what_was_wrong TEXT,
    what_was_helpful TEXT,
    suggestions TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    -- Indexes
    CONSTRAINT ai_feedback_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_feedback_tenant ON ai_feedback(tenant_id);
CREATE INDEX idx_ai_feedback_type ON ai_feedback(feedback_type);
CREATE INDEX idx_ai_feedback_reference ON ai_feedback(reference_id);
CREATE INDEX idx_ai_feedback_rating ON ai_feedback(rating);
CREATE INDEX idx_ai_feedback_created ON ai_feedback(created_at DESC);

-- =======================================================================
-- Table: ai_training_data
-- Purpose: Store validated data for model fine-tuning
-- =======================================================================
CREATE TABLE IF NOT EXISTS ai_training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Training type
    training_type VARCHAR(50) NOT NULL, -- 'outcome_prediction', 'document_classification', etc.
    
    -- Input/output pairs
    input_data JSONB NOT NULL,
    expected_output JSONB NOT NULL,
    actual_output JSONB, -- What the model predicted (if applicable)
    
    -- Validation
    validated BOOLEAN DEFAULT false,
    validated_at TIMESTAMPTZ,
    validated_by UUID,
    
    -- Quality score (1-5)
    quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
    
    -- Source
    source VARCHAR(50) NOT NULL, -- 'user_correction', 'historical_data', 'expert_annotation'
    source_reference_id UUID, -- ID of original prediction/analysis
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    
    -- Indexes
    CONSTRAINT ai_training_data_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_training_tenant ON ai_training_data(tenant_id);
CREATE INDEX idx_ai_training_type ON ai_training_data(training_type);
CREATE INDEX idx_ai_training_validated ON ai_training_data(validated);
CREATE INDEX idx_ai_training_quality ON ai_training_data(quality_score);

-- =======================================================================
-- RLS Policies
-- =======================================================================

-- Enable RLS
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;

-- Policies: tenant isolation
CREATE POLICY ai_analyses_tenant_isolation ON ai_analyses
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY ai_predictions_tenant_isolation ON ai_predictions
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY ai_jobs_tenant_isolation ON ai_jobs
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY ai_usage_tenant_isolation ON ai_usage
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY ai_feedback_tenant_isolation ON ai_feedback
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY ai_training_data_tenant_isolation ON ai_training_data
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- =======================================================================
-- Views for reporting
-- =======================================================================

-- AI usage summary by tenant
CREATE OR REPLACE VIEW ai_usage_summary AS
SELECT 
    tenant_id,
    feature,
    ai_provider,
    DATE(timestamp) as usage_date,
    COUNT(*) as request_count,
    SUM(tokens_total) as total_tokens,
    SUM(estimated_cost_cents) as total_cost_cents,
    AVG(response_time_ms) as avg_response_time_ms,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
    SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as error_count
FROM ai_usage
GROUP BY tenant_id, feature, ai_provider, DATE(timestamp);

-- Prediction accuracy tracking
CREATE OR REPLACE VIEW ai_prediction_accuracy AS
SELECT
    tenant_id,
    prediction_type,
    COUNT(*) as total_predictions,
    AVG(confidence_score) as avg_confidence,
    AVG(accuracy_score) as avg_accuracy,
    COUNT(CASE WHEN accuracy_score >= 0.8 THEN 1 END) as high_accuracy_count,
    COUNT(CASE WHEN accuracy_score < 0.5 THEN 1 END) as low_accuracy_count
FROM ai_predictions
WHERE actual_outcome IS NOT NULL
GROUP BY tenant_id, prediction_type;

-- =======================================================================
-- Comments
-- =======================================================================

COMMENT ON TABLE ai_analyses IS 'Stores results of document and contract AI analyses';
COMMENT ON TABLE ai_predictions IS 'Stores all types of AI predictions with outcome tracking';
COMMENT ON TABLE ai_jobs IS 'Tracks asynchronous AI processing jobs from Bull queues';
COMMENT ON TABLE ai_usage IS 'Tracks AI API usage for billing and monitoring';
COMMENT ON TABLE ai_feedback IS 'User feedback on AI outputs for continuous improvement';
COMMENT ON TABLE ai_training_data IS 'Validated training data for model fine-tuning';
