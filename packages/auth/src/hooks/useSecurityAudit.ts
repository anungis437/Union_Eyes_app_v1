/**
 * useSecurityAudit Hook
 * 
 * React hook for security audit logging and monitoring.
 * Provides convenient access to audit services from React components.
 * 
 * @module useSecurityAudit
 * @author CourtLens Platform Team
 * @date October 23, 2025
 * @phase Phase 2 Week 1 Day 7
 */

import { useState, useCallback, useEffect } from 'react';
import { securityAuditService } from '../services/securityAuditService';
import { anomalyDetectionService } from '../services/anomalyDetectionService';
import { complianceReportingService } from '../services/complianceReportingService';
import { auditRetentionService } from '../services/auditRetentionService';
import { logger } from '../utils/logger';
import type {
  AuditLog,
  AuditLogFilters,
  AuditRiskLevel,
  LoginAttempt
} from '../services/securityAuditService';
import type {
  AnomalyDetection,
  UserBaseline
} from '../services/anomalyDetectionService';
import type {
  ComplianceReport
} from '../services/complianceReportingService';

// ============================================================================
// TYPES
// ============================================================================

export interface UseSecurityAuditOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseSecurityAuditReturn {
  // Audit logs
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
  getLogs: (filters?: AuditLogFilters) => Promise<void>;
  searchLogs: (query: string, filters?: Partial<AuditLogFilters>) => Promise<void>;
  exportLogs: (filters?: AuditLogFilters, format?: 'json' | 'csv') => Promise<void>;
  
  // Security events
  logAuthEvent: (params: any) => Promise<void>;
  logDataAccess: (params: any) => Promise<void>;
  logSecurityEvent: (params: any) => Promise<void>;
  logPermissionCheck: (params: any) => Promise<void>;
  
  // Analytics
  getSecurityTimeline: (filters?: any) => Promise<void>;
  getUserActivity: (userId: string, firmId?: string) => Promise<void>;
  getHighRiskEvents: (filters?: any) => Promise<void>;
  
  // Anomalies
  anomalies: AnomalyDetection[];
  detectLoginAnomalies: (userId: string, firmId?: string) => Promise<void>;
  detectDataAnomalies: (userId: string, firmId?: string) => Promise<void>;
  detectPermissionAnomalies: (userId?: string, firmId?: string) => Promise<void>;
  detectSessionAnomalies: (userId: string, firmId?: string) => Promise<void>;
  
  // Baseline
  baseline: UserBaseline | null;
  buildBaseline: (userId: string, firmId?: string) => Promise<void>;
  updateBaseline: (userId: string, firmId?: string) => Promise<void>;
  
  // Compliance
  complianceReport: ComplianceReport | null;
  generateSOC2Report: (firmId: string, startDate: string, endDate: string) => Promise<void>;
  generateGDPRReport: (firmId: string, startDate: string, endDate: string) => Promise<void>;
  generateHIPAAReport: (firmId: string, startDate: string, endDate: string) => Promise<void>;
  
