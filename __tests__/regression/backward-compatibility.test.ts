/**
 * Regression Tests - Backward Compatibility
 * Test Cases TC-R-001 and TC-R-002
 * 
 * Ensures that security fixes do not break:
 * - Existing report functionality
 * - Legitimate identifier patterns
 * - Valid column names with underscores/numbers
 * - Schema-qualified names
 * 
 * Created: February 11, 2026
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { ReportExecutor, type ReportConfig } from '@/lib/report-executor';
import { safeIdentifier, safeTableName, safeColumnName } from '@/lib/safe-sql-identifiers';

describe('Regression Tests - Backward Compatibility', () => {
  let executor: ReportExecutor;

  beforeEach(() => {
    executor = new ReportExecutor('test-org-123', 'test-tenant-456');
  });

  describe('TC-R-001: Existing Report Functionality', () => {
    it('should execute Claims by Status report (COUNT grouped by status)', async () => {
      const claimsStatusConfig: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'status',
            fieldName: 'Status',
          },
          {
            fieldId: 'id',
            fieldName: 'Claim Count',
            aggregation: 'count',
            alias: 'claim_count',
          },
        ],
        groupBy: ['status'],
        sortBy: [
          {
            fieldId: 'status',
            direction: 'asc',
          },
        ],
      };

      const result = await executor.execute(claimsStatusConfig);

      // Should execute successfully
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.rowCount).toBeGreaterThanOrEqual(0);
      expect(result.executionTimeMs).toBeGreaterThan(0);
      expect(result.sql).toBeDefined();
      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('GROUP BY');
    });

    it('should execute Active Members report (filter by status)', async () => {
      const activeMembersConfig: ReportConfig = {
        dataSourceId: 'organization_members',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Member ID',
          },
          {
            fieldId: 'first_name',
            fieldName: 'First Name',
          },
          {
            fieldId: 'last_name',
            fieldName: 'Last Name',
          },
          {
            fieldId: 'email',
            fieldName: 'Email',
          },
          {
            fieldId: 'hire_date',
            fieldName: 'Hire Date',
          },
        ],
        filters: [
          {
            fieldId: 'status',
            operator: 'eq',
            value: 'active',
          },
        ],
        sortBy: [
          {
            fieldId: 'last_name',
            direction: 'asc',
          },
          {
            fieldId: 'first_name',
            direction: 'asc',
          },
        ],
        limit: 100,
      };

      const result = await executor.execute(activeMembersConfig);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.rowCount).toBeGreaterThanOrEqual(0);
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('ORDER BY');
      expect(result.sql).toContain('LIMIT');
    });

    it('should execute Upcoming Deadlines report (date range filter, sorted)', async () => {
      const deadlinesConfig: ReportConfig = {
        dataSourceId: 'claim_deadlines',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'Deadline ID',
          },
          {
            fieldId: 'claim_id',
            fieldName: 'Claim ID',
          },
          {
            fieldId: 'deadline_type',
            fieldName: 'Type',
          },
          {
            fieldId: 'current_deadline',
            fieldName: 'Deadline Date',
          },
          {
            fieldId: 'status',
            fieldName: 'Status',
          },
          {
            fieldId: 'priority',
            fieldName: 'Priority',
          },
        ],
        filters: [
          {
            fieldId: 'status',
            operator: 'eq',
            value: 'pending',
          },
          {
            fieldId: 'current_deadline',
            operator: 'gte',
            value: new Date().toISOString(),
          },
        ],
        sortBy: [
          {
            fieldId: 'current_deadline',
            direction: 'asc',
          },
          {
            fieldId: 'priority',
            direction: 'desc',
          },
        ],
        limit: 50,
      };

      const result = await executor.execute(deadlinesConfig);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('ORDER BY');
    });

    it('should execute Monthly Dues Summary report (SUM aggregation by month)', async () => {
      const duesSummaryConfig: ReportConfig = {
        dataSourceId: 'dues_assignments',
        fields: [
          {
            fieldId: 'frequency',
            fieldName: 'Frequency',
          },
          {
            fieldId: 'status',
            fieldName: 'Status',
          },
          {
            fieldId: 'amount',
            fieldName: 'Total Amount',
            aggregation: 'sum',
            alias: 'total_amount',
          },
          {
            fieldId: 'id',
            fieldName: 'Assignment Count',
            aggregation: 'count',
            alias: 'assignment_count',
          },
        ],
        groupBy: ['frequency', 'status'],
        filters: [
          {
            fieldId: 'status',
            operator: 'eq',
            value: 'active',
          },
        ],
        sortBy: [
          {
            fieldId: 'frequency',
            direction: 'asc',
          },
        ],
      };

      const result = await executor.execute(duesSummaryConfig);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.sql).toContain('SUM');
      expect(result.sql).toContain('COUNT');
      expect(result.sql).toContain('GROUP BY');
    });

    it('should execute report with multiple aggregations', async () => {
      const multiAggConfig: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'status',
            fieldName: 'Status',
          },
          {
            fieldId: 'id',
            fieldName: 'Total Claims',
            aggregation: 'count',
            alias: 'total_claims',
          },
          {
            fieldId: 'priority',
            fieldName: 'Unique Priorities',
            aggregation: 'count_distinct',
            alias: 'priority_count',
          },
        ],
        groupBy: ['status'],
        sortBy: [
          {
            fieldId: 'status',
            direction: 'asc',
          },
        ],
      };

      const result = await executor.execute(multiAggConfig);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.sql).toContain('COUNT');
      expect(result.sql).toContain('DISTINCT');
    });

    it('should execute report with complex filters', async () => {
      const complexFilterConfig: ReportConfig = {
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
          {
            fieldId: 'status',
            fieldName: 'Status',
          },
          {
            fieldId: 'priority',
            fieldName: 'Priority',
          },
        ],
        filters: [
          {
            fieldId: 'status',
            operator: 'in',
            values: ['open', 'pending', 'under_review'],
          },
          {
            fieldId: 'priority',
            operator: 'ne',
            value: 'low',
          },
        ],
        sortBy: [
          {
            fieldId: 'priority',
            direction: 'desc',
          },
        ],
        limit: 25,
      };

      const result = await executor.execute(complexFilterConfig);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('ORDER BY');
    });
  });

  describe('TC-R-002: Backward Compatibility', () => {
    describe('Valid identifier patterns should still work', () => {
      it('should accept identifiers with underscores', () => {
        expect(() => safeIdentifier('member_id')).not.toThrow();
        expect(() => safeIdentifier('first_name')).not.toThrow();
        expect(() => safeIdentifier('created_at')).not.toThrow();
        expect(() => safeIdentifier('organization_id')).not.toThrow();
        expect(() => safeIdentifier('claim_number')).not.toThrow();
      });

      it('should accept identifiers with numbers', () => {
        expect(() => safeIdentifier('column1')).not.toThrow();
        expect(() => safeIdentifier('field_2')).not.toThrow();
        expect(() => safeIdentifier('test123')).not.toThrow();
        expect(() => safeIdentifier('value_1_total')).not.toThrow();
      });

      it('should accept identifiers starting with underscore', () => {
        expect(() => safeIdentifier('_internal')).not.toThrow();
        expect(() => safeIdentifier('_temp')).not.toThrow();
        expect(() => safeIdentifier('_id')).not.toThrow();
      });

      it('should accept mixed case identifiers', () => {
        expect(() => safeIdentifier('firstName')).not.toThrow();
        expect(() => safeIdentifier('LastName')).not.toThrow();
        expect(() => safeIdentifier('createdAt')).not.toThrow();
        expect(() => safeIdentifier('MemberId')).not.toThrow();
      });

      it('should accept dollar signs in identifiers', () => {
        expect(() => safeIdentifier('field$1')).not.toThrow();
        expect(() => safeIdentifier('value$total')).not.toThrow();
      });

      it('should accept single character identifiers', () => {
        expect(() => safeIdentifier('a')).not.toThrow();
        expect(() => safeIdentifier('x')).not.toThrow();
        expect(() => safeIdentifier('i')).not.toThrow();
      });
    });

    describe('Valid table names should work', () => {
      it('should accept standard table names', () => {
        expect(() => safeTableName('claims')).not.toThrow();
        expect(() => safeTableName('organization_members')).not.toThrow();
        expect(() => safeTableName('claim_deadlines')).not.toThrow();
        expect(() => safeTableName('dues_assignments')).not.toThrow();
      });

      it('should accept table names with numbers', () => {
        expect(() => safeTableName('table1')).not.toThrow();
        expect(() => safeTableName('archive_2024')).not.toThrow();
      });
    });

    describe('Valid column names should work', () => {
      it('should accept simple column names', () => {
        expect(() => safeColumnName('id')).not.toThrow();
        expect(() => safeColumnName('name')).not.toThrow();
        expect(() => safeColumnName('status')).not.toThrow();
        expect(() => safeColumnName('created_at')).not.toThrow();
      });

      it('should accept column names with underscores and numbers', () => {
        expect(() => safeColumnName('member_id')).not.toThrow();
        expect(() => safeColumnName('field_1')).not.toThrow();
        expect(() => safeColumnName('value_2_total')).not.toThrow();
      });

      it('should accept schema-qualified column names', () => {
        expect(() => safeColumnName('public.claims.id')).not.toThrow();
        expect(() => safeColumnName('claims.member_id')).not.toThrow();
        expect(() => safeColumnName('organization_members.first_name')).not.toThrow();
      });
    });

    describe('Reports with legitimate complex identifiers', () => {
      it('should execute report with underscore-heavy field names', async () => {
        const config: ReportConfig = {
          dataSourceId: 'organization_members',
          fields: [
            {
              fieldId: 'id',
              fieldName: 'Member ID',
              alias: 'member_id',
            },
            {
              fieldId: 'first_name',
              fieldName: 'First Name',
              alias: 'first_name_value',
            },
            {
              fieldId: 'last_name',
              fieldName: 'Last Name',
              alias: 'last_name_value',
            },
          ],
          limit: 10,
        };

        const result = await executor.execute(config);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.data).toBeDefined();
      });

      it('should execute report with numeric suffixes in aliases', async () => {
        const config: ReportConfig = {
          dataSourceId: 'claims',
          fields: [
            {
              fieldId: 'id',
              fieldName: 'Count',
              aggregation: 'count',
              alias: 'count_1',
            },
            {
              fieldId: 'status',
              fieldName: 'Status',
              alias: 'status_field_2',
            },
          ],
          groupBy: ['status'],
        };

        const result = await executor.execute(config);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should allow camelCase aliases', async () => {
        const config: ReportConfig = {
          dataSourceId: 'organization_members',
          fields: [
            {
              fieldId: 'first_name',
              fieldName: 'First Name',
              alias: 'firstName',
            },
            {
              fieldId: 'last_name',
              fieldName: 'Last Name',
              alias: 'lastName',
            },
          ],
          limit: 5,
        };

        const result = await executor.execute(config);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('Old API patterns compatibility', () => {
      it('should support basic report without optional parameters', async () => {
        const minimalConfig: ReportConfig = {
          dataSourceId: 'claims',
          fields: [
            {
              fieldId: 'id',
              fieldName: 'ID',
            },
            {
              fieldId: 'status',
              fieldName: 'Status',
            },
          ],
        };

        const result = await executor.execute(minimalConfig);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it('should support reports with only filters', async () => {
        const filterOnlyConfig: ReportConfig = {
          dataSourceId: 'organization_members',
          fields: [
            {
              fieldId: 'id',
              fieldName: 'ID',
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

        const result = await executor.execute(filterOnlyConfig);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it('should support reports with only sorting', async () => {
        const sortOnlyConfig: ReportConfig = {
          dataSourceId: 'claims',
          fields: [
            {
              fieldId: 'id',
              fieldName: 'ID',
            },
            {
              fieldId: 'created_at',
              fieldName: 'Created',
            },
          ],
          sortBy: [
            {
              fieldId: 'created_at',
              direction: 'desc',
            },
          ],
        };

        const result = await executor.execute(sortOnlyConfig);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it('should support reports with custom limit/offset', async () => {
        const paginatedConfig: ReportConfig = {
          dataSourceId: 'organization_members',
          fields: [
            {
              fieldId: 'id',
              fieldName: 'ID',
            },
          ],
          limit: 20,
          offset: 10,
        };

        const result = await executor.execute(paginatedConfig);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.sql).toContain('LIMIT 20');
      });
    });

    describe('Edge cases that should still work', () => {
      it('should handle empty result sets gracefully', async () => {
        const config: ReportConfig = {
          dataSourceId: 'claims',
          fields: [
            {
              fieldId: 'id',
              fieldName: 'ID',
            },
          ],
          filters: [
            {
              fieldId: 'status',
              operator: 'eq',
              value: 'nonexistent_status_value',
            },
          ],
        };

        const result = await executor.execute(config);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.rowCount).toBe(0);
      });

      it('should handle maximum reasonable field count', async () => {
        const config: ReportConfig = {
          dataSourceId: 'claims',
          fields: [
            { fieldId: 'id', fieldName: 'ID' },
            { fieldId: 'claim_number', fieldName: 'Number' },
            { fieldId: 'status', fieldName: 'Status' },
            { fieldId: 'priority', fieldName: 'Priority' },
            { fieldId: 'claim_type', fieldName: 'Type' },
            { fieldId: 'created_at', fieldName: 'Created' },
            { fieldId: 'resolved_at', fieldName: 'Resolved' },
            { fieldId: 'member_id', fieldName: 'Member' },
            { fieldId: 'assigned_to', fieldName: 'Assigned' },
            { fieldId: 'outcome', fieldName: 'Outcome' },
          ],
          limit: 10,
        };

        const result = await executor.execute(config);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it('should handle all supported aggregations', async () => {
        const config: ReportConfig = {
          dataSourceId: 'dues_assignments',
          fields: [
            {
              fieldId: 'amount',
              fieldName: 'Sum',
              aggregation: 'sum',
              alias: 'total_sum',
            },
            {
              fieldId: 'amount',
              fieldName: 'Avg',
              aggregation: 'avg',
              alias: 'average_amount',
            },
            {
              fieldId: 'amount',
              fieldName: 'Min',
              aggregation: 'min',
              alias: 'min_amount',
            },
            {
              fieldId: 'amount',
              fieldName: 'Max',
              aggregation: 'max',
              alias: 'max_amount',
            },
            {
              fieldId: 'id',
              fieldName: 'Count',
              aggregation: 'count',
              alias: 'record_count',
            },
          ],
        };

        const result = await executor.execute(config);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.sql).toContain('SUM');
        expect(result.sql).toContain('AVG');
        expect(result.sql).toContain('MIN');
        expect(result.sql).toContain('MAX');
        expect(result.sql).toContain('COUNT');
      });

      it('should handle all supported filter operators', async () => {
        const operators: Array<{
          operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte';
          value: string | number;
        }> = [
          { operator: 'eq', value: 'active' },
          { operator: 'ne', value: 'inactive' },
          { operator: 'gt', value: 100 },
          { operator: 'lt', value: 1000 },
          { operator: 'gte', value: 50 },
          { operator: 'lte', value: 500 },
        ];

        for (const { operator, value } of operators) {
          const config: ReportConfig = {
            dataSourceId: 'dues_assignments',
            fields: [{ fieldId: 'id', fieldName: 'ID' }],
            filters: [
              {
                fieldId: operator.includes('t') ? 'amount' : 'status',
                operator,
                value,
              },
            ],
            limit: 5,
          };

          const result = await executor.execute(config);
          expect(result.success).toBe(true);
        }
      });
    });
  });

  describe('Integration: Security + Backward Compatibility', () => {
    it('should block injection but allow legitimate underscores', () => {
      // Should allow legitimate identifiers
      expect(() => safeIdentifier('member_id')).not.toThrow();
      expect(() => safeIdentifier('first_name_last_name')).not.toThrow();

      // Should block malicious patterns
      expect(() => safeIdentifier("member_id'; DROP TABLE users; --")).toThrow();
      expect(() => safeIdentifier('member_id; DELETE FROM')).toThrow();
    });

    it('should execute legitimate complex reports while blocking formulas', async () => {
      // Legitimate complex report should work
      const legitimateConfig: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'status',
            fieldName: 'Status',
            alias: 'claim_status_2024',
          },
          {
            fieldId: 'id',
            fieldName: 'Count',
            aggregation: 'count',
            alias: 'total_count_1',
          },
        ],
        groupBy: ['status'],
      };

      const legitimateResult = await executor.execute(legitimateConfig);
      expect(legitimateResult.success).toBe(true);

      // Malicious formula should be blocked
      const maliciousConfig: ReportConfig = {
        dataSourceId: 'claims',
        fields: [
          {
            fieldId: 'id',
            fieldName: 'ID',
            formula: "'; DROP TABLE claims; --",
          },
        ],
      };

      const maliciousResult = await executor.execute(maliciousConfig);
      expect(maliciousResult.success).toBe(false);
      expect(maliciousResult.error).toMatch(/custom formulas are not supported/i);
    });
  });
});
