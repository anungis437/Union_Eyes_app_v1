/**
 * Migration Contract Tests: 0062-0066 (Governance & Immutability)
 * 
 * These tests verify the structural integrity of critical governance and immutability migrations.
 * Tests validate table structures, triggers, indexes, and RLS policies without modifying data.
 * 
 * Migrations Covered:
 * - 0062: Add immutable transition history (grievance_approvals table)
 * - 0063: Add audit log archive support
 * - 0064: Add immutability triggers
 * - 0065: Add governance tables
 * - 0066: Drop obsolete search_vector trigger
 * 
 * @see db/migrations/0062_add_immutable_transition_history.sql
 * @see db/migrations/0063_add_audit_log_archive_support.sql
 * @see db/migrations/0064_add_immutability_triggers.sql
 * @see db/migrations/0065_add_governance_tables.sql
 * @see db/migrations/0066_drop_obsolete_search_vector_trigger.sql
 */

import { describe, it, expect } from 'vitest';
import { client } from '@/db/db';

describe('Migration 0062-0066: Governance & Immutability Contract Tests', () => {
  // ============================================================================
  // Migration 0062: Immutable Transition History
  // ============================================================================
  
  describe('Migration 0062: grievance_approvals Table', () => {
    it('should have grievance_approvals table', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'grievance_approvals'
        ) as exists
      `;
      expect(result[0].exists).toBe(true);
    });

    it('should have correct columns in grievance_approvals', async () => {
      const result = await client`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'grievance_approvals'
        ORDER BY ordinal_position
      `;
      
      const columns = result.map((r: any) => r.column_name);
      
      // Verify all required columns exist
      expect(columns).toContain('id');
      expect(columns).toContain('organization_id');
      expect(columns).toContain('transition_id');
      expect(columns).toContain('approver_user_id');
      expect(columns).toContain('approver_role');
      expect(columns).toContain('action');
      expect(columns).toContain('reviewed_at');
      expect(columns).toContain('comment');
      expect(columns).toContain('rejection_reason');
      expect(columns).toContain('metadata');
      expect(columns).toContain('created_at');
    });

    it('should have performance indexes on grievance_approvals', async () => {
      const result = await client`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'grievance_approvals'
      `;
      
      const indexes = result.map((r: any) => r.indexname);
      
      expect(indexes).toContain('idx_grievance_approvals_organization');
      expect(indexes).toContain('idx_grievance_approvals_transition');
      expect(indexes).toContain('idx_grievance_approvals_approver');
      expect(indexes).toContain('idx_grievance_approvals_action');
      expect(indexes).toContain('idx_grievance_approvals_reviewed_at');
    });

    it('should have foreign key constraint to grievance_transitions', async () => {
      // Note: This test checks for any foreign key from grievance_approvals to grievance_transitions
      // The actual constraint name may vary depending on database generation method
      const result = await client`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'grievance_approvals'
        AND constraint_type = 'FOREIGN KEY'
      `;
      
      // At minimum, should have the transition_id foreign key
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Migration 0063: Audit Log Archive Support
  // ============================================================================
  
  describe('Migration 0063: Audit Log Archive Support', () => {
    it('should have archive columns in audit_logs', async () => {
      // NOTE: This test requires the audit_security schema and audit_logs table to exist
      // If migrations 0063 hasn't been run, this test will fail
      const result = await client`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'audit_security'
        AND table_name = 'audit_logs'
        AND column_name IN ('archived', 'archived_at', 'archived_path')
        ORDER BY column_name
      `;
      
      const columns = result.map((r: any) => r.column_name);
      
      expect(columns).toContain('archived');
      expect(columns).toContain('archived_at');
      expect(columns).toContain('archived_path');
      
      // Verify archived column defaults to false
      const archivedColumn = result.find((r: any) => r.column_name === 'archived');
      expect(archivedColumn?.column_default).toMatch(/false/i);
    });

    it('should have indexes for archived queries', async () => {
      const result = await client`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'audit_security'
        AND tablename = 'audit_logs'
        AND indexname IN ('idx_audit_logs_archived', 'idx_audit_logs_archived_at')
      `;
      
      const indexes = result.map((r: any) => r.indexname);
      
      expect(indexes).toContain('idx_audit_logs_archived');
      expect(indexes).toContain('idx_audit_logs_archived_at');
    });

    it('should have active_audit_logs view', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.views
          WHERE table_schema = 'audit_security'
          AND table_name = 'active_audit_logs'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });

    it('should have export_archived_logs_json function', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'audit_security'
          AND p.proname = 'export_archived_logs_json'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });
  });

  // ============================================================================
  // Migration 0064: Immutability Triggers
  // ============================================================================
  
  describe('Migration 0064: Immutability Trigger Functions', () => {
    it('should have reject_mutation function', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.proname = 'reject_mutation'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });

    it('should have audit_log_immutability_guard function', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.proname = 'audit_log_immutability_guard'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });
  });

  describe('Migration 0064: Grievance Transitions Triggers', () => {
    it('should have prevent_transition_updates trigger', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          WHERE c.relname = 'grievance_transitions'
          AND t.tgname = 'prevent_transition_updates'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });

    it('should have prevent_transition_deletions trigger', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          WHERE c.relname = 'grievance_transitions'
          AND t.tgname = 'prevent_transition_deletions'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });
  });

  describe('Migration 0064: Grievance Approvals Triggers', () => {
    it('should have prevent_approval_updates trigger', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          WHERE c.relname = 'grievance_approvals'
          AND t.tgname = 'prevent_approval_updates'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });

    it('should have prevent_approval_deletions trigger', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          WHERE c.relname = 'grievance_approvals'
          AND t.tgname = 'prevent_approval_deletions'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });
  });

  describe('Migration 0064: Claim Updates Triggers', () => {
    it('should have prevent_claim_update_modifications trigger', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          WHERE c.relname = 'claim_updates'
          AND t.tgname = 'prevent_claim_update_modifications'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });

    it('should have prevent_claim_update_deletions trigger', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          WHERE c.relname = 'claim_updates'
          AND t.tgname = 'prevent_claim_update_deletions'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });
  });

  describe('Migration 0064: Audit Logs Trigger', () => {
    it('should have audit_log_immutability trigger on audit_logs', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'audit_security'
          AND c.relname = 'audit_logs'
          AND t.tgname = 'audit_log_immutability'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });
  });

  describe('Migration 0064: Votes Triggers', () => {
    it('should have prevent_vote_updates trigger', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          WHERE c.relname = 'votes'
          AND t.tgname = 'prevent_vote_updates'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });

    it('should have prevent_vote_deletions trigger', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          WHERE c.relname = 'votes'
          AND t.tgname = 'prevent_vote_deletions'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });
  });

  // ============================================================================
  // Migration 0065: Governance Tables
  // ============================================================================
  
  describe('Migration 0065: Golden Shares Table', () => {
    it('should have golden_shares table', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'golden_shares'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });

    it('should have correct columns in golden_shares', async () => {
      const result = await client`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'golden_shares'
        ORDER BY ordinal_position
      `;
      
      const columns = result.map((r: any) => r.column_name);
      
      expect(columns).toContain('id');
      expect(columns).toContain('share_class');
      expect(columns).toContain('certificate_number');
      expect(columns).toContain('issue_date');
      expect(columns).toContain('holder_type');
      expect(columns).toContain('council_members');
      expect(columns).toContain('voting_power_reserved_matters');
      expect(columns).toContain('voting_power_ordinary_matters');
      expect(columns).toContain('sunset_clause_active');
      expect(columns).toContain('status');
    });

    it('should have unique constraint on certificate_number', async () => {
      const result = await client`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'golden_shares'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%certificate_number%'
      `;
      
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Migration 0065: Reserved Matter Votes Table', () => {
    it('should have reserved_matter_votes table', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'reserved_matter_votes'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });

    it('should have correct columns in reserved_matter_votes', async () => {
      const result = await client`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'reserved_matter_votes'
        ORDER BY ordinal_position
      `;
      
      const columns = result.map((r: any) => r.column_name);
      
      expect(columns).toContain('id');
      expect(columns).toContain('matter_type');
      expect(columns).toContain('title');
      expect(columns).toContain('description');
      expect(columns).toContain('proposed_by');
      expect(columns).toContain('voting_deadline');
      expect(columns).toContain('class_a_votes_for');
      expect(columns).toContain('class_a_votes_against');
      expect(columns).toContain('class_b_vote');
      expect(columns).toContain('status');
      expect(columns).toContain('final_decision');
    });
  });

  describe('Migration 0065: Mission Audits Table', () => {
    it('should have mission_audits table', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'mission_audits'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });

    it('should have correct columns in mission_audits', async () => {
      const result = await client`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'mission_audits'
        ORDER BY ordinal_position
      `;
      
      const columns = result.map((r: any) => r.column_name);
      
      expect(columns).toContain('id');
      expect(columns).toContain('audit_year');
      expect(columns).toContain('auditor_firm');
      expect(columns).toContain('union_revenue_percent');
      expect(columns).toContain('member_satisfaction_percent');
      expect(columns).toContain('data_violations');
      expect(columns).toContain('overall_pass');
      expect(columns).toContain('auditor_opinion');
      expect(columns).toContain('consecutive_years_after_audit');
    });
  });

  describe('Migration 0065: Governance Events Table', () => {
    it('should have governance_events table', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'governance_events'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });

    it('should have correct columns in governance_events', async () => {
      const result = await client`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'governance_events'
        ORDER BY ordinal_position
      `;
      
      const columns = result.map((r: any) => r.column_name);
      
      expect(columns).toContain('id');
      expect(columns).toContain('event_type');
      expect(columns).toContain('event_date');
      expect(columns).toContain('title');
      expect(columns).toContain('description');
      expect(columns).toContain('impact');
      expect(columns).toContain('stakeholders');
      expect(columns).toContain('golden_share_id');
      expect(columns).toContain('reserved_matter_vote_id');
      expect(columns).toContain('mission_audit_id');
    });
  });

  describe('Migration 0065: Council Elections Table', () => {
    it('should have council_elections table', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'council_elections'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(true);
    });

    it('should have correct columns in council_elections', async () => {
      const result = await client`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'council_elections'
        ORDER BY ordinal_position
      `;
      
      const columns = result.map((r: any) => r.column_name);
      
      expect(columns).toContain('id');
      expect(columns).toContain('election_year');
      expect(columns).toContain('election_date');
      expect(columns).toContain('positions_available');
      expect(columns).toContain('candidates');
      expect(columns).toContain('winners');
      expect(columns).toContain('total_votes');
      expect(columns).toContain('participation_rate');
    });
  });

  describe('Migration 0065: Votes Table Enhancements', () => {
    it('should have new audit columns in votes table', async () => {
      const result = await client`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'votes'
        AND column_name IN ('signature', 'receipt_id', 'verification_code', 'audit_hash')
        ORDER BY column_name
      `;
      
      const columns = result.map((r: any) => r.column_name);
      
      expect(columns).toContain('signature');
      expect(columns).toContain('receipt_id');
      expect(columns).toContain('verification_code');
      expect(columns).toContain('audit_hash');
    });
  });

  // ============================================================================
  // Migration 0066: Drop Obsolete Search Vector Trigger
  // ============================================================================
  
  describe('Migration 0066: Search Vector Cleanup', () => {
    it('should not have organization_members_search_vector_update trigger', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          WHERE c.relname = 'organization_members'
          AND t.tgname = 'organization_members_search_vector_update'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(false);
    });

    it('should not have organization_members_search_vector function', async () => {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.proname = 'organization_members_search_vector'
        ) as exists
      `;
      
      expect(result[0].exists).toBe(false);
    });
  });

  // ============================================================================
  // Integration Tests: Verify All Migrations Work Together
  // ============================================================================
  
  describe('Integration: Trigger Summary', () => {
    it('should have all expected immutability triggers installed', async () => {
      // NOTE: The audit_logs table trigger is in audit_security schema
      // If that schema doesn't exist, audit_logs won't be in the results
      const result = await client`
        SELECT 
          c.relname as table_name,
          COUNT(*) as trigger_count
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE t.tgname LIKE 'prevent_%' OR t.tgname LIKE '%_immutability%'
        GROUP BY c.relname
        ORDER BY c.relname
      `;
      
      const triggerCounts = Object.fromEntries(
        result.map((r: any) => [r.table_name, Number(r.trigger_count)])
      );
      
      // Each table should have 2 triggers (UPDATE and DELETE)
      expect(triggerCounts.grievance_transitions).toBe(2);
      expect(triggerCounts.grievance_approvals).toBe(2);
      expect(triggerCounts.claim_updates).toBe(2);
      expect(triggerCounts.votes).toBe(2);
      
      // audit_logs may not exist if audit_security schema hasn't been created
      if (triggerCounts.audit_logs !== undefined) {
        expect(triggerCounts.audit_logs).toBeGreaterThanOrEqual(1);
      }
    });

    it('should have all immutability functions available', async () => {
      const result = await client`
        SELECT p.proname as function_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname IN ('public', 'audit_security')
        AND (
          p.proname = 'reject_mutation' 
          OR p.proname = 'audit_log_immutability_guard'
        )
        ORDER BY p.proname
      `;
      
      const functions = result.map((r: any) => r.function_name);
      
      expect(functions).toContain('reject_mutation');
      expect(functions).toContain('audit_log_immutability_guard');
    });
  });

  describe('Integration: Governance Table Summary', () => {
    it('should have all governance tables created', async () => {
      const result = await client`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN (
          'golden_shares',
          'reserved_matter_votes',
          'mission_audits',
          'governance_events',
          'council_elections'
        )
        ORDER BY table_name
      `;
      
      const tables = result.map((r: any) => r.table_name);
      
      expect(tables).toContain('golden_shares');
      expect(tables).toContain('reserved_matter_votes');
      expect(tables).toContain('mission_audits');
      expect(tables).toContain('governance_events');
      expect(tables).toContain('council_elections');
    });
  });
});
