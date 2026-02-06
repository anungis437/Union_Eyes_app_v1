/**
 * Compliance Reporting Service
 *
 * Generates compliance reports for SOC2, GDPR, HIPAA, and other regulatory frameworks.
 * Provides automated reporting, scheduling, and export capabilities.
 *
 * @module ComplianceReportingService
 * @author CourtLens Platform Team
 * @date October 23, 2025
 * @phase Phase 2 Week 1 Day 7
 */
import type { SupabaseClient } from '@supabase/supabase-js';
/**
 * Compliance framework types
 */
export type ComplianceFramework = 'SOC2' | 'GDPR' | 'HIPAA' | 'ISO27001' | 'PCI_DSS';
/**
 * Report format types
 */
export type ReportFormat = 'json' | 'pdf' | 'csv' | 'html';
/**
 * Report schedule frequency
 */
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
/**
 * SOC2 Trust Service Criteria
 */
export type SOC2Criteria = 'security' | 'availability' | 'processing_integrity' | 'confidentiality' | 'privacy';
/**
 * GDPR Article references
 */
export type GDPRArticle = 'article_5' | 'article_6' | 'article_15' | 'article_16' | 'article_17' | 'article_18' | 'article_20' | 'article_32' | 'article_33';
/**
 * HIPAA Security Rule categories
 */
export type HIPAASafeguard = 'administrative' | 'physical' | 'technical' | 'organizational' | 'policies';
/**
 * Compliance report result
 */
export interface ComplianceReport {
    id: string;
    framework: ComplianceFramework;
    report_type: string;
    period_start: string;
    period_end: string;
    generated_at: string;
    generated_by: string;
    firm_id?: string;
    summary: ComplianceReportSummary;
    findings: ComplianceFinding[];
    metrics: ComplianceMetrics;
    recommendations: string[];
    metadata?: Record<string, any>;
}
/**
 * Compliance report summary
 */
export interface ComplianceReportSummary {
    total_events: number;
    compliant_events: number;
    non_compliant_events: number;
    compliance_rate: number;
    critical_issues: number;
    high_priority_issues: number;
    medium_priority_issues: number;
    low_priority_issues: number;
}
/**
 * Compliance finding
 */
export interface ComplianceFinding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    evidence: any[];
    recommendation: string;
    reference?: string;
    remediation_status?: 'open' | 'in_progress' | 'resolved';
}
/**
 * Compliance metrics
 */
export interface ComplianceMetrics {
    access_control: {
        total_access_attempts: number;
        successful_access: number;
        denied_access: number;
        unauthorized_attempts: number;
    };
    authentication: {
        total_login_attempts: number;
        successful_logins: number;
        failed_logins: number;
        mfa_usage_rate: number;
        suspicious_logins: number;
    };
    data_protection: {
        data_access_events: number;
        data_modifications: number;
        data_exports: number;
        data_deletions: number;
        encryption_coverage: number;
    };
    audit_logging: {
        total_audit_logs: number;
        high_risk_events: number;
        security_incidents: number;
        average_response_time_ms: number;
    };
    user_activity: {
        active_users: number;
        privileged_users: number;
        inactive_users: number;
        role_changes: number;
    };
}
/**
 * SOC2 report specific data
 */
export interface SOC2Report extends ComplianceReport {
    framework: 'SOC2';
    trust_service_criteria: Record<SOC2Criteria, {
        compliant: boolean;
        controls_tested: number;
        controls_passed: number;
        findings: ComplianceFinding[];
    }>;
}
/**
 * GDPR report specific data
 */
export interface GDPRReport extends ComplianceReport {
    framework: 'GDPR';
    articles: Record<GDPRArticle, {
        compliant: boolean;
        requirements_met: number;
        requirements_total: number;
        findings: ComplianceFinding[];
    }>;
    data_subject_requests: {
        access_requests: number;
        rectification_requests: number;
        erasure_requests: number;
        portability_requests: number;
        average_response_time_days: number;
    };
}
/**
 * HIPAA report specific data
 */
export interface HIPAAReport extends ComplianceReport {
    framework: 'HIPAA';
    safeguards: Record<HIPAASafeguard, {
        compliant: boolean;
        controls_implemented: number;
        controls_required: number;
        findings: ComplianceFinding[];
    }>;
    phi_access: {
        total_phi_access_events: number;
        authorized_access: number;
        unauthorized_attempts: number;
        audit_trail_completeness: number;
    };
}
/**
 * User activity report
 */
