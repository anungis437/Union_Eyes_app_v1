-- Phase 5B: Inter-Union Features - Database Migration
-- Created: November 19, 2025
-- Purpose: Add Shared Clause Library and Arbitration Precedents tables

-- ============================================================================
-- SHARED CLAUSE LIBRARY
-- ============================================================================

CREATE TABLE IF NOT EXISTS "shared_clause_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_organization_id" uuid NOT NULL,
	"source_cba_id" uuid,
	"original_clause_id" uuid,
	"clause_number" varchar(50),
	"clause_title" varchar(500) NOT NULL,
	"clause_text" text NOT NULL,
	"clause_type" varchar(100) NOT NULL,
	"is_anonymized" boolean DEFAULT false,
	"original_employer_name" varchar(200),
	"anonymized_employer_name" varchar(200),
	"sharing_level" varchar(50) DEFAULT 'private' NOT NULL,
	"shared_with_org_ids" uuid[],
	"effective_date" date,
	"expiry_date" date,
	"sector" varchar(100),
	"province" varchar(2),
	"view_count" integer DEFAULT 0,
	"citation_count" integer DEFAULT 0,
	"comparison_count" integer DEFAULT 0,
	"version" integer DEFAULT 1,
	"previous_version_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Clause Library Tags
CREATE TABLE IF NOT EXISTS "clause_library_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clause_id" uuid NOT NULL,
	"tag_name" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Clause Comparisons History
CREATE TABLE IF NOT EXISTS "clause_comparisons_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"clause_ids" uuid[] NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================================================
-- ARBITRATION PRECEDENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "arbitration_precedents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_organization_id" uuid NOT NULL,
	"source_decision_id" uuid,
	"case_number" varchar(100),
	"case_title" varchar(500) NOT NULL,
	"decision_date" date NOT NULL,
	"is_parties_anonymized" boolean DEFAULT false,
	"union_name" varchar(200),
	"employer_name" varchar(200),
	"arbitrator_name" varchar(200) NOT NULL,
	"tribunal" varchar(200),
	"jurisdiction" varchar(50) NOT NULL,
	"grievance_type" varchar(100) NOT NULL,
	"issue_summary" text NOT NULL,
	"union_position" text,
	"employer_position" text,
	"outcome" varchar(50) NOT NULL,
	"decision_summary" text NOT NULL,
	"reasoning" text,
	"precedential_value" varchar(20) DEFAULT 'medium',
	"key_principles" text[],
	"related_legislation" text,
	"document_url" varchar(500),
	"document_path" varchar(500),
	"sharing_level" varchar(50) DEFAULT 'private' NOT NULL,
	"shared_with_org_ids" uuid[],
	"sector" varchar(100),
	"province" varchar(2),
	"view_count" integer DEFAULT 0,
	"citation_count" integer DEFAULT 0,
	"download_count" integer DEFAULT 0,
	"has_redacted_version" boolean DEFAULT false,
	"redacted_document_url" varchar(500),
	"redacted_document_path" varchar(500),
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Precedent Tags
CREATE TABLE IF NOT EXISTS "precedent_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"precedent_id" uuid NOT NULL,
	"tag_name" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Precedent Citations
CREATE TABLE IF NOT EXISTS "precedent_citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"precedent_id" uuid NOT NULL,
	"cited_by_precedent_id" uuid,
	"citing_claim_id" uuid,
	"citation_context" text,
	"citation_weight" varchar(20) DEFAULT 'supporting',
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================================================
-- SHARING & PERMISSIONS
-- ============================================================================

-- Organization Sharing Settings
CREATE TABLE IF NOT EXISTS "organization_sharing_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL UNIQUE,
	"allow_federation_sharing" boolean DEFAULT false,
	"allow_sector_sharing" boolean DEFAULT false,
	"allow_province_sharing" boolean DEFAULT false,
	"allow_congress_sharing" boolean DEFAULT false,
	"auto_share_clauses" boolean DEFAULT false,
	"auto_share_precedents" boolean DEFAULT false,
	"require_anonymization" boolean DEFAULT true,
	"default_sharing_level" varchar(50) DEFAULT 'private',
	"allowed_sharing_levels" varchar(50)[],
	"sharing_approval_required" boolean DEFAULT true,
	"sharing_approver_role" varchar(50) DEFAULT 'admin',
	"max_shared_clauses" integer,
	"max_shared_precedents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Organization Sharing Grants
