/**
 * Anomaly Detection Service
 *
 * AI-powered anomaly detection for security events, login patterns,
 * data access, and user behavior. Provides real-time alerting and
 * baseline tracking.
 *
 * @module AnomalyDetectionService
 * @author CourtLens Platform Team
 * @date October 23, 2025
 * @phase Phase 2 Week 1 Day 7
 */
import type { SupabaseClient } from '@supabase/supabase-js';
/**
 * Anomaly types
 */
export type AnomalyType = 'unusual_login_location' | 'unusual_login_time' | 'excessive_failed_logins' | 'impossible_travel' | 'concurrent_sessions_multiple_locations' | 'unusual_data_access_pattern' | 'excessive_data_downloads' | 'after_hours_access' | 'privilege_escalation_attempt' | 'unusual_api_usage' | 'data_exfiltration_suspected' | 'account_takeover_suspected' | 'brute_force_attack' | 'sql_injection_attempt' | 'xss_attempt';
/**
 * Anomaly severity
 */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
/**
 * Anomaly detection result
 */
export interface AnomalyDetection {
    id: string;
    type: AnomalyType;
    severity: AnomalySeverity;
    confidence: number;
    user_id?: string;
    firm_id?: string;
    detected_at: string;
    description: string;
    evidence: any[];
    baseline_metrics?: Record<string, number>;
    current_metrics?: Record<string, number>;
    deviation_score: number;
    recommended_action: string;
    auto_blocked?: boolean;
    acknowledged?: boolean;
    acknowledged_by?: string;
    acknowledged_at?: string;
    false_positive?: boolean;
    metadata?: Record<string, any>;
}
/**
 * User baseline metrics
 */
export interface UserBaseline {
    user_id: string;
    firm_id?: string;
    typical_login_hours: number[];
    typical_login_locations: string[];
    typical_ip_addresses: string[];
    average_session_duration_minutes: number;
    typical_resources_accessed: string[];
    average_daily_actions: number;
    typical_api_calls_per_hour: number;
    last_updated: string;
    data_points: number;
}
/**
 * Detection rule configuration
 */
export interface DetectionRule {
    id: string;
    name: string;
    type: AnomalyType;
    enabled: boolean;
    severity: AnomalySeverity;
    threshold: number;
    auto_block: boolean;
    notification_enabled: boolean;
    notification_channels: string[];
    metadata?: Record<string, any>;
}
/**
 * Alert configuration
 */
export interface AlertConfig {
    enabled: boolean;
    channels: Array<'email' | 'slack' | 'webhook' | 'in_app'>;
    recipients: string[];
    severity_threshold: AnomalySeverity;
    rate_limit_per_hour?: number;
}
/**
 * Service result
 */
export interface AnomalyResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
}
/**
 * Anomaly Detection Service
 *
 * Detects unusual patterns and potential security threats.
 */
export declare class AnomalyDetectionService {
    private supabase;
    private auditService;
    constructor(supabaseClient?: SupabaseClient);
    /**
     * Detect unusual login patterns for a user
     */
    detectUnusualLoginPatterns(userId: string, firmId?: string): Promise<AnomalyResult<AnomalyDetection[]>>;
    /**
     * Detect impossible travel (logins from distant locations in short time)
     */
    private detectImpossibleTravel;
    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    private calculateDistance;
    private deg2rad;
    /**
     * Detect unusual data access patterns
     */
    detectDataAccessAnomalies(userId: string, firmId?: string): Promise<AnomalyResult<AnomalyDetection[]>>;
    /**
     * Detect privilege escalation attempts
     */
    detectPermissionAnomalies(userId?: string, firmId?: string): Promise<AnomalyResult<AnomalyDetection[]>>;
    /**
     * Detect session anomalies (hijacking, concurrent sessions)
     */
    detectSessionAnomalies(userId: string, firmId?: string): Promise<AnomalyResult<AnomalyDetection[]>>;
    /**
     * Get or build user baseline
     */
    private getUserBaseline;
    /**
     * Build user baseline from historical data
     */
    buildUserBaseline(userId: string, firmId?: string): Promise<UserBaseline | null>;
    /**
     * Update user baseline
     */
    updateBaseline(userId: string, firmId?: string): Promise<AnomalyResult<UserBaseline>>;
    /**
     * Generate security alert from anomaly
     */
    generateAlert(anomaly: AnomalyDetection): Promise<AnomalyResult<void>>;
    /**
     * Configure alert settings
     */
    configureAlerts(config: AlertConfig): Promise<AnomalyResult<void>>;
    /**
     * Create anomaly record
     */
    private createAnomaly;
    private generateAnomalyId;
    private mapSeverityToRiskLevel;
    private groupByUser;
}
export declare const anomalyDetectionService: AnomalyDetectionService;
export declare function createAnomalyDetectionService(supabaseClient?: SupabaseClient): AnomalyDetectionService;
//# sourceMappingURL=anomalyDetectionService.d.ts.map