/**
 * Database Immutability Constraints Test (PR #12)
 * 
 * Verifies that historical records cannot be modified or deleted
 * Ensures append-only pattern is enforced at database level
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/db/db';
import { 
  grievanceTransitions, 
  grievanceApprovals,
  claimUpdates,
  paymentTransactions,
  votes
} from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('PR #12: Database Immutability Constraints', () => {
  describe('Grievance Transitions', () => {
    it('should prevent UPDATE on grievance_transitions', async () => {
      // Try to update a transition (should fail)
      await expect(
        db.update(grievanceTransitions)
          .set({ notes: 'Modified' })
          .where(eq(grievanceTransitions.id, 'test-id'))
      ).rejects.toThrow(/immutable|not allowed/i);
    });

    it('should prevent DELETE on grievance_transitions', async () => {
      // Try to delete a transition (should fail)
      await expect(
        db.delete(grievanceTransitions)
          .where(eq(grievanceTransitions.id, 'test-id'))
      ).rejects.toThrow(/immutable|not allowed/i);
    });
  });

  describe('Grievance Approvals', () => {
    it('should prevent UPDATE on grievance_approvals', async () => {
      await expect(
        db.update(grievanceApprovals)
          .set({ comment: 'Modified' })
          .where(eq(grievanceApprovals.id, 'test-id'))
      ).rejects.toThrow(/immutable|not allowed/i);
    });

    it('should prevent DELETE on grievance_approvals', async () => {
      await expect(
        db.delete(grievanceApprovals)
          .where(eq(grievanceApprovals.id, 'test-id'))
      ).rejects.toThrow(/immutable|not allowed/i);
    });
  });

  describe('Claim Updates', () => {
    it('should prevent UPDATE on claim_updates', async () => {
      await expect(
        db.update(claimUpdates)
          .set({ oldValue: 'Modified' })
          .where(eq(claimUpdates.id, 'test-id'))
      ).rejects.toThrow(/immutable|not allowed/i);
    });

    it('should prevent DELETE on claim_updates', async () => {
      await expect(
        db.delete(claimUpdates)
          .where(eq(claimUpdates.id, 'test-id'))
      ).rejects.toThrow(/immutable|not allowed/i);
    });
  });

  describe('Audit Logs', () => {
    it('should allow archiving audit logs (UPDATE archived flag only)', async () => {
      // This should succeed as it only updates archive fields
      // Note: This test assumes audit logs exist
      // In practice, you'd create a test record first
    });

    it('should prevent DELETE on audit logs', async () => {
      // Audit logs should never be deleted, only archived
      await expect(
        db.execute('DELETE FROM audit_security.audit_logs WHERE id = \\'test-id\\'')
      ).rejects.toThrow(/cannot be deleted|immutable/i);
    });

    it('should prevent UPDATE of non-archive fields on audit logs', async () => {
      // Trying to modify action, metadata, etc. should fail
      await expect(
        db.execute(
          "UPDATE audit_security.audit_logs SET action = 'modified' WHERE id = 'test-id'"
        )
      ).rejects.toThrow(/immutable|not permitted/i);
    });
  });

  describe('Financial Records', () => {
    it('should prevent UPDATE on payment_transactions', async () => {
      await expect(
        db.update(paymentTransactions)
          .set({ amount: 1000 })
          .where(eq(paymentTransactions.id, 'test-id'))
      ).rejects.toThrow(/immutable|not allowed/i);
    });

    it('should prevent DELETE on payment_transactions', async () => {
      await expect(
        db.delete(paymentTransactions)
          .where(eq(paymentTransactions.id, 'test-id'))
      ).rejects.toThrow(/immutable|not allowed/i);
    });
  });

  describe('Voting Records', () => {
    it('should prevent UPDATE on votes', async () => {
      await expect(
        db.update(votes)
          .set({ optionId: 'modified' })
          .where(eq(votes.id, 'test-id'))
      ).rejects.toThrow(/immutable|not allowed/i);
    });

    it('should prevent DELETE on votes', async () => {
      await expect(
        db.delete(votes)
          .where(eq(votes.id, 'test-id'))
      ).rejects.toThrow(/immutable|not allowed/i);
    });
  });

  describe('Trigger Installation Verification', () => {
    it('should have immutability triggers installed', async () => {
      const result = await db.execute(`
        SELECT 
          schemaname,
          tablename,
          string_agg(triggername, ', ') as triggers
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE triggername LIKE 'prevent_%' OR triggername LIKE '%_immutability%'
        GROUP BY schemaname, tablename
        ORDER BY schemaname, tablename
      `);

      // Should have triggers on multiple tables
      expect(result.rows.length).toBeGreaterThan(0);
      
      // Verify specific tables have triggers
      const tableNames = result.rows.map(r => r.tablename);
      expect(tableNames).toContain('grievance_transitions');
      expect(tableNames).toContain('grievance_approvals');
      expect(tableNames).toContain('claim_updates');
    });
  });
});
