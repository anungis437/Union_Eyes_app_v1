-- Create ML Predictions and Model Metadata tables

CREATE TABLE IF NOT EXISTS ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    prediction_type VARCHAR(50) NOT NULL,
    prediction_date DATE NOT NULL,
    predicted_value NUMERIC NOT NULL,
    lower_bound NUMERIC,
    upper_bound NUMERIC,
    confidence NUMERIC,
    horizon INTEGER,
    granularity VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_prediction UNIQUE (tenant_id, prediction_type, prediction_date, horizon)
);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_tenant ON ml_predictions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_type ON ml_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_date ON ml_predictions(prediction_date);

CREATE TABLE IF NOT EXISTS model_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    accuracy NUMERIC,
    trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parameters JSONB,
    CONSTRAINT unique_model UNIQUE (tenant_id, model_type, version)
);

CREATE INDEX IF NOT EXISTS idx_model_metadata_tenant ON model_metadata(tenant_id);
CREATE INDEX IF NOT EXISTS idx_model_metadata_type ON model_metadata(model_type);

COMMENT ON TABLE ml_predictions IS 'Stores ML model predictions for workload forecasting and churn risk';
COMMENT ON TABLE model_metadata IS 'Stores metadata about trained ML models including accuracy and parameters';