  // Refresh
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Security audit hook
 */
export function useSecurityAudit(options: UseSecurityAuditOptions = {}): UseSecurityAuditReturn {
  const { autoRefresh = false, refreshInterval = 30000 } = options;

  // State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [baseline, setBaseline] = useState<UserBaseline | null>(null);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // AUDIT LOGS
  // ==========================================================================

  const getLogs = useCallback(async (filters?: AuditLogFilters) => {
    try {
      setLoading(true);
      setError(null);

      const result = await securityAuditService.getAuditLogs(filters);
      
      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        setError(result.error || 'Failed to fetch logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchLogs = useCallback(async (
    query: string,
    filters?: Partial<AuditLogFilters>
  ) => {
    try {
      setLoading(true);
      setError(null);

      const result = await securityAuditService.searchAuditLogs(query, filters);
      
      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        setError(result.error || 'Failed to search logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const exportLogs = useCallback(async (
    filters?: AuditLogFilters,
    format: 'json' | 'csv' = 'json'
  ) => {
    try {
      setLoading(true);
      setError(null);

      const result = await securityAuditService.exportAuditLogs(filters || {}, format);
      
      if (result.success && result.data) {
        // Download file
        const blob = new Blob([result.data], { 
          type: format === 'json' ? 'application/json' : 'text/csv' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        setError(result.error || 'Failed to export logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================================
  // SECURITY EVENTS
  // ==========================================================================

  const logAuthEvent = useCallback(async (params: any) => {
    try {
      await securityAuditService.logAuthEvent(params);
    } catch (err) {
      logger.error('Failed to log auth event:', err);
    }
  }, []);

  const logDataAccess = useCallback(async (params: any) => {
    try {
      await securityAuditService.logDataAccess(params);
    } catch (err) {
      logger.error('Failed to log data access:', err);
    }
  }, []);

  const logSecurityEvent = useCallback(async (params: any) => {
    try {
      await securityAuditService.logSecurityEvent(params);
    } catch (err) {
      logger.error('Failed to log security event:', err);
    }
  }, []);

  const logPermissionCheck = useCallback(async (params: any) => {
    try {
      await securityAuditService.logPermissionCheck(params);
    } catch (err) {
      logger.error('Failed to log permission check:', err);
    }
  }, []);

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  const getSecurityTimeline = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);

      const result = await securityAuditService.getSecurityTimeline(filters);
      
      if (result.success && result.data) {
        // Timeline entries are different from audit logs
        // TODO: Create proper transformation from SecurityTimelineEntry[] to AnomalyDetection[]
        // or create separate state for timeline entries
        // setAnomalies(result.data as AnomalyDetection[]); // Invalid type assertion
      } else {
        setError(result.error || 'Failed to fetch timeline');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserActivity = useCallback(async (userId: string, firmId?: string) => {
    try {
      setLoading(true);
      setError(null);

      // getUserActivity expects numeric firmId, convert or use alternate approach
      const result = await securityAuditService.getUserActivity(userId);
      
      if (result.success && result.data) {
        // UserActivitySummary doesn't have logs property
        // TODO: Create proper transformation from UserActivitySummary to UserBaseline
        // or fetch baseline data separately
        // setBaseline(result.data as UserBaseline); // Invalid type assertion
      } else {
        setError(result.error || 'Failed to fetch user activity');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const getHighRiskEvents = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);

      const result = await securityAuditService.getHighRiskEvents(filters);
      
      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        setError(result.error || 'Failed to fetch high risk events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================================
  // ANOMALIES
  // ==========================================================================

  const detectLoginAnomalies = useCallback(async (userId: string, firmId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await anomalyDetectionService.detectUnusualLoginPatterns(userId, firmId);
      
      if (result.success && result.data) {
        setAnomalies(prev => [...prev, ...(result.data || [])]);
      } else {
        setError(result.error || 'Failed to detect login anomalies');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const detectDataAnomalies = useCallback(async (userId: string, firmId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await anomalyDetectionService.detectDataAccessAnomalies(userId, firmId);
      
      if (result.success && result.data) {
        setAnomalies(prev => [...prev, ...(result.data || [])]);
      } else {
        setError(result.error || 'Failed to detect data anomalies');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const detectPermissionAnomalies = useCallback(async (userId?: string, firmId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await anomalyDetectionService.detectPermissionAnomalies(userId, firmId);
      
      if (result.success && result.data) {
        setAnomalies(prev => [...prev, ...(result.data || [])]);
      } else {
        setError(result.error || 'Failed to detect permission anomalies');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const detectSessionAnomalies = useCallback(async (userId: string, firmId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await anomalyDetectionService.detectSessionAnomalies(userId, firmId);
      
      if (result.success && result.data) {
        setAnomalies(prev => [...prev, ...(result.data || [])]);
      } else {
        setError(result.error || 'Failed to detect session anomalies');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================================
  // BASELINE
  // ==========================================================================

  const buildBaseline = useCallback(async (userId: string, firmId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await anomalyDetectionService.buildUserBaseline(userId, firmId);
      
      if (result) {
        setBaseline(result);
      } else {
        setError('Failed to build baseline');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBaseline = useCallback(async (userId: string, firmId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await anomalyDetectionService.updateBaseline(userId, firmId);
      
      if (result.success && result.data) {
        setBaseline(result.data);
      } else {
        setError(result.error || 'Failed to update baseline');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================================
  // COMPLIANCE
  // ==========================================================================

  const generateSOC2Report = useCallback(async (
    firmId: string,
    startDate: string,
    endDate: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const result = await complianceReportingService.generateSOC2Report({
        firmId,
        periodStart: startDate,
        periodEnd: endDate
      });
      
      if (result.success && result.data) {
        setComplianceReport(result.data);
      } else {
        setError(result.error || 'Failed to generate SOC2 report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateGDPRReport = useCallback(async (
    firmId: string,
    startDate: string,
    endDate: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const result = await complianceReportingService.generateGDPRReport({
        firmId,
        periodStart: startDate,
        periodEnd: endDate
      });
      
      if (result.success && result.data) {
        setComplianceReport(result.data);
      } else {
        setError(result.error || 'Failed to generate GDPR report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateHIPAAReport = useCallback(async (
    firmId: string,
    startDate: string,
    endDate: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const result = await complianceReportingService.generateHIPAAReport({
        firmId,
        periodStart: startDate,
        periodEnd: endDate
      });
      
      if (result.success && result.data) {
        setComplianceReport(result.data);
      } else {
        setError(result.error || 'Failed to generate HIPAA report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refresh = useCallback(async () => {
    await getLogs();
  }, [getLogs]);

  // Auto refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    // Audit logs
    logs,
    loading,
    error,
    getLogs,
    searchLogs,
    exportLogs,
    
    // Security events
    logAuthEvent,
    logDataAccess,
    logSecurityEvent,
    logPermissionCheck,
    
    // Analytics
    getSecurityTimeline,
    getUserActivity,
    getHighRiskEvents,
    
    // Anomalies
    anomalies,
    detectLoginAnomalies,
    detectDataAnomalies,
    detectPermissionAnomalies,
    detectSessionAnomalies,
    
    // Baseline
    baseline,
    buildBaseline,
    updateBaseline,
    
    // Compliance
    complianceReport,
    generateSOC2Report,
    generateGDPRReport,
    generateHIPAAReport,
    
    // Refresh
    refresh
  };
}