CREATE TABLE IF NOT EXISTS "organization_sharing_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"granter_org_id" uuid NOT NULL,
	"grantee_org_id" uuid NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" uuid NOT NULL,
	"access_level" varchar(50) NOT NULL,
	"expires_at" timestamp with time zone,
	"can_reshare" boolean DEFAULT false,
	"granted_by" uuid NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"access_count" integer DEFAULT 0,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Cross-Organization Access Log
CREATE TABLE IF NOT EXISTS "cross_org_access_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_organization_id" uuid NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" uuid NOT NULL,
	"resource_organization_id" uuid NOT NULL,
	"access_type" varchar(50) NOT NULL,
	"access_granted_via" varchar(50),
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

-- Note: Only adding FKs for tables that exist. organizations table may not exist yet.
-- If organizations table exists, uncomment these lines:

-- ALTER TABLE "shared_clause_library" 
--   ADD CONSTRAINT "shared_clause_library_source_organization_id_organizations_id_fk" 
--   FOREIGN KEY ("source_organization_id") REFERENCES "public"."organizations"("id") 
--   ON DELETE cascade ON UPDATE no action;

-- ALTER TABLE "shared_clause_library" 
--   ADD CONSTRAINT "shared_clause_library_source_cba_id_collective_agreements_id_fk" 
--   FOREIGN KEY ("source_cba_id") REFERENCES "public"."collective_agreements"("id") 
--   ON DELETE no action ON UPDATE no action;

ALTER TABLE "shared_clause_library" 
  ADD CONSTRAINT "shared_clause_library_previous_version_id_shared_clause_library_id_fk" 
  FOREIGN KEY ("previous_version_id") REFERENCES "public"."shared_clause_library"("id") 
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "clause_library_tags" 
  ADD CONSTRAINT "clause_library_tags_clause_id_shared_clause_library_id_fk" 
  FOREIGN KEY ("clause_id") REFERENCES "public"."shared_clause_library"("id") 
  ON DELETE cascade ON UPDATE no action;

-- ALTER TABLE "arbitration_precedents" 
--   ADD CONSTRAINT "arbitration_precedents_source_organization_id_organizations_id_fk" 
--   FOREIGN KEY ("source_organization_id") REFERENCES "public"."organizations"("id") 
--   ON DELETE cascade ON UPDATE no action;

-- ALTER TABLE "arbitration_precedents" 
--   ADD CONSTRAINT "arbitration_precedents_source_decision_id_arbitration_decisions_id_fk" 
--   FOREIGN KEY ("source_decision_id") REFERENCES "public"."arbitration_decisions"("id") 
--   ON DELETE no action ON UPDATE no action;

ALTER TABLE "precedent_tags" 
  ADD CONSTRAINT "precedent_tags_precedent_id_arbitration_precedents_id_fk" 
  FOREIGN KEY ("precedent_id") REFERENCES "public"."arbitration_precedents"("id") 
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "precedent_citations" 
  ADD CONSTRAINT "precedent_citations_precedent_id_arbitration_precedents_id_fk" 
  FOREIGN KEY ("precedent_id") REFERENCES "public"."arbitration_precedents"("id") 
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "precedent_citations" 
  ADD CONSTRAINT "precedent_citations_cited_by_precedent_id_arbitration_precedents_id_fk" 
  FOREIGN KEY ("cited_by_precedent_id") REFERENCES "public"."arbitration_precedents"("id") 
  ON DELETE cascade ON UPDATE no action;

-- ALTER TABLE "organization_sharing_settings" 
--   ADD CONSTRAINT "organization_sharing_settings_organization_id_organizations_id_fk" 
--   FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") 
--   ON DELETE cascade ON UPDATE no action;

-- ALTER TABLE "organization_sharing_grants" 
--   ADD CONSTRAINT "organization_sharing_grants_granter_org_id_organizations_id_fk" 
--   FOREIGN KEY ("granter_org_id") REFERENCES "public"."organizations"("id") 
--   ON DELETE cascade ON UPDATE no action;

-- ALTER TABLE "organization_sharing_grants" 
--   ADD CONSTRAINT "organization_sharing_grants_grantee_org_id_organizations_id_fk" 
--   FOREIGN KEY ("grantee_org_id") REFERENCES "public"."organizations"("id") 
--   ON DELETE cascade ON UPDATE no action;

-- ALTER TABLE "cross_org_access_log" 
--   ADD CONSTRAINT "cross_org_access_log_user_organization_id_organizations_id_fk" 
--   FOREIGN KEY ("user_organization_id") REFERENCES "public"."organizations"("id") 
--   ON DELETE cascade ON UPDATE no action;

