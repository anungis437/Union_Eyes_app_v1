/**
 * Database Query Performance Tests
 * 
 * Measures performance of critical database operations:
 * - Query execution times
 * - Bulk insert/update performance
 * - Complex join operations
 * - Index effectiveness
 */

import { describe, test, expect } from 'vitest';
import { db } from '@/db/database';
import { members, claims, organizations } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import {
  measurePerformance,
  measureConcurrentPerformance,
  formatMetrics,
  validateThresholds,
  warmup,
  type PerformanceThresholds,
} from './performance-utils';

describe('Database Query Performance', () => {
  describe('Simple SELECT Queries', () => {
    test('should query single member by ID within threshold', async () => {
      const queryFn = async () => {
        // Use a known test member ID or mock
        return db.select().from(members).where(eq(members.id, 'test-member-1')).limit(1);
      };

      await warmup(queryFn);
      const metrics = await measurePerformance(queryFn, 100);

      console.log('\nSingle Member Query by ID:');
      console.log(formatMetrics(metrics));

      const thresholds: PerformanceThresholds = {
        avgTime: 50, // 50ms average
        p95: 100,
        p99: 150,
      };

      const validation = validateThresholds(metrics, thresholds);
      expect(validation.passed).toBe(true);
    });

    test('should query organization by ID within threshold', async () => {
      const queryFn = async () => {
        return db.select().from(organizations).where(eq(organizations.id, 'test-org-1')).limit(1);
      };

      await warmup(queryFn);
      const metrics = await measurePerformance(queryFn, 100);

      console.log('\nOrganization Query by ID:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(50);
      expect(metrics.p95).toBeLessThan(100);
    });
  });

  describe('Complex JOIN Queries', () => {
    test('should query claims with member join within threshold', async () => {
      const queryFn = async () => {
        return db
          .select({
            claimId: claims.id,
            claimAmount: claims.amount,
            claimStatus: claims.status,
            memberId: members.id,
            memberName: members.fullName,
          })
          .from(claims)
          .leftJoin(members, eq(claims.memberId, members.id))
          .where(eq(claims.status, 'pending'))
          .limit(10);
      };

      await warmup(queryFn);
      const metrics = await measurePerformance(queryFn, 50);

      console.log('\nClaims with Member JOIN:');
      console.log(formatMetrics(metrics));

      const thresholds: PerformanceThresholds = {
        avgTime: 100,
        p95: 200,
        minThroughput: 10,
      };

      const validation = validateThresholds(metrics, thresholds);
      if (!validation.passed) {
        console.warn('Performance threshold failures:', validation.failures);
      }

      expect(metrics.avgTime).toBeLessThan(thresholds.avgTime!);
    });

    test('should query members with organization join within threshold', async () => {
      const queryFn = async () => {
        return db
          .select({
            memberId: members.id,
            memberName: members.fullName,
            orgId: organizations.id,
            orgName: organizations.name,
          })
          .from(members)
          .leftJoin(organizations, eq(members.organizationId, organizations.id))
          .where(eq(members.status, 'active'))
          .limit(20);
      };

      await warmup(queryFn);
      const metrics = await measurePerformance(queryFn, 50);

      console.log('\nMembers with Organization JOIN:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(100);
      expect(metrics.p95).toBeLessThan(200);
    });
  });

  describe('Filtered Range Queries', () => {
    test('should query claims by date range within threshold', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-02-28');

      const queryFn = async () => {
        return db
          .select()
          .from(claims)
          .where(
            and(
              gte(claims.createdAt, startDate),
              lte(claims.createdAt, endDate)
            )
          )
          .limit(50);
      };

      await warmup(queryFn);
      const metrics = await measurePerformance(queryFn, 50);

      console.log('\nClaims by Date Range:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(150);
      expect(metrics.throughput).toBeGreaterThan(5);
    });

    test('should query claims by amount range within threshold', async () => {
      const queryFn = async () => {
        return db
          .select()
          .from(claims)
          .where(
            and(
              gte(claims.amount, sql`1000`),
              lte(claims.amount, sql`10000`)
            )
          )
          .limit(50);
      };

      await warmup(queryFn);
      const metrics = await measurePerformance(queryFn, 50);

      console.log('\nClaims by Amount Range:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(150);
    });
  });

  describe('Aggregation Queries', () => {
    test('should count claims by status within threshold', async () => {
      const queryFn = async () => {
        return db
          .select({
            status: claims.status,
            count: sql<number>`count(*)`,
          })
          .from(claims)
          .groupBy(claims.status);
      };

      await warmup(queryFn);
      const metrics = await measurePerformance(queryFn, 50);

      console.log('\nClaim Count by Status:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(100);
      expect(metrics.p95).toBeLessThan(200);
    });

    test('should calculate sum of claims by organization within threshold', async () => {
      const queryFn = async () => {
        return db
          .select({
            organizationId: claims.organizationId,
            totalAmount: sql<number>`sum(${claims.amount})`,
            claimCount: sql<number>`count(*)`,
          })
          .from(claims)
          .groupBy(claims.organizationId)
          .limit(10);
      };

      await warmup(queryFn);
      const metrics = await measurePerformance(queryFn, 50);

      console.log('\nClaim Totals by Organization:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(150);
    });
  });

  describe('Concurrent Query Performance', () => {
    test('should handle concurrent simple queries efficiently', async () => {
      const queryFn = async () => {
        return db.select().from(members).limit(10);
      };

      await warmup(queryFn);
      const metrics = await measureConcurrentPerformance(queryFn, 25);

      console.log('\nConcurrent Member Queries (25 concurrent):');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(200);
      expect(metrics.p95).toBeLessThan(400);
    });

    test('should handle concurrent complex queries efficiently', async () => {
      const queryFn = async () => {
        return db
          .select({
            claimId: claims.id,
            memberId: members.id,
            orgId: organizations.id,
          })
          .from(claims)
          .leftJoin(members, eq(claims.memberId, members.id))
          .leftJoin(organizations, eq(members.organizationId, organizations.id))
          .limit(5);
      };

      await warmup(queryFn);
      const metrics = await measureConcurrentPerformance(queryFn, 20);

      console.log('\nConcurrent Complex Queries (20 concurrent):');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(300);
      expect(metrics.p99).toBeLessThan(600);
    });
  });

  describe('Pagination Performance', () => {
    test('should paginate members efficiently with offset', async () => {
      const pageSize = 20;

      const queryFn = async () => {
        const offset = Math.floor(Math.random() * 100);
        return db
          .select()
          .from(members)
          .limit(pageSize)
          .offset(offset);
      };

      await warmup(queryFn);
      const metrics = await measurePerformance(queryFn, 50);

      console.log('\nPaginated Member Query (offset-based):');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(100);
      expect(metrics.throughput).toBeGreaterThan(10);
    });

    test('should paginate claims efficiently with cursor', async () => {
      const pageSize = 50;

      const queryFn = async () => {
        // Cursor-based pagination using ID
        return db
          .select()
          .from(claims)
          .where(gte(claims.id, 'claim-100'))
          .limit(pageSize);
      };

      await warmup(queryFn);
      const metrics = await measurePerformance(queryFn, 50);

      console.log('\nPaginated Claims Query (cursor-based):');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(100);
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory during repeated queries', async () => {
      const queryFn = async () => {
        const result = await db.select().from(members).limit(50);
        return result.length;
      };

      const metrics = await measurePerformance(queryFn, 200);

      console.log('\nMemory Usage (200 queries, 50 rows each):');
      console.log(formatMetrics(metrics));

      // Should use less than 30MB for 200 queries
      expect(metrics.memoryUsedMB!).toBeLessThan(30);
    });
  });

  describe('Index Effectiveness', () => {
    test('should query by indexed column efficiently', async () => {
      // Querying by ID (primary key - indexed)
      const indexedQueryFn = async () => {
        return db.select().from(members).where(eq(members.id, 'test-member-1'));
      };

      const metrics = await measurePerformance(indexedQueryFn, 100);

      console.log('\nIndexed Column Query (by ID):');
      console.log(formatMetrics(metrics));

      // Indexed queries should be very fast
      expect(metrics.avgTime).toBeLessThan(50);
      expect(metrics.p95).toBeLessThan(100);
    });

    test('should compare indexed vs non-indexed query performance', async () => {
      const indexedQueryFn = async () => {
        return db.select().from(claims).where(eq(claims.id, 'claim-100'));
      };

      const nonIndexedQueryFn = async () => {
        return db.select().from(claims).where(eq(claims.description, 'Test description'));
      };

      const indexedMetrics = await measurePerformance(indexedQueryFn, 50);
      const nonIndexedMetrics = await measurePerformance(nonIndexedQueryFn, 50);

      console.log('\nIndexed Query:');
      console.log(formatMetrics(indexedMetrics));
      console.log('\nNon-Indexed Query:');
      console.log(formatMetrics(nonIndexedMetrics));

      // Indexed should be significantly faster
      expect(indexedMetrics.avgTime).toBeLessThan(nonIndexedMetrics.avgTime);
      expect(indexedMetrics.throughput).toBeGreaterThan(nonIndexedMetrics.throughput);
    });
  });
});
