CREATE TABLE IF NOT EXISTS "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'boolean' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"percentage" integer,
	"allowed_tenants" json,
	"allowed_users" json,
	"description" text,
	"tags" json DEFAULT '[]'::json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"last_modified_by" text,
	CONSTRAINT "feature_flags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emergency_declarations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"emergency_type" varchar(50) NOT NULL,
	"severity_level" varchar(20) DEFAULT 'medium' NOT NULL,
	"declared_by_user_id" uuid NOT NULL,
	"declared_at" timestamp NOT NULL,
	"notes" text,
	"affected_locations" jsonb,
	"affected_member_count" integer DEFAULT 0,
	"resolved_at" timestamp,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notification_sent" boolean DEFAULT false NOT NULL,
	"break_glass_activated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cross_border_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"amount_cents" integer NOT NULL,
	"original_currency" varchar(3) DEFAULT 'CAD',
	"cad_equivalent_cents" integer NOT NULL,
	"from_country_code" varchar(2) DEFAULT 'CA' NOT NULL,
	"to_country_code" varchar(2) NOT NULL,
	"from_party_type" varchar(50) NOT NULL,
	"to_party_type" varchar(50) NOT NULL,
	"cra_reporting_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"requires_t106" boolean DEFAULT false NOT NULL,
	"t106_filed" boolean DEFAULT false NOT NULL,
	"t106_filing_date" timestamp,
	"transaction_type" varchar(50),
	"counterparty_name" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency" varchar(3) NOT NULL,
	"to_currency" varchar(3) DEFAULT 'CAD' NOT NULL,
	"exchange_rate" varchar(20) NOT NULL,
	"rate_source" varchar(50) NOT NULL,
	"effective_date" timestamp NOT NULL,
	"rate_timestamp" timestamp NOT NULL,
	"provider" varchar(100),
	"data_quality" varchar(20) DEFAULT 'official',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_management"."users" ADD COLUMN IF NOT EXISTS "encrypted_sin" text;--> statement-breakpoint