-- ALTER TABLE "cross_org_access_log" 
--   ADD CONSTRAINT "cross_org_access_log_resource_organization_id_organizations_id_fk" 
--   FOREIGN KEY ("resource_organization_id") REFERENCES "public"."organizations"("id") 
--   ON DELETE cascade ON UPDATE no action;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS "idx_shared_clauses_org" ON "shared_clause_library" USING btree ("source_organization_id");
CREATE INDEX IF NOT EXISTS "idx_shared_clauses_type" ON "shared_clause_library" USING btree ("clause_type");
CREATE INDEX IF NOT EXISTS "idx_shared_clauses_sharing" ON "shared_clause_library" USING btree ("sharing_level");
CREATE INDEX IF NOT EXISTS "idx_shared_clauses_sector" ON "shared_clause_library" USING btree ("sector");
CREATE INDEX IF NOT EXISTS "idx_shared_clauses_province" ON "shared_clause_library" USING btree ("province");

CREATE INDEX IF NOT EXISTS "idx_clause_tags_clause" ON "clause_library_tags" USING btree ("clause_id");
CREATE INDEX IF NOT EXISTS "idx_clause_tags_tag" ON "clause_library_tags" USING btree ("tag_name");

CREATE INDEX IF NOT EXISTS "idx_clause_comparisons_user" ON "clause_comparisons_history" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_clause_comparisons_created" ON "clause_comparisons_history" USING btree ("created_at");

CREATE INDEX IF NOT EXISTS "idx_precedents_org" ON "arbitration_precedents" USING btree ("source_organization_id");
CREATE INDEX IF NOT EXISTS "idx_precedents_type" ON "arbitration_precedents" USING btree ("grievance_type");
CREATE INDEX IF NOT EXISTS "idx_precedents_outcome" ON "arbitration_precedents" USING btree ("outcome");
CREATE INDEX IF NOT EXISTS "idx_precedents_date" ON "arbitration_precedents" USING btree ("decision_date");
CREATE INDEX IF NOT EXISTS "idx_precedents_sharing" ON "arbitration_precedents" USING btree ("sharing_level");
CREATE INDEX IF NOT EXISTS "idx_precedents_sector" ON "arbitration_precedents" USING btree ("sector");
CREATE INDEX IF NOT EXISTS "idx_precedents_province" ON "arbitration_precedents" USING btree ("province");
CREATE INDEX IF NOT EXISTS "idx_precedents_jurisdiction" ON "arbitration_precedents" USING btree ("jurisdiction");

CREATE INDEX IF NOT EXISTS "idx_precedent_tags_precedent" ON "precedent_tags" USING btree ("precedent_id");
CREATE INDEX IF NOT EXISTS "idx_precedent_tags_tag" ON "precedent_tags" USING btree ("tag_name");

CREATE INDEX IF NOT EXISTS "idx_precedent_citations_precedent" ON "precedent_citations" USING btree ("precedent_id");
CREATE INDEX IF NOT EXISTS "idx_precedent_citations_cited_by" ON "precedent_citations" USING btree ("cited_by_precedent_id");
CREATE INDEX IF NOT EXISTS "idx_precedent_citations_claim" ON "precedent_citations" USING btree ("citing_claim_id");

CREATE INDEX IF NOT EXISTS "idx_sharing_settings_org" ON "organization_sharing_settings" USING btree ("organization_id");

CREATE INDEX IF NOT EXISTS "idx_sharing_grants_granter" ON "organization_sharing_grants" USING btree ("granter_org_id");
CREATE INDEX IF NOT EXISTS "idx_sharing_grants_grantee" ON "organization_sharing_grants" USING btree ("grantee_org_id");
CREATE INDEX IF NOT EXISTS "idx_sharing_grants_resource" ON "organization_sharing_grants" USING btree ("resource_type","resource_id");
CREATE INDEX IF NOT EXISTS "idx_sharing_grants_expires" ON "organization_sharing_grants" USING btree ("expires_at");

CREATE INDEX IF NOT EXISTS "idx_access_log_user" ON "cross_org_access_log" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_access_log_user_org" ON "cross_org_access_log" USING btree ("user_organization_id");
CREATE INDEX IF NOT EXISTS "idx_access_log_resource" ON "cross_org_access_log" USING btree ("resource_type","resource_id");
CREATE INDEX IF NOT EXISTS "idx_access_log_resource_org" ON "cross_org_access_log" USING btree ("resource_organization_id");
CREATE INDEX IF NOT EXISTS "idx_access_log_created" ON "cross_org_access_log" USING btree ("created_at");
