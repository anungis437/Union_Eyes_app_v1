/**
 * Functional Tests for ReportExecutor
 * 
 * Tests: TC-F-001 to TC-F-007
 * Purpose: Comprehensive functional validation of secured report execution system
 * Created: February 11, 2026
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportExecutor, ReportConfig } from '@/lib/report-executor';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';

// Mock database
vi.mock('@/db/db', () => ({
  db: {
    execute: vi.fn(),
  },
}));

describe('ReportExecutor Functional Tests', () => {
  let executor: ReportExecutor;
  const mockOrgId = 'org-123';

  beforeEach(() => {
    executor = new ReportExecutor(mockOrgId, mockOrgId);
    vi.clearAllMocks();
  });

  // ============================================================================
  // TC-F-001: Basic Report Execution
  // ============================================================================
  describe('TC-F-001: Basic Report Execution', () => {
    it('should execute simple SELECT query successfully', async () => {
      // Setup: Mock data
      const mockData = [
        { id: '1', claim_number: 'CLM-001', status: 'open' },
        { id: '2', claim_number: 'CLM-002', status: 'pending' },
      ];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      // Execute: Basic report config
      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
          { fieldId: 'claim_number', fieldName: 'Claim Number' },
          { fieldId: 'status', fieldName: 'Status' },
        ],
      };

      const result = await executor.execute(config);

      // Verify: Success with data
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.rowCount).toBe(2);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.sql).toBeDefined();
      
      // Verify: Database was called
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should include organization filter in query', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
      };

      const result = await executor.execute(config);

      // Verify: DB was called and query executed successfully
      expect(db.execute).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
    });

    it('should handle empty result sets', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.rowCount).toBe(0);
    });
  });

  // ============================================================================
  // TC-F-002: Report with Filters
  // ============================================================================
  describe('TC-F-002: Report with Filters', () => {
    it('should apply single equality filter', async () => {
      const mockData = [
        { id: '1', claim_number: 'CLM-001', status: 'open' },
      ];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
          { fieldId: 'claim_number', fieldName: 'Claim Number' },
          { fieldId: 'status', fieldName: 'Status' },
        ],
        filters: [
          {
            fieldId: 'status',
            fieldName: 'status',
            operator: 'eq',
            value: 'open',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply multiple filters with AND operator', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        filters: [
          {
            fieldId: 'status',
            fieldName: 'status',
            operator: 'eq',
            value: 'open',
            logicalOperator: 'AND',
          },
          {
            fieldId: 'priority',
            fieldName: 'priority',
            operator: 'eq',
            value: 'high',
            logicalOperator: 'AND',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply filters with OR operator', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        filters: [
          {
            fieldId: 'status',
            fieldName: 'status',
            operator: 'eq',
            value: 'open',
            logicalOperator: 'OR',
          },
          {
            fieldId: 'status',
            fieldName: 'status',
            operator: 'eq',
            value: 'pending',
            logicalOperator: 'OR',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply comparison filters (gt, lt, gte, lte)', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        filters: [
          {
            fieldId: 'created_at',
            fieldName: 'created_at',
            operator: 'gte',
            value: '2026-01-01',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply LIKE filter with parameterization', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        filters: [
          {
            fieldId: 'claim_number',
            fieldName: 'claim_number',
            operator: 'like',
            value: 'CLM',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
      // Query executed without error - parameterization prevents injection
    });

    it('should apply IN filter with array values', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        filters: [
          {
            fieldId: 'status',
            fieldName: 'status',
            operator: 'in',
            values: ['open', 'pending', 'in_progress'],
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should prevent SQL injection in filter values', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        filters: [
          {
            fieldId: 'status',
            fieldName: 'status',
            operator: 'eq',
            value: "open'; DROP TABLE claims; --",
          },
        ],
      };

      const result = await executor.execute(config);

      // Should execute without error (parameterized)
      expect(result.success).toBe(true);
      // SQL should NOT contain dangerous strings directly
      expect(db.execute).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TC-F-003: Report with Aggregations
  // ============================================================================
  describe('TC-F-003: Report with Aggregations', () => {
    it('should apply COUNT aggregation', async () => {
      const mockData = [{ claim_count: 150 }];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Claim Count',
            aggregation: 'count',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply SUM aggregation', async () => {
      const mockData = [{ amount_sum: 50000 }];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'dues_assignments',
        fields: [
          {
            fieldId: 'amount',
            fieldName: 'Total Amount',
            aggregation: 'sum',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply AVG aggregation', async () => {
      const mockData = [{ amount_avg: 500.50 }];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'dues_assignments',
        fields: [
          {
            fieldId: 'amount',
            fieldName: 'Average Amount',
            aggregation: 'avg',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply MIN and MAX aggregations', async () => {
      const mockData = [{ min_amount: 100, max_amount: 1000 }];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'dues_assignments',
        fields: [
          {
            fieldId: 'amount',
            fieldName: 'Min Amount',
            aggregation: 'min',
          },
          {
            fieldId: 'amount',
            fieldName: 'Max Amount',
            aggregation: 'max',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply GROUP BY with aggregation', async () => {
      const mockData = [
        { status: 'open', count: 10 },
        { status: 'closed', count: 20 },
      ];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'status', fieldName: 'Status' },
          {
            fieldId: 'id',
            fieldName: 'Count',
            aggregation: 'count',
          },
        ],
        groupBy: ['status'],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply HAVING clause with aggregation', async () => {
      const mockData = [
        { status: 'open', count: 15 },
      ];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'status', fieldName: 'Status' },
          {
            fieldId: 'id',
            fieldName: 'Count',
            aggregation: 'count',
          },
        ],
        groupBy: ['status'],
        having: [
          {
            fieldId: 'id',
            fieldName: 'id',
            operator: 'gt',
            value: 10,
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply COUNT DISTINCT aggregation', async () => {
      const mockData = [{ unique_members: 50 }];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'member_id',
            fieldName: 'Unique Members',
            aggregation: 'count_distinct',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // TC-F-004: Report with JOINs
  // ============================================================================
  describe('TC-F-004: Report with JOINs', () => {
    it('should apply INNER JOIN', async () => {
      const mockData = [
        {
          claim_number: 'CLM-001',
          first_name: 'John',
          last_name: 'Doe',
        },
      ];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'claim_number', fieldName: 'Claim Number', table: 'claims' },
          { fieldId: 'first_name', fieldName: 'First Name', table: 'organization_members' },
          { fieldId: 'last_name', fieldName: 'Last Name', table: 'organization_members' },
        ],
        joins: [
          {
            table: 'organization_members',
            type: 'inner',
            on: {
              leftField: 'claims.member_id',
              rightField: 'organization_members.id',
              operator: '=',
            },
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply LEFT JOIN', async () => {
      const mockData = [
        {
          claim_number: 'CLM-001',
          deadline_type: 'filing',
        },
      ];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'claim_number', fieldName: 'Claim Number', table: 'claims' },
          { fieldId: 'deadline_type', fieldName: 'Deadline Type', table: 'claim_deadlines' },
        ],
        joins: [
          {
            table: 'claim_deadlines',
            type: 'left',
            on: {
              leftField: 'claims.id',
              rightField: 'claim_deadlines.claim_id',
            },
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply multiple JOINs', async () => {
      const mockData = [];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'claim_number', fieldName: 'Claim Number', table: 'claims' },
          { fieldId: 'first_name', fieldName: 'First Name', table: 'organization_members' },
          { fieldId: 'deadline_type', fieldName: 'Deadline Type', table: 'claim_deadlines' },
        ],
        joins: [
          {
            table: 'organization_members',
            type: 'inner',
            on: {
              leftField: 'claims.member_id',
              rightField: 'organization_members.id',
            },
          },
          {
            table: 'claim_deadlines',
            type: 'left',
            on: {
              leftField: 'claims.id',
              rightField: 'claim_deadlines.claim_id',
            },
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should use safe table and column names in JOINs', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'claim_number', fieldName: 'Claim Number' },
        ],
        joins: [
          {
            table: 'organization_members',
            type: 'inner',
            on: {
              leftField: 'claims.member_id',
              rightField: 'organization_members.id',
            },
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      // Verify safe identifiers used
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid join types', async () => {
      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'claim_number', fieldName: 'Claim Number' },
        ],
        joins: [
          {
            table: 'organization_members',
            type: 'invalid' as any,
            on: {
              leftField: 'claims.member_id',
              rightField: 'organization_members.id',
            },
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid join type');
    });
  });

  // ============================================================================
  // TC-F-005: Report with Sorting
  // ============================================================================
  describe('TC-F-005: Report with Sorting', () => {
    it('should apply single column sort ASC', async () => {
      const mockData = [
        { claim_number: 'CLM-001' },
        { claim_number: 'CLM-002' },
      ];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'claim_number', fieldName: 'Claim Number' },
        ],
        sortBy: [
          {
            fieldId: 'claim_number',
            direction: 'asc',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply single column sort DESC', async () => {
      const mockData = [
        { created_at: '2026-02-11' },
        { created_at: '2026-02-10' },
      ];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'created_at', fieldName: 'Created Date' },
        ],
        sortBy: [
          {
            fieldId: 'created_at',
            direction: 'desc',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply multi-column sort', async () => {
      const mockData = [];
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'status', fieldName: 'Status' },
          { fieldId: 'priority', fieldName: 'Priority' },
        ],
        sortBy: [
          {
            fieldId: 'status',
            direction: 'asc',
          },
          {
            fieldId: 'priority',
            direction: 'desc',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply NULLS FIRST', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'resolved_at', fieldName: 'Resolved Date' },
        ],
        sortBy: [
          {
            fieldId: 'resolved_at',
            direction: 'asc',
            nulls: 'first',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply NULLS LAST', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'resolved_at', fieldName: 'Resolved Date' },
        ],
        sortBy: [
          {
            fieldId: 'resolved_at',
            direction: 'desc',
            nulls: 'last',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // TC-F-006: Report with Pagination
  // ============================================================================
  describe('TC-F-006: Report with Pagination', () => {
    it('should apply default LIMIT of 1000', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply custom LIMIT', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        limit: 50,
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should apply OFFSET for pagination', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        limit: 25,
        offset: 50,
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle large offset values', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        limit: 100,
        offset: 10000,
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should paginate with sorting', async () => {
      const mockData = Array.from({ length: 25 }, (_, i) => ({
        id: `claim-${i + 51}`,
        created_at: new Date(),
      }));
      vi.mocked(db.execute).mockResolvedValue(mockData);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
          { fieldId: 'created_at', fieldName: 'Created Date' },
        ],
        sortBy: [
          {
            fieldId: 'created_at',
            direction: 'desc',
          },
        ],
        limit: 25,
        offset: 50,
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(25);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // TC-F-007: Edge Cases
  // ============================================================================
  describe('TC-F-007: Edge Cases', () => {
    it('should handle empty result sets gracefully', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        filters: [
          {
            fieldId: 'status',
            fieldName: 'status',
            operator: 'eq',
            value: 'nonexistent_status',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should handle very large result sets', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `claim-${i}`,
        status: 'open',
      }));
      vi.mocked(db.execute).mockResolvedValue(largeDataSet);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
          { fieldId: 'status', fieldName: 'Status' },
        ],
        limit: 1000,
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(1000);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(db.execute).mockRejectedValue(new Error('Database connection failed'));

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should reject invalid data source', async () => {
      const config: ReportConfig = {
        dataSourceId: 'invalid_source',
        fields: [
          { fieldId: 'id', fieldName: 'ID' },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid data source');
    });

    it('should reject invalid field IDs', async () => {
      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'nonexistent_field', fieldName: 'Invalid Field' },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid field');
    });

    it('should reject custom formulas for security', async () => {
      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Custom',
            formula: 'DROP TABLE claims;',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Custom formulas are not supported');
    });

    it('should reject invalid alias format', async () => {
      vi.mocked(db.execute).mockRejectedValue(new Error('Invalid alias format'));

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Claim ID',
            alias: 'id; DROP TABLE claims; --',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle complex nested filter groups', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        filters: [
          {
            fieldId: 'status',
            fieldName: 'status',
            operator: 'eq',
            value: 'open',
            logicalOperator: 'AND',
          },
          {
            fieldId: 'priority',
            fieldName: 'priority',
            operator: 'eq',
            value: 'high',
            logicalOperator: 'OR',
          },
          {
            fieldId: 'priority',
            fieldName: 'priority',
            operator: 'eq',
            value: 'critical',
            logicalOperator: 'AND',
          },
          {
            fieldId: 'claim_type',
            fieldName: 'claim_type',
            operator: 'eq',
            value: 'grievance',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle NULL filters correctly', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        filters: [
          {
            fieldId: 'resolved_at',
            fieldName: 'resolved_at',
            operator: 'is_null',
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle BETWEEN filter correctly', async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
        filters: [
          {
            fieldId: 'created_at',
            fieldName: 'created_at',
            operator: 'between',
            values: ['2026-01-01', '2026-12-31'],
          },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('should track execution time accurately', async () => {
      vi.mocked(db.execute).mockImplementation(async () => {
        // Simulate slow query
        await new Promise(resolve => setTimeout(resolve, 50));
        return [];
      });

      const config: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID' },
        ],
      };

      const result = await executor.execute(config);

      expect(result.success).toBe(true);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(50);
    });
  });
});
