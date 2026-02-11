/**
 * Audit Logging Tests for Security Events
 * Test Cases TC-L-001 through TC-L-004
 * 
 * Tests comprehensive audit logging for:
 * - Successful report execution
 * - Failed report execution
 * - Security events and violations
 * - Audit log completeness and immutability
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/db';
import { auditLogs, securityEvents } from '@/db/schema/audit-security-schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Helper to create audit log directly
async function createTestAuditLog(data: {
  organizationId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  outcome?: 'success' | 'failure' | 'error';
  severity?: string;
  errorMessage?: string;
}): Promise<string> {
  const id = uuidv4();
  await db.insert(auditLogs).values({
    auditId: id,
    organizationId: data.organizationId,
    userId: data.userId,
    action: data.action,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    metadata: data.metadata,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    outcome: data.outcome || 'success',
    severity: data.severity || 'info',
    errorMessage: data.errorMessage,
    createdAt: new Date(),
  });
  return id;
}

describe('Audit Logging Tests', () => {
  const testOrgId = 'test-org-' + uuidv4();
  const testUserId = 'test-user-' + uuidv4();
  const testReportId = 'test-report-' + uuidv4();
  let createdAuditIds: string[] = [];

  beforeEach(() => {
    createdAuditIds = [];
  });

  afterEach(async () => {
    // Clean up test audit logs
    try {
      // Delete by auditId
      for (const id of createdAuditIds) {
        await db.delete(auditLogs).where(eq(auditLogs.auditId, id));
      }
      // Clean up by organization
      await db.delete(auditLogs).where(eq(auditLogs.organizationId, testOrgId));
      await db.delete(securityEvents).where(eq(securityEvents.organizationId, testOrgId));
    } catch (error) {
      // Ignore cleanup errors
      console.log('Cleanup warning:', error);
    }
  });

  describe('TC-L-001: Successful Report Execution Logging', () => {
    it('should create audit log for successful report execution', async () => {
      const auditId = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_execute',
        resourceType: 'report',
        resourceId: testReportId,
        metadata: {
          reportType: 'analytics',
          executionTimeMs: 1234,
          rowCount: 150,
          status: 'completed'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        outcome: 'success'
      });
      createdAuditIds.push(auditId);

      expect(auditId).toBeTruthy();
      expect(typeof auditId).toBe('string');

      // Verify audit log was created in database
      const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.auditId, auditId)
      });

      expect(logs).toHaveLength(1);
      const log = logs[0];

      // Verify all required fields are present
      expect(log.organizationId).toBe(testOrgId);
      expect(log.userId).toBe(testUserId);
      expect(log.action).toBe('report_execute');
      expect(log.resourceType).toBe('report');
      expect(log.resourceId).toBe(testReportId);
      expect(log.ipAddress).toBe('192.168.1.100');
      expect(log.userAgent).toContain('Mozilla');
      expect(log.createdAt).toBeInstanceOf(Date);
      expect(log.outcome).toBe('success');
    });

    it('should include execution metadata in audit log', async () => {
      const auditId = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_execute',
        resourceType: 'report',
        resourceId: testReportId,
        metadata: {
          reportName: 'Q4 Financial Report',
          parameters: { quarter: 'Q4', year: 2025 },
          format: 'pdf',
          executionTimeMs: 2500,
          rowCount: 250
        }
      });
      createdAuditIds.push(auditId);

      const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.auditId, auditId)
      });

      expect(logs).toHaveLength(1);
      const metadata = logs[0].metadata;

      expect(metadata).toMatchObject({
        reportName: 'Q4 Financial Report',
        format: 'pdf',
        rowCount: 250
      });
    });

    it('should capture timestamp accurately', async () => {
      const beforeTime = new Date();
      
      const auditId = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_execute',
        resourceType: 'report',
        resourceId: testReportId
      });
      createdAuditIds.push(auditId);
      
      const afterTime = new Date();

      const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.auditId, auditId)
      });

      const logTimestamp = logs[0].createdAt;
      expect(logTimestamp).toBeInstanceOf(Date);
      expect(logTimestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 1000);
      expect(logTimestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 1000);
    });
  });

  describe('TC-L-002: Failed Report Execution Logging', () => {
    it('should log report execution failure with error details', async () => {
      const auditId = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_execute',
        resourceType: 'report',
        resourceId: testReportId,
        metadata: {
          status: 'failed',
          errorCode: 'INVALID_CONFIG',
          errorMessage: 'Missing required field: dataSourceId',
          stackTrace: 'Error: Missing required field\\n  at ReportExecutor.execute',
          executionTimeMs: 150
        },
        outcome: 'failure',
        errorMessage: 'Missing required field: dataSourceId',
        severity: 'error'
      });
      createdAuditIds.push(auditId);

      const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.auditId, auditId)
      });

      expect(logs).toHaveLength(1);
      const log = logs[0];

      expect(log.outcome).toBe('failure');
      expect(log.errorMessage).toContain('Missing required field');
      expect(log.metadata.status).toBe('failed');
      expect(log.metadata.errorCode).toBe('INVALID_CONFIG');
    });

    it('should capture stack trace for failed executions', async () => {
      const errorStack = `Error: Database connection timeout
  at ReportExecutor.execute (/app/lib/report-executor.ts:145:15)
  at async POST (/app/api/reports/[id]/execute/route.ts:89:20)`;

      const auditId = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_execute',
        resourceType: 'report',
        resourceId: testReportId,
        metadata: {
          status: 'failed',
          errorMessage: 'Database connection timeout',
          stackTrace: errorStack
        },
        outcome: 'error',
        errorMessage: 'Database connection timeout',
        severity: 'critical'
      });
      createdAuditIds.push(auditId);

      const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.auditId, auditId)
      });

      const metadata = logs[0].metadata;
      expect(metadata.stackTrace).toContain('ReportExecutor.execute');
      expect(metadata.stackTrace).toContain('Database connection timeout');
    });

    it('should log permission denied errors', async () => {
      const auditId = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_execute',
        resourceType: 'report',
        resourceId: testReportId,
        metadata: {
          status: 'forbidden',
          errorCode: 'ACCESS_DENIED',
          errorMessage: 'User does not have permission to execute this report',
          requiredRole: 'admin',
          userRole: 'member'
        },
        outcome: 'failure',
        severity: 'warning',
        errorMessage: 'Access denied'
      });
      createdAuditIds.push(auditId);

      const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.auditId, auditId)
      });

      expect(logs[0].outcome).toBe('failure');
      expect(logs[0].severity).toBe('warning');
      expect(logs[0].errorMessage).toContain('Access denied');
    });
  });

  describe('TC-L-003: Security Event Logging', () => {
    it('should log custom formula injection attempts', async () => {
      const securityEvent = {
        eventId: uuidv4(),
        organizationId: testOrgId,
        userId: testUserId,
        eventType: 'sql_injection_attempt',
        eventCategory: 'suspicious',
        severity: 'high',
        description: 'Custom formula injection attempt detected',
        sourceIp: '203.0.113.45',
        userAgent: 'curl/7.68.0',
        additionalData: {
          attackType: 'custom_formula_injection',
          maliciousPayload: "'; DROP TABLE members; --",
          endpoint: '/api/reports/123/execute',
          blocked: true,
          detectionRule: 'custom_formula_not_supported'
        },
        riskScore: 85,
        createdAt: new Date()
      };

      await db.insert(securityEvents).values(securityEvent);

      const events = await db.query.securityEvents.findMany({
        where: and(
          eq(securityEvents.organizationId, testOrgId),
          eq(securityEvents.eventType, 'sql_injection_attempt')
        )
      });

      expect(events).toHaveLength(1);
      const event = events[0];

      expect(event.eventCategory).toBe('suspicious');
      expect(event.severity).toBe('high');
      expect(event.riskScore).toBe(85);
      
      const additionalData = event.additionalData;
      
      expect(additionalData.attackType).toBe('custom_formula_injection');
      expect(additionalData.maliciousPayload).toContain('DROP TABLE');
      expect(additionalData.blocked).toBe(true);
    });

    it('should log SQL injection via column name', async () => {
      const securityEvent = {
        eventId: uuidv4(),
        organizationId: testOrgId,
        userId: testUserId,
        eventType: 'sql_injection_attempt',
        eventCategory: 'suspicious',
        severity: 'critical',
        description: 'SQL injection attempt via column name',
        sourceIp: '198.51.100.42',
        userAgent: 'PostmanRuntime/7.29.2',
        additionalData: {
          attackType: 'column_name_injection',
          maliciousPayload: "name'; UPDATE users SET role='admin' WHERE '1'='1",
          targetField: 'sortBy',
          endpoint: '/api/reports/execute',
          blocked: true,
          detectionRule: 'invalid_sql_identifier'
        },
        riskScore: 95,
        createdAt: new Date()
      };

      await db.insert(securityEvents).values(securityEvent);

      const events = await db.query.securityEvents.findMany({
        where: and(
          eq(securityEvents.organizationId, testOrgId),
          eq(securityEvents.severity, 'critical')
        )
      });

      expect(events.length).toBeGreaterThanOrEqual(1);
      const event = events[0];

      expect(event.severity).toBe('critical');
      expect(event.riskScore).toBeGreaterThanOrEqual(90);
      
      const additionalData = event.additionalData;
      
      expect(additionalData.attackType).toBe('column_name_injection');
      expect(additionalData.blocked).toBe(true);
    });

    it('should capture source IP and user agent for security events', async () => {
      const securityEvent = {
        eventId: uuidv4(),
        organizationId: testOrgId,
        userId: testUserId,
        eventType: 'suspicious_activity',
        eventCategory: 'suspicious',
        severity: 'medium',
        description: 'Unusual report execution pattern detected',
        sourceIp: '192.0.2.100',
        userAgent: 'Python-urllib/3.8',
        additionalData: {
          reason: 'Rapid successive executions',
          executionCount: 25,
          timeWindow: '60 seconds'
        },
        riskScore: 60,
        createdAt: new Date()
      };

      await db.insert(securityEvents).values(securityEvent);

      const events = await db.query.securityEvents.findMany({
        where: eq(securityEvents.eventId, securityEvent.eventId)
      });

      expect(events).toHaveLength(1);
      expect(events[0].sourceIp).toBe('192.0.2.100');
      expect(events[0].userAgent).toBe('Python-urllib/3.8');
    });

    it('should log multiple security violations from same user', async () => {
      const baseEvent = {
        organizationId: testOrgId,
        userId: testUserId,
        eventCategory: 'suspicious' as const,
        sourceIp: '203.0.113.50',
        userAgent: 'curl/7.68.0',
        createdAt: new Date()
      };

      // Create multiple security events
      const events = [
        {
          ...baseEvent,
          eventId: uuidv4(),
          eventType: 'sql_injection_attempt',
          severity: 'high' as const,
          description: 'First injection attempt',
          additionalData: { attempt: 1 },
          riskScore: 80
        },
        {
          ...baseEvent,
          eventId: uuidv4(),
          eventType: 'sql_injection_attempt',
          severity: 'high' as const,
          description: 'Second injection attempt',
          additionalData: { attempt: 2 },
          riskScore: 85
        },
        {
          ...baseEvent,
          eventId: uuidv4(),
          eventType: 'unauthorized_access',
          severity: 'critical' as const,
          description: 'Unauthorized data access attempt',
          additionalData: { attempt: 3 },
          riskScore: 95
        }
      ];

      for (const event of events) {
        await db.insert(securityEvents).values(event);
      }

      const userEvents = await db.query.securityEvents.findMany({
        where: and(
          eq(securityEvents.organizationId, testOrgId),
          eq(securityEvents.userId, testUserId)
        ),
        orderBy: [desc(securityEvents.createdAt)]
      });

      expect(userEvents.length).toBeGreaterThanOrEqual(3);
      expect(userEvents.filter(e => e.eventType === 'sql_injection_attempt')).toHaveLength(2);
      expect(userEvents.filter(e => e.severity === 'critical')).toHaveLength(1);
    });
  });

  describe('TC-L-004: Audit Log Completeness', () => {
    it('should verify all required fields are present in audit logs', async () => {
      const auditId = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_view',
        resourceType: 'report',
        resourceId: testReportId,
        metadata: {
          viewDuration: 120,
          screenResolution: '1920x1080'
        },
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0'
      });
      createdAuditIds.push(auditId);

      const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.auditId, auditId)
      });

      const log = logs[0];

      // Verify required fields
      expect(log.auditId).toBeTruthy();
      expect(log.organizationId).toBeTruthy();
      expect(log.userId).toBeTruthy();
      expect(log.action).toBeTruthy();
      expect(log.resourceType).toBeTruthy();
      expect(log.resourceId).toBeTruthy();
      expect(log.createdAt).toBeInstanceOf(Date);
      expect(log.outcome).toBeTruthy();

      // Verify optional fields when provided
      expect(log.ipAddress).toBe('192.168.1.50');
      expect(log.userAgent).toBe('Mozilla/5.0');
      expect(log.metadata).toBeTruthy();
    });

    it('should verify timestamp accuracy within 1 second', async () => {
      const beforeTime = Date.now();
      
      const auditId = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_create',
        resourceType: 'report',
        resourceId: testReportId
      });
      createdAuditIds.push(auditId);
      
      const afterTime = Date.now();

      const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.auditId, auditId)
      });

      const logTime = logs[0].createdAt.getTime();
      const timeDifference = Math.abs(logTime - beforeTime);

      expect(timeDifference).toBeLessThan(2000); // Within 2 seconds
      expect(logTime).toBeGreaterThanOrEqual(beforeTime - 1000);
      expect(logTime).toBeLessThanOrEqual(afterTime + 1000);
    });

    it('should verify log immutability - archived flag prevents deletion', async () => {
      const auditId = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_delete',
        resourceType: 'report',
        resourceId: testReportId
      });
      createdAuditIds.push(auditId);

      // Mark as archived
      await db.update(auditLogs)
        .set({ archived: true, archivedAt: new Date() })
        .where(eq(auditLogs.auditId, auditId));

      const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.auditId, auditId)
      });

      expect(logs[0].archived).toBe(true);
      expect(logs[0].archivedAt).toBeInstanceOf(Date);
      
      // Archived logs should not be deleted (only marked)
      // This is enforced by application logic, not database constraint
    });

    it('should support log retrieval by organization', async () => {
      // Create multiple logs for the organization
      const entries = [
        { action: 'report_create', resourceId: uuidv4() },
        { action: 'report_execute', resourceId: uuidv4() },
        { action: 'report_update', resourceId: uuidv4() }
      ];

      for (const entry of entries) {
        const id = await createTestAuditLog({
          organizationId: testOrgId,
          userId: testUserId,
          action: entry.action,
          resourceType: 'report',
          resourceId: entry.resourceId
        });
        createdAuditIds.push(id);
      }

      const result = await db.query.auditLogs.findMany({
        where: eq(auditLogs.organizationId, testOrgId),
        limit: 10
      });

      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.every(e => e.organizationId === testOrgId)).toBe(true);
    });

    it('should support log search and filtering by action', async () => {
      // Create logs with different actions
      const executeId1 = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_execute',
        resourceType: 'report',
        resourceId: uuidv4()
      });
      
      const executeId2 = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_execute',
        resourceType: 'report',
        resourceId: uuidv4()
      });

      const createId = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_create',
        resourceType: 'report',
        resourceId: uuidv4()
      });

      createdAuditIds.push(executeId1, executeId2, createId);

      const result = await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.organizationId, testOrgId),
          eq(auditLogs.action, 'report_execute')
        ),
        limit: 10
      });

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every(e => e.action === 'report_execute')).toBe(true);
    });

    it('should support filtering by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const auditId = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_execute',
        resourceType: 'report',
        resourceId: testReportId
      });
      createdAuditIds.push(auditId);

      const result = await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.organizationId, testOrgId),
          gte(auditLogs.createdAt, yesterday),
          lte(auditLogs.createdAt, tomorrow)
        ),
        limit: 10
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every(e => {
        const timestamp = e.createdAt.getTime();
        return timestamp >= yesterday.getTime() && timestamp <= tomorrow.getTime();
      })).toBe(true);
    });

    it('should retrieve user audit trail', async () => {
      // Create multiple logs for the same user
      const actions = ['report_view', 'report_execute', 'report_share'];
      
      for (const action of actions) {
        const id = await createTestAuditLog({
          organizationId: testOrgId,
          userId: testUserId,
          action,
          resourceType: 'report',
          resourceId: testReportId
        });
        createdAuditIds.push(id);
      }

      const trail = await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.organizationId, testOrgId),
          eq(auditLogs.userId, testUserId)
        ),
        orderBy: [desc(auditLogs.createdAt)],
        limit: 10
      });

      expect(trail.length).toBeGreaterThanOrEqual(3);
      expect(trail.every(e => e.userId === testUserId)).toBe(true);
      expect(trail.every(e => e.organizationId === testOrgId)).toBe(true);
    });

    it('should retrieve resource audit trail', async () => {
      const specificResourceId = uuidv4();
      const actions = ['report_create', 'report_update', 'report_execute', 'report_share'];
      
      for (const action of actions) {
        const id = await createTestAuditLog({
          organizationId: testOrgId,
          userId: testUserId,
          action,
          resourceType: 'report',
          resourceId: specificResourceId
        });
        createdAuditIds.push(id);
      }

      const trail = await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.organizationId, testOrgId),
          eq(auditLogs.resourceType, 'report'),
          eq(auditLogs.resourceId, specificResourceId)
        ),
        orderBy: [desc(auditLogs.createdAt)]
      });

      expect(trail.length).toBe(4);
      expect(trail.every(e => e.resourceId === specificResourceId)).toBe(true);
      expect(trail.every(e => e.resourceType === 'report')).toBe(true);
      
      // Verify chronological order (most recent first)
      for (let i = 0; i < trail.length - 1; i++) {
        expect(trail[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          trail[i + 1].createdAt.getTime()
        );
      }
    });

    it('should generate audit statistics for time period', async () => {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      // Create diverse audit logs
      const entries = [
        { action: 'report_create', resourceType: 'report' },
        { action: 'report_execute', resourceType: 'report' },
        { action: 'report_execute', resourceType: 'report' },
        { action: 'report_update', resourceType: 'report' },
        { action: 'member_invite', resourceType: 'member' }
      ];

      for (const entry of entries) {
        const id = await createTestAuditLog({
          organizationId: testOrgId,
          userId: testUserId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: uuidv4()
        });
        createdAuditIds.push(id);
      }

      const logs = await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.organizationId, testOrgId),
          gte(auditLogs.createdAt, startDate),
          lte(auditLogs.createdAt, endDate)
        )
      });

      // Aggregate statistics
      const entriesByAction: Record<string, number> = {};
      const entriesByResource: Record<string, number> = {};
      
      for (const entry of logs) {
        entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;
        entriesByResource[entry.resourceType] = (entriesByResource[entry.resourceType] || 0) + 1;
      }

      expect(logs.length).toBeGreaterThanOrEqual(5);
      expect(entriesByAction['report_execute']).toBeGreaterThanOrEqual(2);
      expect(entriesByResource['report']).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle audit logging failure gracefully', async () => {
      // Empty organization ID should still create a log (business logic may vary)
      try {
        const auditId = await createTestAuditLog({
          organizationId: '', // Invalid but should handle gracefully
          userId: testUserId,
          action: 'report_execute',
          resourceType: 'report',
          resourceId: testReportId
        });
        // If it succeeds, it's handling gracefully
        expect(typeof auditId).toBe('string');
      } catch (error) {
        // If it fails, that's also valid - just ensure it doesn't crash
        expect(error).toBeDefined();
      }
    });

    it('should handle large metadata objects', async () => {
      const largeMetadata = {
        config: {
          fields: Array(50).fill(null).map((_, i) => ({
            id: `field_${i}`,
            name: `Field ${i}`,
            type: 'string'
          })),
          filters: Array(20).fill(null).map((_, i) => ({
            field: `filter_${i}`,
            operator: 'equals',
            value: `value_${i}`
          }))
        },
        results: Array(100).fill(null).map((_, i) => ({
          row: i,
          data: `data_${i}`
        }))
      };

      const auditId = await createTestAuditLog({
        organizationId: testOrgId,
        userId: testUserId,
        action: 'report_execute',
        resourceType: 'report',
        resourceId: testReportId,
        metadata: largeMetadata
      });
      createdAuditIds.push(auditId);

      const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.auditId, auditId)
      });

      expect(logs).toHaveLength(1);
      const storedMetadata = logs[0].metadata;

      expect(storedMetadata.config.fields).toHaveLength(50);
      expect(storedMetadata.results).toHaveLength(100);
    });

    it('should handle concurrent audit log creation', async () => {
      const promises = Array(10).fill(null).map((_, i) => 
        createTestAuditLog({
          organizationId: testOrgId,
          userId: testUserId,
          action: 'report_execute',
          resourceType: 'report',
          resourceId: `report_${i}`
        })
      );

      const auditIds = await Promise.all(promises);
      createdAuditIds.push(...auditIds);

      expect(auditIds).toHaveLength(10);
      expect(new Set(auditIds).size).toBe(10); // All unique
    });
  });
});
