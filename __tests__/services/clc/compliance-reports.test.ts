import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  generateAnnualComplianceReport, 
  generateStatCanAnnualReport, 
  analyzeMultiYearTrends, 
  analyzeOrganizationPerformance, 
  analyzePaymentPatterns, 
  detectComplianceAnomalies, 
  generateStatCanReport, 
  detectAnomalies, 
  forecastRemittances 
} from '@/services/clc/compliance-reports';
import type { 
  AnnualComplianceReport, 
  ComplianceSummary, 
  OrganizationPerformance,
  PaymentPatternAnalysis,
  ComplianceAnomaly,
  StatCanAnnualReport,
  MultiYearTrendAnalysis
} from '@/services/clc/compliance-reports';

// Mock the database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
}));

// Import db after mocking
import { db } from '@/db';

describe('CLC Compliance Reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create mock remittance data
  const createMockRemittance = (overrides = {}) => ({
    id: 'remit-1',
    fromOrganizationId: 'org-1',
    remittanceYear: 2024,
    remittanceMonth: 1,
    totalMembers: 100,
    goodStandingMembers: 95,
    remittableMembers: 90,
    totalAmount: '5000.00',
    status: 'paid' as const,
    dueDate: new Date('2024-01-15'),
    submittedDate: new Date('2024-01-10'),
    paidDate: new Date('2024-01-14'),
    ...overrides
  });

  const createMockOrganization = (overrides = {}) => ({
    id: 'org-1',
    name: 'Test Union Local 123',
    charterNumber: 'CH-123',
    organizationType: 'affiliate',
    businessNumber: 'BN123456',
    email: 'test@union.org',
    phone: '555-0100',
    contactName: 'John Doe',
    address: '123 Union St',
    ...overrides
  });

  describe('generateAnnualComplianceReport', () => {
    it('should generate complete annual compliance report with all sections', async () => {
      const mockRemittances = [
        createMockRemittance({ id: 'r1', totalAmount: '5000', status: 'paid' }),
        createMockRemittance({ id: 'r2', totalAmount: '3000', status: 'pending' }),
        createMockRemittance({ 
          id: 'r3', 
          totalAmount: '4000', 
          status: 'paid',
          paidDate: new Date('2024-01-20'), // Late payment
          dueDate: new Date('2024-01-15')
        }),
      ];

      const mockOrgs = [createMockOrganization()];

      // Mock database queries
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockRemittances)
        })
      });

      // Mock for organization queries
      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((condition) => {
              // Check if it's the inArray query for organizations
              return Promise.resolve(mockOrgs);
            }),
            limit: vi.fn().mockResolvedValue(mockOrgs)
          })
        };
        return chain;
      }) as any);

      const report = await generateAnnualComplianceReport(2024);

      expect(report).toBeDefined();
      expect(report.year).toBe(2024);
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.summary).toBeDefined();
      expect(report.organizationPerformance).toBeDefined();
      expect(report.paymentPatterns).toBeDefined();
      expect(report.complianceMetrics).toBeDefined();
      expect(report.anomalies).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should calculate correct summary metrics', async () => {
      const mockRemittances = [
        createMockRemittance({ id: 'r1', fromOrganizationId: 'org-1', totalAmount: '1000', status: 'paid' }),
        createMockRemittance({ id: 'r2', fromOrganizationId: 'org-1', totalAmount: '2000', status: 'paid' }),
        createMockRemittance({ id: 'r3', fromOrganizationId: 'org-1', totalAmount: '1500', status: 'pending' }),
      ];

      const mockOrgs = [createMockOrganization({ id: 'org-1' })];
      let queryCount = 0;

      vi.spyOn(db, 'select').mockImplementation((() => {
        queryCount++;
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((condition: any) => {
              // First query returns remittances
              if (queryCount === 1) {
                return Promise.resolve(mockRemittances);
              }
              // Subsequent queries returnorgs array
              return Promise.resolve(mockOrgs);
            })
          })
        };
        return chain;
      }) as any);

      const report = await generateAnnualComplianceReport(2024);

      expect(report.summary.totalRemittances).toBe(3);
      expect(report.summary.totalAmount).toBe(4500);
      expect(report.summary.paidAmount).toBe(3000);
      expect(report.summary.outstandingAmount).toBe(1500);
    });

    it('should handle year with no remittances', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      const report = await generateAnnualComplianceReport(2024);

      expect(report.summary.totalRemittances).toBe(0);
      expect(report.summary.totalAmount).toBe(0);
      expect(report.summary.complianceRate).toBe(0);
      expect(report.organizationPerformance).toEqual([]);
    });

    it('should generate recommendations based on compliance metrics', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          status: 'paid',
          paidDate: new Date('2024-02-28'), // Very late
          dueDate: new Date('2024-01-15')
        }),
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockRemittances)
        })
      });

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([createMockOrganization()]),
            limit: vi.fn().mockResolvedValue([createMockOrganization()])
          })
        };
        return chain;
      }) as any);

      const report = await generateAnnualComplianceReport(2024);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('compliance') || r.includes('delay'))).toBe(true);
    });
  });

  describe('analyzeOrganizationPerformance', () => {
    it('should analyze performance for multiple organizations', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          id: 'r1',
          fromOrganizationId: 'org-1', 
          totalAmount: '5000', 
          status: 'paid' 
        }),
        createMockRemittance({ 
          id: 'r2',
          fromOrganizationId: 'org-2', 
          totalAmount: '3000', 
          status: 'pending' 
        }),
      ];

      const mockOrgs = [
        createMockOrganization({ id: 'org-1', name: 'Union A' }),
        createMockOrganization({ id: 'org-2', name: 'Union B' }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((condition) => {
              // Return empty for previous year queries, orgs for current
              return Promise.resolve(mockOrgs);
            })
          })
        };
        return chain;
      }) as any);

      const performance = await analyzeOrganizationPerformance(mockRemittances, 2024);

      expect(performance).toHaveLength(2);
      expect(performance[0].organizationName).toBeDefined();
      expect(performance[0].remittanceCount).toBeGreaterThanOrEqual(0);
      expect(performance[0].complianceRate).toBeGreaterThanOrEqual(0);
    });

    it('should calculate correct compliance rate per organization', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          fromOrganizationId: 'org-1',
          status: 'paid',
          paidDate: new Date('2024-01-14'),
          dueDate: new Date('2024-01-15')
        }),
        createMockRemittance({ 
          fromOrganizationId: 'org-1',
          status: 'paid',
          paidDate: new Date('2024-02-14'),
          dueDate: new Date('2024-02-15')
        }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([createMockOrganization()])
          })
        };
        return chain;
      }) as any);

      const performance = await analyzeOrganizationPerformance(mockRemittances, 2024);

      expect(performance[0].complianceRate).toBe(100);
      expect(performance[0].riskLevel).toBe('low');
    });

    it('should identify high-risk organizations with overdue payments', async () => {
      const now = new Date();
      const pastDue = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

      const mockRemittances = [
        createMockRemittance({ 
          fromOrganizationId: 'org-1',
          status: 'pending',
          dueDate: pastDue
        }),
        createMockRemittance({ 
          fromOrganizationId: 'org-1',
          status: 'pending',
          dueDate: pastDue
        }),
        createMockRemittance({ 
          fromOrganizationId: 'org-1',
          status: 'pending',
          dueDate: pastDue
        }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([createMockOrganization()])
          })
        };
        return chain;
      }) as any);

      const performance = await analyzeOrganizationPerformance(mockRemittances, 2024);

      expect(performance[0].overdueCount).toBe(3);
      expect(performance[0].riskLevel).toBe('high');
      expect(performance[0].complianceRate).toBe(0);
    });

    it('should sort organizations by total amount descending', async () => {
      const mockRemittances = [
        createMockRemittance({ fromOrganizationId: 'org-1', totalAmount: '1000' }),
        createMockRemittance({ fromOrganizationId: 'org-2', totalAmount: '5000' }),
        createMockRemittance({ fromOrganizationId: 'org-3', totalAmount: '3000' }),
      ];

      const mockOrgs = [
        createMockOrganization({ id: 'org-1' }),
        createMockOrganization({ id: 'org-2' }),
        createMockOrganization({ id: 'org-3' }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockOrgs)
          })
        };
        return chain;
      }) as any);

      const performance = await analyzeOrganizationPerformance(mockRemittances, 2024);

      expect(performance[0].totalAmount).toBeGreaterThanOrEqual(performance[1].totalAmount);
      expect(performance[1].totalAmount).toBeGreaterThanOrEqual(performance[2].totalAmount);
    });
  });

  describe('analyzePaymentPatterns', () => {
    it('should analyze payment patterns by month', async () => {
      const mockRemittances = [
        createMockRemittance({ remittanceMonth: 1, totalAmount: '1000' }),
        createMockRemittance({ remittanceMonth: 1, totalAmount: '2000' }),
        createMockRemittance({ remittanceMonth: 2, totalAmount: '1500' }),
      ];

      const patterns = await analyzePaymentPatterns(mockRemittances, 2024);

      expect(patterns.monthlyDistribution).toHaveLength(12);
      expect(patterns.monthlyDistribution[0].month).toBe(1);
      expect(patterns.monthlyDistribution[0].remittanceCount).toBeGreaterThanOrEqual(0);
    });

    it('should calculate on-time and late payment rates', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          status: 'paid',
          paidDate: new Date('2024-01-14'),
          dueDate: new Date('2024-01-15')
        }),
        createMockRemittance({ 
          status: 'paid',
          paidDate: new Date('2024-01-20'), // Late
          dueDate: new Date('2024-01-15')
        }),
        createMockRemittance({ 
          status: 'pending',
          dueDate: new Date('2024-01-15')
        }),
      ];

      const patterns = await analyzePaymentPatterns(mockRemittances, 2024);

      expect(patterns.onTimePaymentRate).toBeGreaterThanOrEqual(0);
      expect(patterns.latePaymentRate).toBeGreaterThanOrEqual(0);
      expect(patterns.nonPaymentRate).toBeGreaterThanOrEqual(0);
      expect(patterns.onTimePaymentRate + patterns.latePaymentRate + patterns.nonPaymentRate).toBeCloseTo(100, 0);
    });

    it('should analyze seasonal trends by quarter', async () => {
      const mockRemittances = [
        createMockRemittance({ remittanceMonth: 1 }), // Q1
        createMockRemittance({ remittanceMonth: 3 }), // Q1
        createMockRemittance({ remittanceMonth: 5 }), // Q2
        createMockRemittance({ remittanceMonth: 9 }), // Q3
      ];

      const patterns = await analyzePaymentPatterns(mockRemittances, 2024);

      expect(patterns.seasonalTrends).toHaveLength(4);
      expect(patterns.seasonalTrends[0].quarter).toBe(1);
      expect(patterns.seasonalTrends[0].averageAmount).toBeGreaterThanOrEqual(0);
      expect(patterns.seasonalTrends[0].complianceRate).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average processing time', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          status: 'paid',
          paidDate: new Date('2024-01-18'),
          dueDate: new Date('2024-01-15') // 3 days late
        }),
        createMockRemittance({ 
          status: 'paid',
          paidDate: new Date('2024-01-20'),
          dueDate: new Date('2024-01-15') // 5 days late
        }),
      ];

      const patterns = await analyzePaymentPatterns(mockRemittances, 2024);

      expect(patterns.averageProcessingTime).toBe(4); // Average of 3 and 5
    });

    it('should handle empty remittances', async () => {
      const patterns = await analyzePaymentPatterns([], 2024);

      expect(patterns.monthlyDistribution).toHaveLength(12);
      expect(patterns.onTimePaymentRate).toBe(0);
      expect(patterns.averageProcessingTime).toBe(0);
    });
  });

  describe('detectComplianceAnomalies', () => {
    it('should detect late submissions', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          submittedDate: new Date('2024-01-25'),
          dueDate: new Date('2024-01-15') // 10 days late
        }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([createMockOrganization()])
            })
          })
        };
        return chain;
      }) as any);

      const anomalies = await detectComplianceAnomalies(mockRemittances, 2024);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('late_submission');
      expect(anomalies[0].severity).toBeDefined();
    });

    it('should detect late payments', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          status: 'paid',
          paidDate: new Date('2024-02-10'),
          dueDate: new Date('2024-01-15') // 26 days late
        }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([createMockOrganization()])
            })
          })
        };
        return chain;
      }) as any);

      const anomalies = await detectComplianceAnomalies(mockRemittances, 2024);

      expect(anomalies.some(a => a.type === 'late_payment')).toBe(true);
    });

    it('should assign severity levels based on delay', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          id: 'r1',
          submittedDate: new Date('2024-01-25'),
          dueDate: new Date('2024-01-15') // 10 days - medium
        }),
        createMockRemittance({ 
          id: 'r2',
          submittedDate: new Date('2024-02-20'),
          dueDate: new Date('2024-01-15') // 36 days - critical
        }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([createMockOrganization()])
            })
          })
        };
        return chain;
      }) as any);

      const anomalies = await detectComplianceAnomalies(mockRemittances, 2024);

      const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
      expect(criticalAnomalies.length).toBeGreaterThan(0);
    });

    it('should sort anomalies by severity', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          id: 'r1',
          submittedDate: new Date('2024-01-20'),
          dueDate: new Date('2024-01-15') // 5 days
        }),
        createMockRemittance({ 
          id: 'r2',
          submittedDate: new Date('2024-02-20'),
          dueDate: new Date('2024-01-15') // 36 days
        }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([createMockOrganization()])
            })
          })
        };
        return chain;
      }) as any);

      const anomalies = await detectComplianceAnomalies(mockRemittances, 2024);

      if (anomalies.length > 1) {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        for (let i = 0; i < anomalies.length - 1; i++) {
          expect(severityOrder[anomalies[i].severity]).toBeLessThanOrEqual(
            severityOrder[anomalies[i + 1].severity]
          );
        }
      }
    });

    it('should include suggested actions for anomalies', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          status: 'paid',
          paidDate: new Date('2024-03-15'),
          dueDate: new Date('2024-01-15') // 60 days late
        }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([createMockOrganization()])
            })
          })
        };
        return chain;
      }) as any);

      const anomalies = await detectComplianceAnomalies(mockRemittances, 2024);

      anomalies.forEach(anomaly => {
        expect(anomaly.suggestedAction).toBeDefined();
        expect(anomaly.suggestedAction.length).toBeGreaterThan(0);
      });
    });

    it('should handle remittances with no anomalies', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          status: 'paid',
          submittedDate: new Date('2024-01-10'),
          paidDate: new Date('2024-01-14'),
          dueDate: new Date('2024-01-15')
        }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([createMockOrganization()])
            })
          })
        };
        return chain;
      }) as any);

      const anomalies = await detectComplianceAnomalies(mockRemittances, 2024);

      expect(anomalies).toEqual([]);
    });
  });

  describe('generateStatCanAnnualReport', () => {
    it('should generate StatCan report for fiscal year', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          remittanceYear: 2024,
          remittanceMonth: 4,
          totalAmount: '5000'
        }),
        createMockRemittance({ 
          remittanceYear: 2025,
          remittanceMonth: 2,
          totalAmount: '3000'
        }),
      ];

      const mockOrg = createMockOrganization({ organizationType: 'congress' });

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockOrg]),
              then: (resolve: any) => resolve(mockRemittances)
            })
          })
        };
        return chain;
      }) as any);

      const report = await generateStatCanAnnualReport(2024);

      expect(report).toBeDefined();
      expect(report.fiscalYear).toBe(2024);
      expect(report.reportGeneratedAt).toBeInstanceOf(Date);
      expect(report.organizationInfo).toBeDefined();
      expect(report.financialSummary).toBeDefined();
      expect(report.membershipData).toBeDefined();
    });

    it('should aggregate financial data correctly', async () => {
      const mockRemittances = [
        createMockRemittance({ totalAmount: '1000', totalMembers: 50 }),
        createMockRemittance({ totalAmount: '2000', totalMembers: 80 }),
        createMockRemittance({ totalAmount: '1500', totalMembers: 60 }),
      ];

      const mockOrg = createMockOrganization({ organizationType: 'congress' });

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockOrg]),
              then: (resolve: any) => resolve(mockRemittances)
            })
          })
        };
        return chain;
      }) as any);

      const report = await generateStatCanAnnualReport(2024);

      expect(report.financialSummary.category020_perCapitaRevenue).toBe(4500);
      expect(report.financialSummary.totalRevenue).toBe(4500);
    });

    it('should aggregate membership data', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          totalMembers: 100, 
          goodStandingMembers: 90,
          remittableMembers: 85
        }),
        createMockRemittance({ 
          totalMembers: 150, 
          goodStandingMembers: 140,
          remittableMembers: 130
        }),
      ];

      const mockOrg = createMockOrganization({ organizationType: 'congress' });

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockOrg]),
              then: (resolve: any) => resolve(mockRemittances)
            })
          })
        };
        return chain;
      }) as any);

      const report = await generateStatCanAnnualReport(2024);

      expect(report.membershipData.totalMembers).toBe(250);
      expect(report.membershipData.goodStandingMembers).toBe(230);
      expect(report.membershipData.remittableMembers).toBe(215);
    });

    it('should include compliance notes', async () => {
      const mockRemittances = [
        createMockRemittance({ status: 'paid' }),
        createMockRemittance({ status: 'paid' }),
      ];

      const mockOrg = createMockOrganization({ organizationType: 'congress' });

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockOrg]),
              then: (resolve: any) => resolve(mockRemittances)
            })
          })
        };
        return chain;
      }) as any);

      const report = await generateStatCanAnnualReport(2024);

      expect(report.complianceNotes).toBeDefined();
      expect(report.complianceNotes.length).toBeGreaterThan(0);
      expect(report.complianceNotes.includes('2024')).toBe(true);
    });
  });

  describe('analyzeMultiYearTrends', () => {
    it('should analyze trends over 3 years', async () => {
      const mockRemittances2022 = [
        createMockRemittance({ remittanceYear: 2022, totalAmount: '1000', status: 'paid' }),
      ];
      const mockRemittances2023 = [
        createMockRemittance({ remittanceYear: 2023, totalAmount: '1200', status: 'paid' }),
      ];
      const mockRemittances2024 = [
        createMockRemittance({ remittanceYear: 2024, totalAmount: '1500', status: 'paid' }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((condition: any) => {
              // This is a simplification - return different data based on year
              return Promise.resolve([...mockRemittances2022, ...mockRemittances2023, ...mockRemittances2024]);
            })
          })
        };
        return chain;
      }) as any);

      const trends = await analyzeMultiYearTrends({ years: 3, endYear: 2024 });

      expect(trends).toBeDefined();
      expect(trends.years).toEqual([2022, 2023, 2024]);
      expect(trends.totalRemittancesTrend).toHaveLength(3);
      expect(trends.totalAmountTrend).toHaveLength(3);
      expect(trends.complianceRateTrend).toHaveLength(3);
    });

    it('should calculate year-over-year changes', async () => {
      // Mock different data for each year call
      let callCount = 0;
      
      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve([
                  createMockRemittance({ remittanceYear: 2023, totalAmount: '1000', status: 'paid' })
                ]);
              } else if (callCount === 2) {
                return Promise.resolve([
                  createMockRemittance({ remittanceYear: 2024, totalAmount: '1200', status: 'paid' })
                ]);
              }
              return Promise.resolve([]);
            })
          })
        };
        return chain;
      }) as any);

      const trends = await analyzeMultiYearTrends({ years: 2, endYear: 2024 });

      // Second year should have a change from previous
      expect(trends.totalAmountTrend).toHaveLength(2);
      expect(trends.totalAmountTrend[1].value).toBeGreaterThan(0);
    });

    it('should generate forecast for next year', async () => {
      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              createMockRemittance({ totalAmount: '1000' }),
              createMockRemittance({ totalAmount: '1100' }),
            ])
          })
        };
        return chain;
      }) as any);

      const trends = await analyzeMultiYearTrends({ years: 3 });

      expect(trends.forecastNextYear).toBeDefined();
      expect(trends.forecastNextYear.year).toBeGreaterThan(new Date().getFullYear());
      expect(trends.forecastNextYear.forecastRemittances).toBeGreaterThanOrEqual(0);
      expect(trends.forecastNextYear.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(trends.forecastNextYear.confidenceLevel).toBeLessThanOrEqual(100);
    });

    it('should generate key insights from trends', async () => {
      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              createMockRemittance({ totalAmount: '1000' }),
            ])
          })
        };
        return chain;
      }) as any);

      const trends = await analyzeMultiYearTrends({ years: 3 });

      expect(trends.keyInsights).toBeDefined();
      expect(trends.keyInsights.length).toBeGreaterThan(0);
      expect(Array.isArray(trends.keyInsights)).toBe(true);
    });

    it('should handle insufficient data gracefully', async () => {
      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([])
          })
        };
        return chain;
      }) as any);

      const trends = await analyzeMultiYearTrends({ years: 1 });

      expect(trends.forecastNextYear.confidenceLevel).toBe(0);
      expect(trends.keyInsights.some(i => i.includes('Insufficient'))).toBe(true);
    });
  });

  describe('forecastRemittances', () => {
    it('should forecast remittances for specified months', async () => {
      const forecast = await forecastRemittances(6);

      expect(forecast).toHaveLength(6);
      expect(forecast[0].month).toBe(1);
      expect(forecast[0].forecastAmount).toBeDefined();
      expect(forecast[0].confidenceLevel).toBeDefined();
    });

    it('should include confidence levels and bounds', async () => {
      const forecast = await forecastRemittances(3);

      forecast.forEach(item => {
        expect(item.confidenceLevel).toBeGreaterThanOrEqual(0);
        expect(item.lowerBound).toBeLessThanOrEqual(item.forecastAmount);
        expect(item.upperBound).toBeGreaterThanOrEqual(item.forecastAmount);
        expect(item.method).toBe('linear_regression');
      });
    });

    it('should handle single month forecast', async () => {
      const forecast = await forecastRemittances(1);

      expect(forecast).toHaveLength(1);
      expect(forecast[0].year).toBe(new Date().getFullYear());
    });

    it('should handle large number of months', async () => {
      const forecast = await forecastRemittances(24);

      expect(forecast).toHaveLength(24);
      expect(forecast[23].month).toBe(24);
    });
  });

  describe('generateStatCanReport (alias)', () => {
    it('should be an alias for generateStatCanAnnualReport', async () => {
      const mockRemittances = [createMockRemittance()];
      const mockOrg = createMockOrganization({ organizationType: 'congress' });

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockOrg]),
              then: (resolve: any) => resolve(mockRemittances)
            })
          })
        };
        return chain;
      }) as any);

      const report = await generateStatCanReport(2024);

      expect(report).toBeDefined();
      expect(report.fiscalYear).toBe(2024);
    });
  });

  describe('detectAnomalies (alias)', () => {
    it('should be an alias for detectComplianceAnomalies', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          submittedDate: new Date('2024-02-01'),
          dueDate: new Date('2024-01-15')
        }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([createMockOrganization()])
            })
          })
        };
        return chain;
      }) as any);

      const anomalies = await detectAnomalies(mockRemittances, 2024);

      expect(Array.isArray(anomalies)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle remittances with missing dates', async () => {
      const mockRemittances = [
        createMockRemittance({ 
          paidDate: null,
          submittedDate: null,
        }),
      ];

      const patterns = await analyzePaymentPatterns(mockRemittances, 2024);

      expect(patterns).toBeDefined();
      expect(patterns.onTimePaymentRate).toBe(0);
    });

    it('should handle organizations with no previous year data', async () => {
      const mockRemittances = [
        createMockRemittance({ fromOrganizationId: 'new-org' }),
      ];

      vi.spyOn(db, 'select').mockImplementation((() => {
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((condition: any) => {
              // Return empty for previous year, org for current
              return Promise.resolve([createMockOrganization({ id: 'new-org' })]);
            })
          })
        };
        return chain;
      }) as any);

      const performance = await analyzeOrganizationPerformance(mockRemittances, 2024);

      expect(performance[0].trend).toBe('stable');
    });

    it('should handle invalid numeric values gracefully', async () => {
      const mockRemittances = [
        createMockRemittance({ id: 'r1', totalAmount: '0', fromOrganizationId: 'org-1' }),
      ];

      const mockOrgs = [createMockOrganization({ id: 'org-1' })];
      let queryCount = 0;

      vi.spyOn(db, 'select').mockImplementation((() => {
        queryCount++;
        const chain = {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((condition: any) => {
              // First query returns remittances
              if (queryCount === 1) {
                return Promise.resolve(mockRemittances);
              }
              // Subsequent queries return orgs array
              return Promise.resolve(mockOrgs);
            })
          })
        };
        return chain;
      }) as any);

      const report = await generateAnnualComplianceReport(2024);

      expect(report.summary.totalAmount).toBe(0);
      expect(report.summary.paidAmount).toBe(0);
    });

    it('should handle future dates in remittances', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const mockRemittances = [
        createMockRemittance({ dueDate: futureDate }),
      ];

      const patterns = await analyzePaymentPatterns(mockRemittances, 2024);

      expect(patterns).toBeDefined();
    });
  });
});
