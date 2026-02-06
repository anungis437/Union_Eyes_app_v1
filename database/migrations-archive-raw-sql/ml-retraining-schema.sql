-- ML Retraining Infrastructure Schema
-- Add these tables to support automated model retraining pipeline

-- Model training runs tracking
CREATE TABLE IF NOT EXISTS ml_model_training_runs (
  id SERIAL PRIMARY KEY,
  training_id VARCHAR(255) UNIQUE NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  model_type VARCHAR(100) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  training_started_at TIMESTAMP NOT NULL,
  training_completed_at TIMESTAMP,
  training_samples INTEGER,
  validation_samples INTEGER,
  training_accuracy DECIMAL(5,4),
  validation_accuracy DECIMAL(5,4),
  hyperparameters JSONB,
  status VARCHAR(50) DEFAULT 'running', -- running, completed, failed
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_runs_tenant ON ml_model_training_runs(tenant_id);
CREATE INDEX idx_training_runs_model ON ml_model_training_runs(model_type);
CREATE INDEX idx_training_runs_status ON ml_model_training_runs(status);

-- Retraining notifications
CREATE TABLE IF NOT EXISTS ml_retraining_notifications (
  id SERIAL PRIMARY KEY,
  model_type VARCHAR(100) NOT NULL,
  result VARCHAR(50) NOT NULL, -- deployed, failed
  details TEXT,
  notified_at TIMESTAMP DEFAULT NOW(),
  recipients JSONB, -- Array of user IDs notified
  notification_method VARCHAR(50) DEFAULT 'email' -- email, slack, in-app
);

CREATE INDEX idx_retraining_notif_model ON ml_retraining_notifications(model_type);
CREATE INDEX idx_retraining_notif_time ON ml_retraining_notifications(notified_at);

-- Model feature baselines (for drift detection)
CREATE TABLE IF NOT EXISTS model_feature_baselines (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  model_type VARCHAR(100) NOT NULL,
  feature_name VARCHAR(255),
  baseline_value DECIMAL(10,4),
  baseline_complexity DECIMAL(5,2),
  distribution_data JSONB, -- Stores distribution histograms
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  deactivated_at TIMESTAMP
);

CREATE INDEX idx_feature_baselines_tenant ON model_feature_baselines(tenant_id);
CREATE INDEX idx_feature_baselines_model ON model_feature_baselines(model_type);
CREATE INDEX idx_feature_baselines_active ON model_feature_baselines(is_active);

-- Model metadata (enhanced)
CREATE TABLE IF NOT EXISTS model_metadata (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  model_type VARCHAR(100) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  model_version INTEGER NOT NULL,
  training_run_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  deployed_at TIMESTAMP,
  deactivated_at TIMESTAMP,
  baseline_accuracy DECIMAL(5,4),
  baseline_confidence DECIMAL(5,4),
  config JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_model_metadata_tenant ON model_metadata(tenant_id);
CREATE INDEX idx_model_metadata_type ON model_metadata(model_type);
CREATE INDEX idx_model_metadata_active ON model_metadata(is_active);

-- ML predictions (enhanced)
CREATE TABLE IF NOT EXISTS ml_predictions (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  claim_id VARCHAR(255),
  model_type VARCHAR(100) NOT NULL,
  model_version INTEGER,
  prediction_value TEXT NOT NULL,
  confidence_score DECIMAL(5,4),
  prediction_correct BOOLEAN,
  predicted_at TIMESTAMP DEFAULT NOW(),
  response_time_ms INTEGER,
  features_used JSONB
);

CREATE INDEX idx_ml_predictions_tenant ON ml_predictions(tenant_id);
CREATE INDEX idx_ml_predictions_model ON ml_predictions(model_type);
CREATE INDEX idx_ml_predictions_time ON ml_predictions(predicted_at);
CREATE INDEX idx_ml_predictions_user ON ml_predictions(user_id);

-- ML alert acknowledgments
CREATE TABLE IF NOT EXISTS ml_alert_acknowledgments (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  alert_type VARCHAR(100) NOT NULL,
  model_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  acknowledged_by VARCHAR(255) NOT NULL,
  acknowledged_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_alert_ack_tenant ON ml_alert_acknowledgments(tenant_id);
CREATE INDEX idx_alert_ack_model ON ml_alert_acknowledgments(model_type);

-- Member AI feedback
CREATE TABLE IF NOT EXISTS member_ai_feedback (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  member_name VARCHAR(255) NOT NULL,
  member_email VARCHAR(255),
  feedback_category VARCHAR(50) NOT NULL, -- general, concern, incorrect, suggestion, question, opt-out
  feedback_message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'normal', -- normal, high
  status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, resolved
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewer_id VARCHAR(255),
  reviewer_response TEXT
);

CREATE INDEX idx_member_feedback_tenant ON member_ai_feedback(tenant_id);
CREATE INDEX idx_member_feedback_status ON member_ai_feedback(status);
CREATE INDEX idx_member_feedback_severity ON member_ai_feedback(severity);
CREATE INDEX idx_member_feedback_user ON member_ai_feedback(user_id);

-- Analytics and benchmarking
CREATE TABLE IF NOT EXISTS benchmark_data (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  metric_name VARCHAR(255) NOT NULL,
  metric_value DECIMAL(10,4),
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_benchmark_tenant ON benchmark_data(tenant_id);
CREATE INDEX idx_benchmark_metric ON benchmark_data(metric_name);

CREATE TABLE IF NOT EXISTS analytics_scheduled_reports (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  schedule_frequency VARCHAR(50) NOT NULL, -- daily, weekly, monthly
  next_run_at TIMESTAMP NOT NULL,
  last_run_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  recipients JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_reports_tenant ON analytics_scheduled_reports(tenant_id);
CREATE INDEX idx_scheduled_reports_next_run ON analytics_scheduled_reports(next_run_at);