export interface UserActivityReport {
    user_id: string;
    user_email: string;
    period_start: string;
    period_end: string;
    summary: {
        total_logins: number;
        total_actions: number;
        data_accessed: number;
        data_modified: number;
        high_risk_actions: number;
        failed_attempts: number;
    };
    timeline: Array<{
        timestamp: string;
        action: string;
        resource: string;
        success: boolean;
        risk_level: string;
    }>;
    access_patterns: {
        most_active_hours: number[];
        most_accessed_resources: string[];
        unusual_activity: string[];
    };
}
/**
 * Security incident report
 */
export interface SecurityIncidentReport {
    incident_id: string;
    detected_at: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: string;
    description: string;
    affected_users: string[];
    affected_resources: string[];
    timeline: Array<{
        timestamp: string;
        event: string;
        details: string;
    }>;
    response: {
        acknowledged_at?: string;
        acknowledged_by?: string;
        resolved_at?: string;
        resolved_by?: string;
        resolution_notes?: string;
    };
    impact_assessment: {
        data_compromised: boolean;
        users_affected: number;
        systems_affected: string[];
        estimated_cost?: number;
    };
    lessons_learned?: string[];
}
/**
 * Report generation options
 */
export interface ReportGenerationOptions {
    firmId?: string;
    periodStart: Date | string;
    periodEnd: Date | string;
    format?: ReportFormat;
    includeDetails?: boolean;
    userId?: string;
}
/**
 * Scheduled report configuration
 */
export interface ScheduledReportConfig {
    id?: string;
    firm_id?: string;
    framework: ComplianceFramework;
    frequency: ReportFrequency;
    format: ReportFormat;
    recipients: string[];
    enabled: boolean;
    last_generated_at?: string;
    next_scheduled_at?: string;
    metadata?: Record<string, any>;
}
/**
 * Service result
 */
export interface ComplianceResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
}
/**
 * Compliance Reporting Service
 *
 * Generates compliance reports for various regulatory frameworks.
 */
export declare class ComplianceReportingService {
    private supabase;
    private auditService;
    constructor(supabaseClient?: SupabaseClient);
    /**
     * Generate SOC2 compliance report
     */
    generateSOC2Report(options: ReportGenerationOptions): Promise<ComplianceResult<SOC2Report>>;
    /**
     * Analyze Security criteria (CC6.1-CC6.8)
     */
    private analyzeSecurityCriteria;
    /**
     * Analyze Availability criteria (A1.1-A1.3)
     */
    private analyzeAvailabilityCriteria;
    /**
     * Analyze Processing Integrity criteria (PI1.1-PI1.5)
     */
    private analyzeProcessingIntegrityCriteria;
    /**
     * Analyze Confidentiality criteria (C1.1-C1.2)
     */
    private analyzeConfidentialityCriteria;
    /**
     * Analyze Privacy criteria (P1.1-P8.1)
     */
    private analyzePrivacyCriteria;
    /**
     * Generate GDPR compliance report
     */
    generateGDPRReport(options: ReportGenerationOptions): Promise<ComplianceResult<GDPRReport>>;
    private analyzeGDPRArticle15;
    private analyzeGDPRArticle16;
    private analyzeGDPRArticle17;
    private analyzeGDPRArticle32;
    private analyzeGDPRArticle33;
    /**
     * Generate HIPAA compliance report
     */
    generateHIPAAReport(options: ReportGenerationOptions): Promise<ComplianceResult<HIPAAReport>>;
    private analyzeHIPAATechnicalSafeguards;
    /**
     * Generate user activity report
     */
    generateUserActivityReport(userId: string, options: Omit<ReportGenerationOptions, 'userId'>): Promise<ComplianceResult<UserActivityReport>>;
    private calculateComplianceMetrics;
    private generateReportSummary;
    private generateRecommendations;
    private analyzeAccessPatterns;
    private generateReportId;
    private generateFindingId;
}
export declare const complianceReportingService: ComplianceReportingService;
export declare function createComplianceReportingService(supabaseClient?: SupabaseClient): ComplianceReportingService;
//# sourceMappingURL=complianceReportingService.d.ts.map