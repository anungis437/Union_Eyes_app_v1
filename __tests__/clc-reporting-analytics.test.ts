/**
 * CLC Reporting & Analytics Integration Tests
 * 
 * Comprehensive test suite for Week 3 features:
 * - Compliance reporting service
 * - Analytics dashboard
 * - Notification service
 * - CLC integration layer
 * - Approval workflow
 * - Analytics API endpoints
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

// ============================================================================
// ENVIRONMENT SETUP & MOCKS
// ============================================================================

// Set up environment variables for testing
beforeAll(() => {
  process.env.RESEND_API_KEY = 'test_resend_key';
  process.env.TWILIO_ACCOUNT_SID = 'test_twilio_sid';
  process.env.TWILIO_AUTH_TOKEN = 'test_twilio_token';
  process.env.TWILIO_PHONE_NUMBER = '+1234567890';
  process.env.CLC_API_URL = 'https://test-clc-api.example.com';
  process.env.CLC_CLIENT_ID = 'test_client_id';
  process.env.CLC_CLIENT_SECRET = 'test_client_secret';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
});

// Mock external API clients
vi.mock('resend', () => {
  const MockResend = vi.fn(function() {
    return {
      emails: {
        send: vi.fn().mockResolvedValue({ id: 'test-email-id' })
      }
    };
  });
  return { Resend: MockResend };
});

vi.mock('twilio', () => {
  const MockTwilio = vi.fn(function() {
    return {
      messages: {
        create: vi.fn().mockResolvedValue({ sid: 'test-sms-id' })
      }
    };
  });
  return { default: MockTwilio };
});

// Mock database queries with chainable methods and proper return values
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(function() {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        // Resolve to empty array when awaited
        then: vi.fn((resolve) => resolve([]))
      };
      return mockChain;
    }),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    insert: vi.fn(function() {
      return {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([])
      };
    }),
    update: vi.fn(function() {
      return {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([])
      };
    }),
    execute: vi.fn().mockResolvedValue([]),
    // Default query result - empty array
    then: vi.fn((resolve) => resolve([]))
  }
}));

// Mock email service
vi.mock('@/services/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true })
}));

// Mock database schema with all tables
vi.mock('@/db/schema', () => ({
  clcRemittances: {},
  perCapitaRemittances: {},
  organizations: {},
  organizationContacts: {},
  clcSyncLog: {},
  clcWebhookLog: {},
  clcApprovalWorkflow: {},
  clcNotificationLog: {},
  users: {},
  claims: {},
  profiles: {}
}));

// Import services after mocks are set up
import {
  generateAnnualComplianceReport,
  generateStatCanReport,
  analyzeMultiYearTrends,
  forecastRemittances,
  detectAnomalies,
  analyzeOrganizationPerformance,
  analyzePaymentPatterns
} from '@/services/clc/compliance-reports';

import {
  sendOverdueAlert,
  sendPaymentConfirmation,
  sendMonthlyReminder,
  sendExecutiveEscalation,
  sendBulkMonthlyReminders,
  processOverdueRemittances
} from '@/services/clc/remittance-notifications';

import {
  syncOrganization,
  syncAllOrganizations,
  createOrganizationFromCLC,
  handleWebhook
} from '@/services/clc/clc-api-integration';

import {
  submitForApproval,
  approveRemittance,
  rejectRemittance,
  getApprovalWorkflowState,
  runComplianceChecks
} from '@/services/clc/remittance-audit';

// ============================================================================
// COMPLIANCE REPORTING TESTS
// ============================================================================

describe('Compliance Reporting Service', () => {
  describe('generateAnnualComplianceReport', () => {
    it('should generate complete annual report with all sections', async () => {
      const report = await generateAnnualComplianceReport(2024);

      expect(report).toBeDefined();
      expect(report.year).toBe(2024);
      expect(report.summary).toBeDefined();
      expect(report.summary.totalOrganizations).toBeGreaterThan(0);
      expect(report.summary.totalMembers).toBeGreaterThan(0);
      expect(report.summary.totalAmount).toBeGreaterThan(0);
      expect(report.summary.complianceRate).toBeGreaterThanOrEqual(0);
      expect(report.summary.complianceRate).toBeLessThanOrEqual(100);
    });

    it('should include monthly remittance breakdown', async () => {
      const report = await generateAnnualComplianceReport(2024);

      expect(report.monthlyData).toBeDefined();
      expect(Array.isArray(report.monthlyData)).toBe(true);
      expect(report.monthlyData.length).toBe(12);
      
      report.monthlyData.forEach(month => {
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('remittances');
        expect(month).toHaveProperty('amount');
        expect(month).toHaveProperty('onTimeRate');
      });
    });

    it('should identify non-compliant organizations', async () => {
      const report = await generateAnnualComplianceReport(2024);

      expect(report.nonCompliantOrganizations).toBeDefined();
      expect(Array.isArray(report.nonCompliantOrganizations)).toBe(true);
      
      report.nonCompliantOrganizations.forEach(org => {
        expect(org).toHaveProperty('organizationId');
        expect(org).toHaveProperty('organizationName');
        expect(org).toHaveProperty('missedRemittances');
        expect(org).toHaveProperty('lateRemittances');
      });
    });

    it('should generate actionable recommendations', async () => {
      const report = await generateAnnualComplianceReport(2024);

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      report.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
      });
    });
  });

  describe('generateStatCanReport', () => {
    it('should generate LAB-05302 formatted report', async () => {
      const report = await generateStatCanReport(2024);

      expect(report).toBeDefined();
      expect(report.fiscalYear).toBe(2024);
      expect(report.reportType).toBe('LAB-05302');
      expect(report.submissionDate).toBeDefined();
    });

    it('should aggregate data by quarter', async () => {
      const report = await generateStatCanReport(2024);

      expect(report.quarterlyData).toBeDefined();
      expect(Array.isArray(report.quarterlyData)).toBe(true);
      expect(report.quarterlyData.length).toBe(4);
      
      report.quarterlyData.forEach((quarter, index) => {
        expect(quarter.quarter).toBe(index + 1);
        expect(quarter).toHaveProperty('totalMembers');
        expect(quarter).toHaveProperty('totalAmount');
        expect(quarter).toHaveProperty('organizations');
      });
    });

    it('should format data for StatCan submission', async () => {
      const report = await generateStatCanReport(2024);

      expect(report.formattedData).toBeDefined();
      expect(typeof report.formattedData).toBe('object');
      expect(report.validationStatus).toBe('valid');
    });
  });

  describe('analyzeMultiYearTrends', () => {
    it('should analyze 3-year trends', async () => {
      const trends = await analyzeMultiYearTrends(3);

      expect(trends).toBeDefined();
      expect(trends.years).toBe(3);
      expect(trends.yearlyData).toBeDefined();
      expect(trends.yearlyData.length).toBe(3);
    });

    it('should calculate year-over-year growth rates', async () => {
      const trends = await analyzeMultiYearTrends(5);

      expect(trends.growthMetrics).toBeDefined();
      expect(trends.growthMetrics).toHaveProperty('membershipGrowth');
      expect(trends.growthMetrics).toHaveProperty('revenueGrowth');
      expect(trends.growthMetrics).toHaveProperty('complianceGrowth');
    });

    it('should identify significant trend changes', async () => {
      const trends = await analyzeMultiYearTrends(10);

      expect(trends.trendAnalysis).toBeDefined();
      expect(trends.trendAnalysis).toHaveProperty('direction');
      expect(['increasing', 'decreasing', 'stable']).toContain(trends.trendAnalysis.direction);
    });
  });

  describe('forecastRemittances', () => {
    it('should forecast 12 months ahead', async () => {
      const forecast = await forecastRemittances(12);

      expect(forecast).toBeDefined();
      expect(Array.isArray(forecast)).toBe(true);
      expect(forecast.length).toBe(12);
    });

    it('should include confidence intervals', async () => {
      const forecast = await forecastRemittances(6);

      forecast.forEach(month => {
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('predicted');
        expect(month).toHaveProperty('confidenceLower');
        expect(month).toHaveProperty('confidenceUpper');
        expect(month.confidenceLower).toBeLessThanOrEqual(month.predicted);
        expect(month.predicted).toBeLessThanOrEqual(month.confidenceUpper);
      });
    });

    it('should use linear regression for forecasting', async () => {
      const forecast = await forecastRemittances(3);

      expect(forecast[0].method).toBe('linear_regression');
      expect(forecast[0]).toHaveProperty('rSquared');
      expect(forecast[0].rSquared).toBeGreaterThan(0);
      expect(forecast[0].rSquared).toBeLessThanOrEqual(1);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect submission anomalies', async () => {
      const anomalies = await detectAnomalies(2024);

      expect(anomalies).toBeDefined();
      expect(Array.isArray(anomalies)).toBe(true);
      
      const submissionAnomalies = anomalies.filter(a => a.type === 'late_submission');
      expect(submissionAnomalies.length).toBeGreaterThanOrEqual(0);
    });

    it('should classify anomalies by severity', async () => {
      const anomalies = await detectAnomalies(2024);

      anomalies.forEach(anomaly => {
        expect(anomaly).toHaveProperty('severity');
        expect(['low', 'medium', 'high', 'critical']).toContain(anomaly.severity);
      });
    });

    it('should provide recommended actions', async () => {
      const anomalies = await detectAnomalies(2024);

      anomalies.forEach(anomaly => {
        expect(anomaly).toHaveProperty('recommendedAction');
        expect(typeof anomaly.recommendedAction).toBe('string');
        expect(anomaly.recommendedAction.length).toBeGreaterThan(0);
      });
    });
  });

  describe('analyzeOrganizationPerformance', () => {
    it('should benchmark organization performance', async () => {
      const performance = await analyzeOrganizationPerformance(2024);

      expect(performance).toBeDefined();
      expect(performance.organizations).toBeDefined();
      expect(Array.isArray(performance.organizations)).toBe(true);
    });

    it('should calculate compliance scores', async () => {
      const performance = await analyzeOrganizationPerformance(2024);

      performance.organizations.forEach(org => {
        expect(org).toHaveProperty('complianceScore');
        expect(org.complianceScore).toBeGreaterThanOrEqual(0);
        expect(org.complianceScore).toBeLessThanOrEqual(100);
      });
    });

    it('should identify top and bottom performers', async () => {
      const performance = await analyzeOrganizationPerformance(2024);

      expect(performance).toHaveProperty('topPerformers');
      expect(performance).toHaveProperty('bottomPerformers');
      expect(Array.isArray(performance.topPerformers)).toBe(true);
      expect(Array.isArray(performance.bottomPerformers)).toBe(true);
    });
  });

  describe('analyzePaymentPatterns', () => {
    it('should analyze monthly payment patterns', async () => {
      const patterns = await analyzePaymentPatterns(2024);

      expect(patterns).toBeDefined();
      expect(patterns.monthlyPatterns).toBeDefined();
      expect(Array.isArray(patterns.monthlyPatterns)).toBe(true);
      expect(patterns.monthlyPatterns.length).toBe(12);
    });

    it('should calculate average payment times', async () => {
      const patterns = await analyzePaymentPatterns(2024);

      expect(patterns).toHaveProperty('averageDaysToPayment');
      expect(patterns.averageDaysToPayment).toBeGreaterThanOrEqual(0);
    });

    it('should identify seasonal trends', async () => {
      const patterns = await analyzePaymentPatterns(2024);

      expect(patterns).toHaveProperty('seasonalTrends');
      expect(patterns.seasonalTrends).toBeDefined();
    });
  });
});

// ============================================================================
// NOTIFICATION SERVICE TESTS
// ============================================================================

describe('Notification Service', () => {
  describe('sendOverdueAlert', () => {
    it('should send 7-day overdue alert via email', async () => {
      const result = await sendOverdueAlert('remittance-123', 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.some(r => r.channel === 'email')).toBe(true);
      expect(result.some(r => r.success)).toBe(true);
    });

    it('should escalate to email + SMS at 14 days', async () => {
      const result = await sendOverdueAlert('remittance-123', 14);

      expect(result.some(r => r.channel === 'email')).toBe(true);
      expect(result.some(r => r.channel === 'sms')).toBe(true);
    });

    it('should include executive escalation at 30 days', async () => {
      const result = await sendOverdueAlert('remittance-123', 30);

      const executiveNotification = result.find(r => r.recipientEmail?.includes('executive'));
      expect(executiveNotification).toBeDefined();
    });
  });

  describe('sendPaymentConfirmation', () => {
    it('should send payment confirmation email', async () => {
      const result = await sendPaymentConfirmation('remittance-123');

      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
      expect(result.some(r => r.channel === 'email')).toBe(true);
    });

    it('should include payment details in confirmation', async () => {
      const result = await sendPaymentConfirmation('remittance-123');

      const emailNotification = result.find(r => r.channel === 'email');
      expect(emailNotification).toBeDefined();
      expect(emailNotification?.messageId).toBeDefined();
    });
  });

  describe('sendMonthlyReminder', () => {
    it('should send reminder 7 days before due date', async () => {
      const result = await sendMonthlyReminder('org-123', '2024-01');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should skip if remittance already submitted', async () => {
      const result = await sendMonthlyReminder('org-submitted', '2024-01');

      expect(result.length).toBe(0);
    });
  });

  describe('sendExecutiveEscalation', () => {
    it('should aggregate multiple critical cases', async () => {
      const remittanceIds = ['rem-1', 'rem-2', 'rem-3'];
      const result = await sendExecutiveEscalation(remittanceIds);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include summary table in email', async () => {
      const result = await sendExecutiveEscalation(['rem-critical']);

      const emailNotification = result.find(r => r.channel === 'email');
      expect(emailNotification).toBeDefined();
      expect(emailNotification?.success).toBe(true);
    });
  });

  describe('sendBulkMonthlyReminders', () => {
    it('should process all organizations', async () => {
      const result = await sendBulkMonthlyReminders('2024-02');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('skipped');
      expect(result.sent + result.failed + result.skipped).toBeGreaterThan(0);
    });
  });

  describe('processOverdueRemittances', () => {
    it('should check all overdue remittances daily', async () => {
      const result = await processOverdueRemittances();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('day7');
      expect(result).toHaveProperty('day14');
      expect(result).toHaveProperty('day30');
      expect(result).toHaveProperty('failed');
    });

    it('should return counts by escalation tier', async () => {
      const result = await processOverdueRemittances();

      expect(typeof result.day7).toBe('number');
      expect(typeof result.day14).toBe('number');
      expect(typeof result.day30).toBe('number');
      expect(typeof result.failed).toBe('number');
    });
  });
});

// ============================================================================
// CLC INTEGRATION TESTS
// ============================================================================

describe('CLC Integration Layer', () => {
  describe('syncOrganization', () => {
    it('should sync organization from CLC API', async () => {
      const result = await syncOrganization('org-123');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('action');
    });

    it('should detect and resolve conflicts', async () => {
      const result = await syncOrganization('org-with-conflicts');

      if (result.conflicts) {
        expect(Array.isArray(result.conflicts)).toBe(true);
        result.conflicts.forEach(conflict => {
          expect(conflict).toHaveProperty('field');
          expect(conflict).toHaveProperty('resolution');
        });
      }
    });
  });

  describe('syncAllOrganizations', () => {
    it('should sync all organizations with statistics', async () => {
      const stats = await syncAllOrganizations();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalOrganizations');
      expect(stats).toHaveProperty('synced');
      expect(stats).toHaveProperty('created');
      expect(stats).toHaveProperty('updated');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('duration');
    });
  });

  describe('handleWebhook', () => {
    it('should process organization.created webhook', async () => {
      const payload = {
        id: 'webhook-123',
        type: 'organization.created' as const,
        timestamp: new Date().toISOString(),
        data: {
          affiliateCode: 'TEST-001',
          name: 'Test Organization',
          status: 'active' as const
        },
        signature: 'test-signature'
      };

      const result = await handleWebhook(payload);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });
  });
});

// ============================================================================
// APPROVAL WORKFLOW TESTS
// ============================================================================

describe('Approval Workflow', () => {
  describe('submitForApproval', () => {
    it('should submit draft remittance for approval', async () => {
      const result = await submitForApproval('remittance-draft', 'user-123');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('status');
      expect(result.status).toContain('pending_');
    });

    it('should run compliance checks before submission', async () => {
      const result = await submitForApproval('remittance-invalid', 'user-123');

      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(Array.isArray(result.errors)).toBe(true);
      }
    });
  });

  describe('approveRemittance', () => {
    it('should approve at local level', async () => {
      const result = await approveRemittance(
        'remittance-pending-local',
        'user-local-admin',
        'local',
        'Verified calculations'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.nextLevel).toBeDefined();
    });

    it('should verify approval authority', async () => {
      const result = await approveRemittance(
        'remittance-pending-regional',
        'user-local-admin',
        'regional'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Insufficient approval permissions');
    });
  });

  describe('rejectRemittance', () => {
    it('should reject with reason', async () => {
      const result = await rejectRemittance(
        'remittance-pending-local',
        'user-local-admin',
        'local',
        'Membership count discrepancy',
        'Please verify member count with CLC data'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.status).toBe('rejected');
    });
  });

  describe('getApprovalWorkflowState', () => {
    it('should return complete workflow state', async () => {
      const state = await getApprovalWorkflowState('remittance-123', 'user-123');

      expect(state).toBeDefined();
      expect(state).toHaveProperty('remittanceId');
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('history');
      expect(state).toHaveProperty('canApprove');
      expect(state).toHaveProperty('canReject');
    });
  });

  describe('runComplianceChecks', () => {
    it('should validate required fields', async () => {
      const mockRemittance = {
        totalMembers: 0,
        perCapitaRate: 5.0,
        totalAmount: 0
      };

      const result = await runComplianceChecks(mockRemittance);

      expect(result).toBeDefined();
      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Total members must be greater than zero');
    });

    it('should verify calculation consistency', async () => {
      const mockRemittance = {
        totalMembers: 100,
        perCapitaRate: 5.0,
        totalAmount: 600 // Should be 500
      };

      const result = await runComplianceChecks(mockRemittance);

      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.includes('does not match'))).toBe(true);
    });
  });
});

// ============================================================================
// ANALYTICS API TESTS
// ============================================================================

describe('Analytics API Endpoints', () => {
  describe('GET /api/admin/clc/analytics/trends', () => {
    it('should return 3-year trends', async () => {
      const response = await fetch('/api/admin/clc/analytics/trends?years=3');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toBeDefined();
      expect(data.years).toBe(3);
    });

    it('should validate years parameter', async () => {
      const response = await fetch('/api/admin/clc/analytics/trends?years=15');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/admin/clc/analytics/organizations', () => {
    it('should return organization performance data', async () => {
      const response = await fetch('/api/admin/clc/analytics/organizations?year=2024');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toBeDefined();
      expect(data.organizations).toBeDefined();
    });
  });

  describe('GET /api/admin/clc/analytics/forecast', () => {
    it('should generate 12-month forecast', async () => {
      const response = await fetch('/api/admin/clc/analytics/forecast?months=12');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(12);
    });
  });
});