ALTER TABLE "user_management"."users" ADD COLUMN IF NOT EXISTS "encrypted_ssn" text;--> statement-breakpoint
ALTER TABLE "user_management"."users" ADD COLUMN IF NOT EXISTS "encrypted_bank_account" text;--> statement-breakpoint
ALTER TABLE "break_glass_activations" ADD COLUMN IF NOT EXISTS "emergency_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "break_glass_activations" ADD COLUMN IF NOT EXISTS "activation_initiated_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "break_glass_activations" ADD COLUMN IF NOT EXISTS "activation_approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "break_glass_activations" ADD COLUMN IF NOT EXISTS "key_holder_ids" jsonb;--> statement-breakpoint
ALTER TABLE "break_glass_activations" ADD COLUMN IF NOT EXISTS "secret_shares" jsonb;--> statement-breakpoint
ALTER TABLE "break_glass_activations" ADD COLUMN IF NOT EXISTS "audited_at" timestamp;--> statement-breakpoint
ALTER TABLE "break_glass_activations" ADD COLUMN IF NOT EXISTS "audited_by" uuid;--> statement-breakpoint
ALTER TABLE "break_glass_activations" ADD COLUMN IF NOT EXISTS "audit_report" text;--> statement-breakpoint
ALTER TABLE "break_glass_activations" ADD CONSTRAINT "break_glass_activations_emergency_id_emergency_declarations_id_fk" FOREIGN KEY ("emergency_id") REFERENCES "public"."emergency_declarations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "break_glass_system_id";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "activation_type";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "emergency_level";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "activated_at";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "resolved_at";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "recovery_duration";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "signature_4_user_id";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "signature_4_timestamp";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "signature_4_ip_address";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "signature_5_user_id";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "signature_5_timestamp";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "signature_5_ip_address";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "authorization_complete";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "authorization_completed_at";--> statement-breakpoint
ALTER TABLE "break_glass_activations" DROP COLUMN IF EXISTS "activated_by";--> statement-breakpoint
ALTER TABLE "voter_eligibility" DROP CONSTRAINT IF EXISTS "valid_verification_status";--> statement-breakpoint
ALTER TABLE "voter_eligibility" ADD CONSTRAINT "valid_verification_status" CHECK ("voter_eligibility"."verification_status" IN ('pending', 'verified', 'rejected')) NOT VALID;--> statement-breakpoint
ALTER TABLE "votes" DROP CONSTRAINT IF EXISTS "valid_voter_type";--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "valid_voter_type" CHECK ("votes"."voter_type" IN ('member', 'delegate', 'officer', 'guest')) NOT VALID;--> statement-breakpoint
ALTER TABLE "voting_notifications" DROP CONSTRAINT IF EXISTS "valid_notification_type";--> statement-breakpoint
ALTER TABLE "voting_notifications" ADD CONSTRAINT "valid_notification_type" CHECK ("voting_notifications"."type" IN ('session_started', 'session_ending', 'results_available', 'quorum_reached', 'vote_reminder')) NOT VALID;--> statement-breakpoint
ALTER TABLE "voting_notifications" DROP CONSTRAINT IF EXISTS "valid_priority";--> statement-breakpoint
ALTER TABLE "voting_notifications" ADD CONSTRAINT "valid_priority" CHECK ("voting_notifications"."priority" IN ('low', 'medium', 'high', 'urgent')) NOT VALID;--> statement-breakpoint
ALTER TABLE "voting_sessions" DROP CONSTRAINT IF EXISTS "valid_type";--> statement-breakpoint
ALTER TABLE "voting_sessions" ADD CONSTRAINT "valid_type" CHECK ("voting_sessions"."type" IN ('convention', 'ratification', 'special_vote')) NOT VALID;--> statement-breakpoint
ALTER TABLE "voting_sessions" DROP CONSTRAINT IF EXISTS "valid_status";--> statement-breakpoint
ALTER TABLE "voting_sessions" ADD CONSTRAINT "valid_status" CHECK ("voting_sessions"."status" IN ('draft', 'active', 'paused', 'closed', 'cancelled')) NOT VALID;--> statement-breakpoint
ALTER TABLE "voting_sessions" DROP CONSTRAINT IF EXISTS "valid_meeting_type";--> statement-breakpoint
ALTER TABLE "voting_sessions" ADD CONSTRAINT "valid_meeting_type" CHECK ("voting_sessions"."meeting_type" IN ('convention', 'ratification', 'emergency', 'special')) NOT VALID;--> statement-breakpoint
ALTER TABLE "voting_sessions" DROP CONSTRAINT IF EXISTS "valid_time_range";--> statement-breakpoint
ALTER TABLE "voting_sessions" ADD CONSTRAINT "valid_time_range" CHECK ("voting_sessions"."end_time" IS NULL OR "voting_sessions"."start_time" IS NULL OR "voting_sessions"."end_time" > "voting_sessions"."start_time") NOT VALID;--> statement-breakpoint
ALTER TABLE "voting_sessions" DROP CONSTRAINT IF EXISTS "valid_scheduled_end";--> statement-breakpoint
ALTER TABLE "voting_sessions" ADD CONSTRAINT "valid_scheduled_end" CHECK ("voting_sessions"."scheduled_end_time" IS NULL OR "voting_sessions"."scheduled_end_time" > "voting_sessions"."created_at") NOT VALID;--> statement-breakpoint
ALTER TABLE "voting_sessions" DROP CONSTRAINT IF EXISTS "valid_quorum";--> statement-breakpoint
ALTER TABLE "voting_sessions" ADD CONSTRAINT "valid_quorum" CHECK ("voting_sessions"."quorum_threshold" >= 0 AND "voting_sessions"."quorum_threshold" <= 100) NOT VALID;--> statement-breakpoint
ALTER TABLE "user_management"."user_sessions" DROP CONSTRAINT IF EXISTS "valid_expiry";--> statement-breakpoint
ALTER TABLE "user_management"."user_sessions" ADD CONSTRAINT "valid_expiry" CHECK ("user_management"."user_sessions"."expires_at" > "user_management"."user_sessions"."created_at") NOT VALID;--> statement-breakpoint
ALTER TABLE "user_management"."users" DROP CONSTRAINT IF EXISTS "valid_email";--> statement-breakpoint
ALTER TABLE "user_management"."users" ADD CONSTRAINT "valid_email" CHECK ("user_management"."users"."email" ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') NOT VALID;--> statement-breakpoint
ALTER TABLE "user_management"."users" DROP CONSTRAINT IF EXISTS "valid_phone";--> statement-breakpoint
ALTER TABLE "user_management"."users" ADD CONSTRAINT "valid_phone" CHECK ("user_management"."users"."phone" IS NULL OR "user_management"."users"."phone" ~ '^\+?[1-9]\d{1,14}$') NOT VALID;--> statement-breakpoint
ALTER TABLE "tenant_management"."database_pools" DROP CONSTRAINT IF EXISTS "valid_health_status";--> statement-breakpoint
ALTER TABLE "tenant_management"."database_pools" ADD CONSTRAINT "valid_health_status" CHECK ("tenant_management"."database_pools"."health_status" IN ('healthy', 'degraded', 'unhealthy')) NOT VALID;--> statement-breakpoint
ALTER TABLE "tenant_management"."database_pools" DROP CONSTRAINT IF EXISTS "valid_pool_size";--> statement-breakpoint
ALTER TABLE "tenant_management"."database_pools" ADD CONSTRAINT "valid_pool_size" CHECK ("tenant_management"."database_pools"."min_connections" <= "tenant_management"."database_pools"."pool_size" AND "tenant_management"."database_pools"."pool_size" <= "tenant_management"."database_pools"."max_connections") NOT VALID;--> statement-breakpoint
ALTER TABLE "tenant_management"."tenant_usage" DROP CONSTRAINT IF EXISTS "valid_period";--> statement-breakpoint
ALTER TABLE "tenant_management"."tenant_usage" ADD CONSTRAINT "valid_period" CHECK ("tenant_management"."tenant_usage"."period_end" > "tenant_management"."tenant_usage"."period_start") NOT VALID;--> statement-breakpoint
ALTER TABLE "tenant_management"."tenants" DROP CONSTRAINT IF EXISTS "valid_subscription_tier";--> statement-breakpoint
ALTER TABLE "tenant_management"."tenants" ADD CONSTRAINT "valid_subscription_tier" CHECK ("tenant_management"."tenants"."subscription_tier" IN ('free', 'basic', 'premium', 'enterprise')) NOT VALID;--> statement-breakpoint
ALTER TABLE "tenant_management"."tenants" DROP CONSTRAINT IF EXISTS "valid_status";--> statement-breakpoint
ALTER TABLE "tenant_management"."tenants" ADD CONSTRAINT "valid_status" CHECK ("tenant_management"."tenants"."status" IN ('active', 'suspended', 'cancelled', 'trial')) NOT VALID;--> statement-breakpoint
ALTER TABLE "audit_security"."audit_logs" DROP CONSTRAINT IF EXISTS "valid_action";--> statement-breakpoint
ALTER TABLE "audit_security"."audit_logs" ADD CONSTRAINT "valid_action" CHECK ("audit_security"."audit_logs"."action" != '') NOT VALID;--> statement-breakpoint
ALTER TABLE "audit_security"."audit_logs" DROP CONSTRAINT IF EXISTS "valid_severity";--> statement-breakpoint
ALTER TABLE "audit_security"."audit_logs" ADD CONSTRAINT "valid_severity" CHECK ("audit_security"."audit_logs"."severity" IN ('debug', 'info', 'warning', 'error', 'critical')) NOT VALID;--> statement-breakpoint
ALTER TABLE "audit_security"."audit_logs" DROP CONSTRAINT IF EXISTS "valid_outcome";--> statement-breakpoint
ALTER TABLE "audit_security"."audit_logs" ADD CONSTRAINT "valid_outcome" CHECK ("audit_security"."audit_logs"."outcome" IN ('success', 'failure', 'error')) NOT VALID;--> statement-breakpoint
ALTER TABLE "audit_security"."failed_login_attempts" DROP CONSTRAINT IF EXISTS "recent_attempts";--> statement-breakpoint
ALTER TABLE "audit_security"."failed_login_attempts" ADD CONSTRAINT "recent_attempts" CHECK ("audit_security"."failed_login_attempts"."attempted_at" > NOW() - INTERVAL '30 days') NOT VALID;--> statement-breakpoint
ALTER TABLE "audit_security"."rate_limit_events" DROP CONSTRAINT IF EXISTS "valid_identifier_type";--> statement-breakpoint
ALTER TABLE "audit_security"."rate_limit_events" ADD CONSTRAINT "valid_identifier_type" CHECK ("audit_security"."rate_limit_events"."identifier_type" IN ('ip', 'user', 'api_key')) NOT VALID;--> statement-breakpoint
ALTER TABLE "audit_security"."security_events" DROP CONSTRAINT IF EXISTS "valid_event_category";--> statement-breakpoint
ALTER TABLE "audit_security"."security_events" ADD CONSTRAINT "valid_event_category" CHECK ("audit_security"."security_events"."event_category" IN ('authentication', 'authorization', 'data_access', 'configuration', 'suspicious')) NOT VALID;--> statement-breakpoint
ALTER TABLE "audit_security"."security_events" DROP CONSTRAINT IF EXISTS "valid_severity";--> statement-breakpoint
ALTER TABLE "audit_security"."security_events" ADD CONSTRAINT "valid_severity" CHECK ("audit_security"."security_events"."severity" IN ('low', 'medium', 'high', 'critical')) NOT VALID;--> statement-breakpoint
ALTER TABLE "audit_security"."security_events" DROP CONSTRAINT IF EXISTS "valid_risk_score";--> statement-breakpoint
ALTER TABLE "audit_security"."security_events" ADD CONSTRAINT "valid_risk_score" CHECK ("audit_security"."security_events"."risk_score" BETWEEN 0 AND 100) NOT VALID;--> statement-breakpoint
ALTER TABLE "sms_templates" DROP CONSTRAINT IF EXISTS "sms_template_message_length";--> statement-breakpoint
ALTER TABLE "sms_templates" ADD CONSTRAINT "sms_template_message_length" CHECK (char_length(message_template) <= 1600) NOT VALID;--> statement-breakpoint
ALTER TABLE "recognition_award_types" DROP CONSTRAINT IF EXISTS "award_type_credit_amount_positive";--> statement-breakpoint
ALTER TABLE "recognition_award_types" ADD CONSTRAINT "award_type_credit_amount_positive" CHECK ("recognition_award_types"."default_credit_amount" > 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "reward_budget_envelopes" DROP CONSTRAINT IF EXISTS "budget_limit_positive";--> statement-breakpoint
ALTER TABLE "reward_budget_envelopes" ADD CONSTRAINT "budget_limit_positive" CHECK ("reward_budget_envelopes"."amount_limit" > 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "reward_budget_envelopes" DROP CONSTRAINT IF EXISTS "budget_used_valid";--> statement-breakpoint
ALTER TABLE "reward_budget_envelopes" ADD CONSTRAINT "budget_used_valid" CHECK ("reward_budget_envelopes"."amount_used" >= 0 AND "reward_budget_envelopes"."amount_used" <= "reward_budget_envelopes"."amount_limit") NOT VALID;--> statement-breakpoint
ALTER TABLE "reward_budget_envelopes" DROP CONSTRAINT IF EXISTS "budget_dates_valid";--> statement-breakpoint
ALTER TABLE "reward_budget_envelopes" ADD CONSTRAINT "budget_dates_valid" CHECK ("reward_budget_envelopes"."ends_at" > "reward_budget_envelopes"."starts_at") NOT VALID;--> statement-breakpoint
ALTER TABLE "reward_redemptions" DROP CONSTRAINT IF EXISTS "redemption_credits_positive";--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "redemption_credits_positive" CHECK ("reward_redemptions"."credits_spent" > 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "reward_wallet_ledger" DROP CONSTRAINT IF EXISTS "wallet_balance_non_negative";--> statement-breakpoint
ALTER TABLE "reward_wallet_ledger" ADD CONSTRAINT "wallet_balance_non_negative" CHECK ("reward_wallet_ledger"."balance_after" >= 0) NOT VALID;