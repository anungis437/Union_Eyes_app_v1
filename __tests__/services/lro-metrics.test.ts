/**
 * LRO Metrics Tests
 * 
 * Tests for metrics calculation and aggregation functions.
 */

import { describe, it, expect } from 'vitest';
import {
  getCaseResolutionMetrics,
  calculateSignalEffectiveness,
  calculateSLAComplianceRate,
  calculateAvgResolutionTime,
  calculateSignalActionRate,
  getTopPerformingOfficers,
} from '@/lib/services/lro-metrics';

describe('LRO Metrics Service', () => {
  describe('Case Resolution Metrics', () => {
    it('should calculate total duration for open case', () => {
      const caseData = {
        id: 'case_123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        currentState: 'investigating',
        lastUpdated: new Date('2024-01-15T00:00:00Z'),
      };
      
      const metrics = getCaseResolutionMetrics(caseData);
      
      expect(metrics.caseId).toBe('case_123');
      expect(metrics.resolvedAt).toBeNull();
      expect(metrics.totalDurationHours).toBeGreaterThan(0);
    });
    
    it('should calculate total duration for resolved case', () => {
      const createdDate = new Date('2024-01-01T00:00:00Z');
      const resolvedDate = new Date('2024-01-10T00:00:00Z');
      
      const caseData = {
        id: 'case_123',
        createdAt: createdDate,
        currentState: 'resolved',
        lastUpdated: resolvedDate,
      };
      
      const metrics = getCaseResolutionMetrics(caseData);
      
      expect(metrics.resolvedAt).toEqual(resolvedDate);
      // 9 days * 24 hours = 216 hours
      expect(metrics.totalDurationHours).toBe(216);
    });
    
    it('should process state transitions', () => {
      const caseData = {
        id: 'case_123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        currentState: 'resolved',
        lastUpdated: new Date('2024-01-10T00:00:00Z'),
        stateHistory: [
          { state: 'submitted', timestamp: new Date('2024-01-01T00:00:00Z') },
          { state: 'acknowledged', timestamp: new Date('2024-01-02T00:00:00Z') },
          { state: 'investigating', timestamp: new Date('2024-01-03T00:00:00Z') },
          { state: 'resolved', timestamp: new Date('2024-01-10T00:00:00Z') },
        ],
      };
      
      const metrics = getCaseResolutionMetrics(caseData);
      
      expect(metrics.stateTransitions).toHaveLength(3);
      expect(metrics.stateTransitions[0]).toMatchObject({
        fromState: 'submitted',
        toState: 'acknowledged',
        durationHours: 24,
      });
    });
  });
  
  describe('Signal Effectiveness', () => {
    it('should calculate metrics by signal type', () => {
      const signals = [
        {
          type: 'sla_at_risk',
          detectedAt: new Date('2024-01-01'),
          acknowledgedAt: new Date('2024-01-01'),
          resolvedAt: new Date('2024-01-02'),
        },
        {
          type: 'sla_at_risk',
          detectedAt: new Date('2024-01-01'),
          acknowledgedAt: new Date('2024-01-01'),
          dismissedAt: new Date('2024-01-02'),
        },
        {
          type: 'acknowledgment_overdue',
          detectedAt: new Date('2024-01-01'),
          resolvedAt: new Date('2024-01-01'),
        },
      ];
      
      const effectiveness = calculateSignalEffectiveness(signals);
      
      expect(effectiveness['sla_at_risk']).toBeDefined();
      expect(effectiveness['sla_at_risk'].totalDetected).toBe(2);
      expect(effectiveness['sla_at_risk'].totalAcknowledged).toBe(2);
      expect(effectiveness['sla_at_risk'].totalResolved).toBe(1);
      expect(effectiveness['sla_at_risk'].totalDismissed).toBe(1);
      expect(effectiveness['sla_at_risk'].resolutionRate).toBe(50);
      
      expect(effectiveness['acknowledgment_overdue']).toBeDefined();
      expect(effectiveness['acknowledgment_overdue'].totalDetected).toBe(1);
    });
    
    it('should handle signals with no actions', () => {
      const signals = [
        {
          type: 'sla_at_risk',
          detectedAt: new Date('2024-01-01'),
        },
      ];
      
      const effectiveness = calculateSignalEffectiveness(signals);
      
      expect(effectiveness['sla_at_risk'].totalDetected).toBe(1);
      expect(effectiveness['sla_at_risk'].totalAcknowledged).toBe(0);
      expect(effectiveness['sla_at_risk'].resolutionRate).toBe(0);
    });
  });
  
  describe('SLA Compliance Rate', () => {
    it('should calculate compliance percentage', () => {
      const cases = [
        { id: '1', slaStatus: 'compliant' as const },
        { id: '2', slaStatus: 'compliant' as const },
        { id: '3', slaStatus: 'at_risk' as const },
        { id: '4', slaStatus: 'breached' as const },
      ];
      
      const rate = calculateSLAComplianceRate(cases);
      
      // 2 compliant out of 4 = 50%
      expect(rate).toBe(50);
    });
    
    it('should return 100% for all compliant cases', () => {
      const cases = [
        { id: '1', slaStatus: 'compliant' as const },
        { id: '2', slaStatus: 'compliant' as const },
      ];
      
      const rate = calculateSLAComplianceRate(cases);
      expect(rate).toBe(100);
    });
    
    it('should return 100% for empty array', () => {
      const rate = calculateSLAComplianceRate([]);
      expect(rate).toBe(100);
    });
  });
  
  describe('Average Resolution Time', () => {
    it('should calculate average hours for resolved cases', () => {
      const cases = [
        {
          createdAt: new Date('2024-01-01T00:00:00Z'),
          resolvedAt: new Date('2024-01-02T00:00:00Z'), // 24 hours
        },
        {
          createdAt: new Date('2024-01-01T00:00:00Z'),
          resolvedAt: new Date('2024-01-03T00:00:00Z'), // 48 hours
        },
        {
          createdAt: new Date('2024-01-01T00:00:00Z'),
          resolvedAt: null, // Not resolved, should be excluded
        },
      ];
      
      const avgHours = calculateAvgResolutionTime(cases);
      
      // (24 + 48) / 2 = 36 hours
      expect(avgHours).toBe(36);
    });
    
    it('should return 0 for no resolved cases', () => {
      const cases = [
        {
          createdAt: new Date('2024-01-01'),
          resolvedAt: null,
        },
      ];
      
      const avgHours = calculateAvgResolutionTime(cases);
      expect(avgHours).toBe(0);
    });
    
    it('should return 0 for empty array', () => {
      const avgHours = calculateAvgResolutionTime([]);
      expect(avgHours).toBe(0);
    });
  });
  
  describe('Signal Action Rate', () => {
    it('should calculate percentage of signals acted upon', () => {
      const signals = [
        {
          detectedAt: new Date('2024-01-01'),
          acknowledgedAt: new Date('2024-01-01'),
        },
        {
          detectedAt: new Date('2024-01-01'),
          actionedAt: new Date('2024-01-02'),
        },
        {
          detectedAt: new Date('2024-01-01'),
          // No action
        },
        {
          detectedAt: new Date('2024-01-01'),
          acknowledgedAt: new Date('2024-01-01'),
          actionedAt: new Date('2024-01-02'),
        },
      ];
      
      const rate = calculateSignalActionRate(signals);
      
      // 3 out of 4 signals actioned = 75%
      expect(rate).toBe(75);
    });
    
    it('should return 0 for no signals', () => {
      const rate = calculateSignalActionRate([]);
      expect(rate).toBe(0);
    });
    
    it('should return 0 when no signals acted upon', () => {
      const signals = [
        { detectedAt: new Date('2024-01-01') },
        { detectedAt: new Date('2024-01-01') },
      ];
      
      const rate = calculateSignalActionRate(signals);
      expect(rate).toBe(0);
    });
  });
  
  describe('Top Performing Officers', () => {
    it('should sort by SLA compliance rate first', () => {
      const officers = [
        {
          officerId: '1',
          officerName: 'Officer A',
          casesResolved: 10,
          avgResolutionHours: 48,
          slaComplianceRate: 80,
        },
        {
          officerId: '2',
          officerName: 'Officer B',
          casesResolved: 20,
          avgResolutionHours: 36,
          slaComplianceRate: 95,
        },
        {
          officerId: '3',
          officerName: 'Officer C',
          casesResolved: 15,
          avgResolutionHours: 40,
          slaComplianceRate: 90,
        },
      ];
      
      const topOfficers = getTopPerformingOfficers(officers, 2);
      
      expect(topOfficers).toHaveLength(2);
      expect(topOfficers[0].officerId).toBe('2'); // Highest SLA compliance
      expect(topOfficers[1].officerId).toBe('3');
    });
    
    it('should sort by cases resolved when SLA rates equal', () => {
      const officers = [
        {
          officerId: '1',
          officerName: 'Officer A',
          casesResolved: 10,
          avgResolutionHours: 48,
          slaComplianceRate: 90,
        },
        {
          officerId: '2',
          officerName: 'Officer B',
          casesResolved: 20,
          avgResolutionHours: 36,
          slaComplianceRate: 90,
        },
      ];
      
      const topOfficers = getTopPerformingOfficers(officers, 2);
      
      expect(topOfficers[0].officerId).toBe('2'); // More cases resolved
      expect(topOfficers[1].officerId).toBe('1');
    });
    
    it('should limit results to specified count', () => {
      const officers = Array.from({ length: 20 }, (_, i) => ({
        officerId: i.toString(),
        officerName: `Officer ${i}`,
        casesResolved: i * 5,
        avgResolutionHours: 40,
        slaComplianceRate: 85,
      }));
      
      const topOfficers = getTopPerformingOfficers(officers, 5);
      
      expect(topOfficers).toHaveLength(5);
    });
  });
});
