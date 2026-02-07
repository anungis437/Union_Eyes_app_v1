import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  SQLInjectionScanner,
  SQLSecurityAuditLog,
  executeParameterizedQuery,
  generateVulnerabilityReport,
  validateSQLSafety
} from '@/lib/middleware/sql-injection-prevention';

describe('SQL injection prevention', () => {
  beforeEach(() => {
    SQLSecurityAuditLog.clear();
  });

  it('detects critical SQL injection patterns', () => {
    const result = SQLInjectionScanner.scanRequest(
      { input: 'test UNION SELECT * FROM users' },
      { filter: 'drop table users' }
    );

    expect(result.isSafe).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.detectedPatterns).toContain('unionInjection');
    expect(result.detectedPatterns).toContain('sqlFunctions');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('detects raw SQL template usage in code', () => {
    const result = SQLInjectionScanner.validateORMUsage(
      'const query = sql`select * from users where id = ${userId}`;'
    );

    expect(result.isValid).toBe(false);
    expect(result.issues[0]).toContain('Raw SQL templates');
  });

  it('returns safe analysis when no patterns are found', () => {
    const result = validateSQLSafety({ name: 'Safe' }, { page: '1' });

    expect(result.isSafe).toBe(true);
    expect(result.detectedPatterns).toHaveLength(0);
    expect(result.severity).toBe('low');
  });

  it('logs SAFE_REQUEST on successful parameterized query', async () => {
    const query = vi.fn(async () => ['row']);

    const result = await executeParameterizedQuery(query, {
      endpoint: '/api/test',
      userId: 'user-1'
    });

    expect(result).toEqual(['row']);
    const events = SQLSecurityAuditLog.getEvents({ eventType: 'SAFE_REQUEST' });
    expect(events).toHaveLength(1);
    expect(events[0].endpoint).toBe('/api/test');
  });

  it('logs critical events to console', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    SQLSecurityAuditLog.logEvent({
      eventType: 'SQL_INJECTION_ATTEMPT',
      severity: 'critical',
      detectedPatterns: ['unionInjection'],
      endpoint: '/api/orders'
    });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('builds a vulnerability report with summary counts', () => {
    SQLSecurityAuditLog.logEvent({
      eventType: 'SQL_INJECTION_ATTEMPT',
      severity: 'critical',
      detectedPatterns: ['sqlFunctions']
    });

    const report = generateVulnerabilityReport();

    expect(report.summary.totalEvents).toBe(1);
    expect(report.summary.criticalAttempts).toBe(1);
  });
});
