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
import type { AuditLog, AuditLogFilters } from '../services/securityAuditService';
import type { AnomalyDetection, UserBaseline } from '../services/anomalyDetectionService';
import type { ComplianceReport } from '../services/complianceReportingService';
export interface UseSecurityAuditOptions {
    autoRefresh?: boolean;
    refreshInterval?: number;
}
export interface UseSecurityAuditReturn {
    logs: AuditLog[];
    loading: boolean;
    error: string | null;
    getLogs: (filters?: AuditLogFilters) => Promise<void>;
    searchLogs: (query: string, filters?: Partial<AuditLogFilters>) => Promise<void>;
    exportLogs: (filters?: AuditLogFilters, format?: 'json' | 'csv') => Promise<void>;
    logAuthEvent: (params: any) => Promise<void>;
    logDataAccess: (params: any) => Promise<void>;
    logSecurityEvent: (params: any) => Promise<void>;
    logPermissionCheck: (params: any) => Promise<void>;
    getSecurityTimeline: (filters?: any) => Promise<void>;
    getUserActivity: (userId: string, firmId?: string) => Promise<void>;
    getHighRiskEvents: (filters?: any) => Promise<void>;
    anomalies: AnomalyDetection[];
    detectLoginAnomalies: (userId: string, firmId?: string) => Promise<void>;
    detectDataAnomalies: (userId: string, firmId?: string) => Promise<void>;
    detectPermissionAnomalies: (userId?: string, firmId?: string) => Promise<void>;
    detectSessionAnomalies: (userId: string, firmId?: string) => Promise<void>;
    baseline: UserBaseline | null;
    buildBaseline: (userId: string, firmId?: string) => Promise<void>;
    updateBaseline: (userId: string, firmId?: string) => Promise<void>;
    complianceReport: ComplianceReport | null;
    generateSOC2Report: (firmId: string, startDate: string, endDate: string) => Promise<void>;
    generateGDPRReport: (firmId: string, startDate: string, endDate: string) => Promise<void>;
    generateHIPAAReport: (firmId: string, startDate: string, endDate: string) => Promise<void>;
    refresh: () => Promise<void>;
}
/**
 * Security audit hook
 */
export declare function useSecurityAudit(options?: UseSecurityAuditOptions): UseSecurityAuditReturn;
//# sourceMappingURL=useSecurityAudit.d.ts.map