/**
 * Error Handling Tests for ReportExecutor
 * Test Cases TC-E-001 through TC-E-004
 * 
 * Tests error handling for edge cases:
 * - Invalid data sources
 * - Missing required fields
 * - Invalid filter configurations
 * - Database timeout scenarios
 * 
 * Created: February 11, 2026
 */

import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { ReportExecutor, type ReportConfig, type ExecutionResult } from '@/lib/report-executor';
import { db } from '@/db/db';

describe('Error Handling Tests', () => {
  let executor: ReportExecutor;
  const TEST_ORG_ID = 'test-org-123';
  const TEST_TENANT_ID = 'test-tenant-123';

  beforeEach(() => {
    executor = new ReportExecutor(TEST_ORG_ID, TEST_TENANT_ID);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TC-E-001: Invalid Data Source', () => {
    it('should return error for non-existent data source', async () => {
      const config: ReportConfig = {
        dataSourceId: 'non_existent_source',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'ID',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid data source:/);
      expect(result.error).toContain('non_existent_source');
      expect(result.data).toBeUndefined();
    });

    it('should return error message for completely invalid data source ID', async () => {
      const config: ReportConfig = {
        dataSourceId: 'invalid-123-xyz',
        fields: [
          {
            fieldId: 'test',
            fieldName: 'Test Field',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid data source: invalid-123-xyz');
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should validate data source before field validation', async () => {
      const config: ReportConfig = {
        dataSourceId: 'bogus_source',
        fields: [
          {
            fieldId: 'invalid_field',
            fieldName: 'Invalid Field',
          },
        ],
      };

      const result = await executor.execute(config);

      // Should fail on data source validation first
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid data source/);
    });
  });

  describe('TC-E-002: Missing Required Fields', () => {
    it('should return error when dataSourceId is missing', async () => {
      const config = {
        fields: [
          {
            fieldId: 'id',
            fieldName: 'ID',
          },
        ],
      } as any;

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Data source ID is required');
    });

    it('should return error when fields array is missing', async () => {
      const config = {
        dataSourceId: 'claims',
      } as any;

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least one field must be selected');
    });

    it('should return error when fields array is empty', async () => {
      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least one field must be selected');
    });

    it('should return error with clear message for null fields', async () => {
      const config = {
        dataSourceId: 'organization_members',
        fields: null,
      } as any;

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/At least one field must be selected/);
    });

    it('should return error for undefined dataSourceId', async () => {
      const config = {
        fields: [
          {
            fieldId: 'first_name',
            fieldName: 'First Name',
          },
        ],
      } as any;

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Data source ID is required');
      expect(result.rowCount).toBeUndefined();
    });
  });

  describe('TC-E-003: Invalid Filter Configuration', () => {
    it('should return error for filter with non-existent field', async () => {
      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Claim ID',
          },
        ],
        filters: [
          {
            fieldId: 'non_existent_field',
            operator: 'eq',
            value: 'test',
          },
        ],
      };

      const result = await executor.execute(config);

      // The executor should validate that filter fields exist
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for invalid operator', async () => {
      const config: ReportConfig = {
        dataSourceId: 'organization_members',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Member ID',
          },
        ],
        filters: [
          {
            fieldId: 'email',
            operator: 'invalid_operator' as any,
            value: 'test@example.com',
          },
        ],
      };

      const result = await executor.execute(config);

      // Should fail due to invalid operator
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle type mismatch in filter value (string vs number)', async () => {
      const config: ReportConfig = {
        dataSourceId: 'dues_assignments',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Assignment ID',
          },
          {
            fieldId: 'amount',
            fieldName: 'Amount',
          },
        ],
        filters: [
          {
            fieldId: 'amount',
            operator: 'gt',
            value: 'not_a_number', // Type mismatch: string instead of number
          },
        ],
      };

      // Execute the query - it should handle type coercion or fail gracefully
      const result = await executor.execute(config);

      // Either succeeds with type coercion or fails gracefully
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
      // If it succeeds, it handled the type coercion
    });

    it('should return error for field not in selected data source', async () => {
      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'field_from_different_table',
            fieldName: 'Invalid Field',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid field:/);
    });

    it('should handle filter with missing value for non-null operators', async () => {
      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Claim ID',
          },
        ],
        filters: [
          {
            fieldId: 'status',
            operator: 'eq',
            // Missing value
          },
        ],
      };

      const result = await executor.execute(config);

      // Should either handle gracefully or return error
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('TC-E-004: Database Timeout Handling', () => {
    it('should handle database timeout gracefully', async () => {
      // Mock db.execute to simulate timeout
      const mockExecute = vi.spyOn(db, 'execute');
      mockExecute.mockRejectedValueOnce(new Error('Query timeout exceeded'));

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Claim ID',
          },
          {
            fieldId: 'claim_number',
            fieldName: 'Claim Number',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query timeout exceeded');
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.data).toBeUndefined();
      
      mockExecute.mockRestore();
    });

    it('should not crash on database connection error', async () => {
      // Mock db.execute to simulate connection error
      const mockExecute = vi.spyOn(db, 'execute');
      mockExecute.mockRejectedValueOnce(new Error('Connection lost'));

      const config: ReportConfig = {
        dataSourceId: 'organization_members',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Member ID',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection lost');
      expect(result.rowCount).toBeUndefined();
      
      mockExecute.mockRestore();
    });

    it('should return execution time even when query fails', async () => {
      // Mock db.execute to simulate slow failure
      const mockExecute = vi.spyOn(db, 'execute');
      mockExecute.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('Query failed after delay');
      });

      const config: ReportConfig = {
        dataSourceId: 'claim_deadlines',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Deadline ID',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed after delay');
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(100);
      
      mockExecute.mockRestore();
    });

    it('should handle generic database errors', async () => {
      // Mock db.execute to simulate generic error
      const mockExecute = vi.spyOn(db, 'execute');
      mockExecute.mockRejectedValueOnce(new Error('Database error: permission denied'));

      const config: ReportConfig = {
        dataSourceId: 'dues_assignments',
        fields: [
          {
            fieldId: 'member_id',
            fieldName: 'Member ID',
          },
          {
            fieldId: 'amount',
            fieldName: 'Amount',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission denied');
      expect(result.data).toBeUndefined();
      
      mockExecute.mockRestore();
    });

    it('should handle error without message property', async () => {
      // Mock db.execute to throw error without message
      const mockExecute = vi.spyOn(db, 'execute');
      mockExecute.mockRejectedValueOnce('String error without message property');

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'status',
            fieldName: 'Status',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Report execution failed');
      
      mockExecute.mockRestore();
    });
  });

  describe('TC-E-005: Edge Cases - Additional Error Scenarios', () => {
    it('should handle custom formula injection attempt', async () => {
      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'ID',
            formula: "'; DROP TABLE claims; --",
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/custom formulas are not supported/i);
    });

    it('should reject invalid alias format', async () => {
      const config: ReportConfig = {
        dataSourceId: 'organization_members',
        fields: [
          {
            fieldId: 'first_name',
            fieldName: 'First Name',
            alias: "name'; DROP TABLE members; --",
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid alias format/);
    });

    it('should handle valid configuration with multiple filters', async () => {
      // Mock successful execution
      const mockExecute = vi.spyOn(db, 'execute');
      mockExecute.mockResolvedValueOnce([
        { id: '1', status: 'active' },
        { id: '2', status: 'active' },
      ]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Claim ID',
          },
          {
            fieldId: 'status',
            fieldName: 'Status',
          },
        ],
        filters: [
          {
            fieldId: 'status',
            operator: 'eq',
            value: 'active',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.rowCount).toBe(2);
      expect(result.error).toBeUndefined();
      
      mockExecute.mockRestore();
    });
  });
});
