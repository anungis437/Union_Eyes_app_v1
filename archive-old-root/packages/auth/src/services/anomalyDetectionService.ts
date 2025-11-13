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

import { getSupabaseClient } from '@unioneyes/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SecurityAuditService } from './securityAuditService';
import type { AuditLog, AuditRiskLevel } from './securityAuditService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Anomaly types
 */
export type AnomalyType =
  | 'unusual_login_location'
  | 'unusual_login_time'
  | 'excessive_failed_logins'
  | 'impossible_travel'
  | 'concurrent_sessions_multiple_locations'
  | 'unusual_data_access_pattern'
  | 'excessive_data_downloads'
  | 'after_hours_access'
  | 'privilege_escalation_attempt'
  | 'unusual_api_usage'
  | 'data_exfiltration_suspected'
  | 'account_takeover_suspected'
  | 'brute_force_attack'
  | 'sql_injection_attempt'
  | 'xss_attempt';

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

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * Anomaly Detection Service
 * 
 * Detects unusual patterns and potential security threats.
 */
export class AnomalyDetectionService {
  private supabase: SupabaseClient;
  private auditService: SecurityAuditService;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || getSupabaseClient();
    this.auditService = new SecurityAuditService(this.supabase);
  }

  // ==========================================================================
  // LOGIN PATTERN DETECTION
  // ==========================================================================

  /**
   * Detect unusual login patterns for a user
   */
  async detectUnusualLoginPatterns(
    userId: string,
    firmId?: string
  ): Promise<AnomalyResult<AnomalyDetection[]>> {
    try {
      const anomalies: AnomalyDetection[] = [];

      // Get user baseline
      const baseline = await this.getUserBaseline(userId, firmId);
      
      // Get recent logins
      const loginHistory = await this.auditService.getLoginHistory({
        userId,
        firmId,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        limit: 100
      });

      if (!loginHistory.success || !loginHistory.data) {
        return { success: true, data: [] };
      }

      const recentLogins = loginHistory.data;

      // Check for unusual locations
      for (const login of recentLogins) {
        if (baseline && login.city && !baseline.typical_login_locations.includes(login.city)) {
          anomalies.push(await this.createAnomaly({
            type: 'unusual_login_location',
            severity: 'medium',
            confidence: 0.8,
            userId,
            firmId,
            description: `Login from unusual location: ${login.city}`,
            evidence: [login],
            baseline_metrics: { typical_locations: baseline.typical_login_locations.length },
            current_metrics: { location: login.city },
            deviation_score: 0.8,
            recommended_action: 'Verify login with user'
          }));
        }

        // Check for unusual times
        const loginHour = new Date(login.attempted_at).getHours();
        if (baseline && !baseline.typical_login_hours.includes(loginHour)) {
          if (loginHour < 6 || loginHour > 22) {
            anomalies.push(await this.createAnomaly({
              type: 'unusual_login_time',
              severity: 'low',
              confidence: 0.6,
              userId,
              firmId,
              description: `Login at unusual hour: ${loginHour}:00`,
              evidence: [login],
              baseline_metrics: { typical_hours: baseline.typical_login_hours },
              current_metrics: { hour: loginHour },
              deviation_score: 0.6,
              recommended_action: 'Monitor for additional unusual activity'
            }));
          }
        }
      }

      // Check for excessive failed logins
      const failedLogins = recentLogins.filter(l => l.result !== 'success');
      if (failedLogins.length >= 5) {
        anomalies.push(await this.createAnomaly({
          type: 'excessive_failed_logins',
          severity: 'high',
          confidence: 0.9,
          userId,
          firmId,
          description: `${failedLogins.length} failed login attempts in 24 hours`,
          evidence: failedLogins,
          baseline_metrics: { normal_failures: 1 },
          current_metrics: { failures: failedLogins.length },
          deviation_score: failedLogins.length / 5,
          recommended_action: 'Consider temporary account lock or MFA enforcement'
        }));
      }

      // Check for impossible travel
      const impossibleTravel = await this.detectImpossibleTravel(recentLogins);
      if (impossibleTravel) {
        anomalies.push(impossibleTravel);
      }

      return { success: true, data: anomalies };
    } catch (error) {
      console.error('Failed to detect unusual login patterns:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detect impossible travel (logins from distant locations in short time)
   */
  private async detectImpossibleTravel(logins: any[]): Promise<AnomalyDetection | null> {
    if (logins.length < 2) return null;

    // Sort by time
    const sortedLogins = [...logins].sort(
      (a, b) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime()
    );

    for (let i = 1; i < sortedLogins.length; i++) {
      const prev = sortedLogins[i - 1];
      const curr = sortedLogins[i];

      if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
        const distance = this.calculateDistance(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude
        );

        const timeDiff = new Date(curr.attempted_at).getTime() - new Date(prev.attempted_at).getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // If traveled more than 500km in less than 1 hour, flag as impossible
        if (distance > 500 && hoursDiff < 1) {
          return await this.createAnomaly({
            type: 'impossible_travel',
            severity: 'critical',
            confidence: 0.95,
            userId: curr.user_id,
            firmId: curr.firm_id,
            description: `Impossible travel: ${distance.toFixed(0)}km in ${hoursDiff.toFixed(1)} hours`,
            evidence: [prev, curr],
            baseline_metrics: { max_distance_per_hour: 100 },
            current_metrics: { distance_km: distance, hours: hoursDiff },
            deviation_score: distance / (hoursDiff * 100),
            recommended_action: 'Block account immediately and verify with user',
            auto_blocked: true
          });
        }
      }
    }

    return null;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // ==========================================================================
  // DATA ACCESS PATTERN DETECTION
  // ==========================================================================

  /**
   * Detect unusual data access patterns
   */
  async detectDataAccessAnomalies(
    userId: string,
    firmId?: string
  ): Promise<AnomalyResult<AnomalyDetection[]>> {
    try {
      const anomalies: AnomalyDetection[] = [];

      // Get user baseline
      const baseline = await this.getUserBaseline(userId, firmId);

      // Get recent data access
      const accessHistory = await this.auditService.getDataAccessHistory({
        userId,
        firmId,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        limit: 1000
      });

      if (!accessHistory.success || !accessHistory.data) {
        return { success: true, data: [] };
      }

      const recentAccess = accessHistory.data;

      // Check for excessive downloads
      const downloads = recentAccess.filter(l => l.action_type === 'data.document_downloaded');
      if (downloads.length > 50) {
        anomalies.push(await this.createAnomaly({
          type: 'excessive_data_downloads',
          severity: 'high',
          confidence: 0.85,
          userId,
          firmId,
          description: `${downloads.length} documents downloaded in 24 hours`,
          evidence: downloads.slice(0, 10),
          baseline_metrics: { average_daily_downloads: baseline?.average_daily_actions || 10 },
          current_metrics: { downloads: downloads.length },
          deviation_score: downloads.length / 50,
          recommended_action: 'Review downloaded documents and verify legitimate business need'
        }));
      }

      // Check for after-hours access to sensitive data
      const afterHours = recentAccess.filter(l => {
        const hour = new Date(l.created_at).getHours();
        return (hour < 6 || hour > 22) && 
               (l.action_type === 'data.sensitive_data_accessed' ||
                l.action_type === 'data.pii_accessed');
      });

      if (afterHours.length > 0) {
        anomalies.push(await this.createAnomaly({
          type: 'after_hours_access',
          severity: 'medium',
          confidence: 0.7,
          userId,
          firmId,
          description: `${afterHours.length} sensitive data access events after hours`,
          evidence: afterHours,
          baseline_metrics: { typical_after_hours_access: 0 },
          current_metrics: { after_hours_count: afterHours.length },
          deviation_score: afterHours.length,
          recommended_action: 'Verify legitimate business need for after-hours access'
        }));
      }

      // Check for accessing unusual resources
      const accessedResources = new Set(recentAccess.map(l => l.resource_type).filter(Boolean));
      if (baseline) {
        const unusualResources = Array.from(accessedResources).filter(
          r => !baseline.typical_resources_accessed.includes(r!)
        );

        if (unusualResources.length > 3) {
          anomalies.push(await this.createAnomaly({
            type: 'unusual_data_access_pattern',
            severity: 'medium',
            confidence: 0.65,
            userId,
            firmId,
            description: `Accessing ${unusualResources.length} unusual resource types`,
            evidence: recentAccess.filter(l => unusualResources.includes(l.resource_type!)).slice(0, 10),
            baseline_metrics: { typical_resource_types: baseline.typical_resources_accessed.length },
            current_metrics: { unusual_types: unusualResources.length },
            deviation_score: 0.65,
            recommended_action: 'Monitor continued unusual access patterns'
          }));
        }
      }

      return { success: true, data: anomalies };
    } catch (error) {
      console.error('Failed to detect data access anomalies:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==========================================================================
  // PERMISSION ANOMALY DETECTION
  // ==========================================================================

  /**
   * Detect privilege escalation attempts
   */
  async detectPermissionAnomalies(
    userId?: string,
    firmId?: string
  ): Promise<AnomalyResult<AnomalyDetection[]>> {
    try {
      const anomalies: AnomalyDetection[] = [];

      // Get recent permission events
      const logsResult = await this.auditService.getAuditLogs({
        userId,
        firmId,
        actionType: [
          'rbac.privilege_escalation_attempted',
          'rbac.access_denied',
          'rbac.role_assigned',
          'rbac.permission_granted'
        ] as any,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        limit: 1000
      });

      if (!logsResult.success || !logsResult.data) {
        return { success: true, data: [] };
      }

      const logs = logsResult.data;

      // Check for privilege escalation attempts
      const escalations = logs.filter(l => l.action_type === 'rbac.privilege_escalation_attempted');
      if (escalations.length > 0) {
        anomalies.push(await this.createAnomaly({
          type: 'privilege_escalation_attempt',
          severity: 'critical',
          confidence: 1.0,
          userId: escalations[0].user_id,
          firmId: escalations[0].firm_id,
          description: `${escalations.length} privilege escalation attempts detected`,
          evidence: escalations,
          baseline_metrics: { normal_escalations: 0 },
          current_metrics: { attempts: escalations.length },
          deviation_score: escalations.length,
          recommended_action: 'Lock account and investigate immediately',
          auto_blocked: true
        }));
      }

      // Check for excessive denied access
      const denials = logs.filter(l => l.action_type === 'rbac.access_denied');
      const userDenials = this.groupByUser(denials);

      for (const [uid, userDenialLogs] of Object.entries(userDenials)) {
        if (userDenialLogs.length > 10) {
          anomalies.push(await this.createAnomaly({
            type: 'unusual_data_access_pattern',
            severity: 'medium',
            confidence: 0.7,
            userId: uid,
            firmId: userDenialLogs[0].firm_id,
            description: `${userDenialLogs.length} access denied events`,
            evidence: userDenialLogs.slice(0, 5),
            baseline_metrics: { normal_denials: 2 },
            current_metrics: { denials: userDenialLogs.length },
            deviation_score: userDenialLogs.length / 10,
            recommended_action: 'Review user permissions and access patterns'
          }));
        }
      }

      return { success: true, data: anomalies };
    } catch (error) {
      console.error('Failed to detect permission anomalies:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==========================================================================
  // SESSION ANOMALY DETECTION
  // ==========================================================================

  /**
   * Detect session anomalies (hijacking, concurrent sessions)
   */
  async detectSessionAnomalies(
    userId: string,
    firmId?: string
  ): Promise<AnomalyResult<AnomalyDetection[]>> {
    try {
      const anomalies: AnomalyDetection[] = [];

      // Get active sessions
      const { data: sessions, error } = await this.supabase
        .from('session_history')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('last_activity_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Check for concurrent sessions from different locations
      if (sessions && sessions.length > 1) {
        const uniqueLocations = new Set(sessions.map(s => s.city).filter(Boolean));
        
        if (uniqueLocations.size > 1) {
          anomalies.push(await this.createAnomaly({
            type: 'concurrent_sessions_multiple_locations',
            severity: 'high',
            confidence: 0.8,
            userId,
            firmId,
            description: `${sessions.length} active sessions from ${uniqueLocations.size} locations`,
            evidence: sessions,
            baseline_metrics: { typical_concurrent_sessions: 1 },
            current_metrics: { concurrent_sessions: sessions.length, locations: uniqueLocations.size },
            deviation_score: sessions.length,
            recommended_action: 'Terminate suspicious sessions and verify with user'
          }));
        }
      }

      // Check for suspicious sessions
      const suspiciousSessions = sessions?.filter(s => s.is_suspicious);
      if (suspiciousSessions && suspiciousSessions.length > 0) {
        anomalies.push(await this.createAnomaly({
          type: 'account_takeover_suspected',
          severity: 'critical',
          confidence: 0.9,
          userId,
          firmId,
          description: `${suspiciousSessions.length} suspicious sessions detected`,
          evidence: suspiciousSessions,
          baseline_metrics: { suspicious_sessions: 0 },
          current_metrics: { count: suspiciousSessions.length },
          deviation_score: suspiciousSessions.length,
          recommended_action: 'Terminate all sessions and force password reset',
          auto_blocked: true
        }));
      }

      return { success: true, data: anomalies };
    } catch (error) {
      console.error('Failed to detect session anomalies:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==========================================================================
  // BASELINE MANAGEMENT
  // ==========================================================================

  /**
   * Get or build user baseline
   */
  private async getUserBaseline(userId: string, firmId?: string): Promise<UserBaseline | null> {
    try {
      // Check if baseline exists in cache/database
      const { data: existingBaseline } = await this.supabase
        .from('user_baselines')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingBaseline) {
        return existingBaseline as UserBaseline;
      }

      // Build baseline from historical data
      return await this.buildUserBaseline(userId, firmId);
    } catch (error) {
      console.error('Failed to get user baseline:', error);
      return null;
    }
  }

  /**
   * Build user baseline from historical data
   */
  async buildUserBaseline(userId: string, firmId?: string): Promise<UserBaseline | null> {
    try {
      // Get last 30 days of data
      const logsResult = await this.auditService.getAuditLogs({
        userId,
        firmId,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        limit: 10000
      });

      if (!logsResult.success || !logsResult.data) {
        return null;
      }

      const logs = logsResult.data;

      // Calculate metrics
      const loginHours = new Set<number>();
      const locations = new Set<string>();
      const ipAddresses = new Set<string>();
      const resources = new Set<string>();

      logs.forEach(log => {
        const hour = new Date(log.created_at).getHours();
        loginHours.add(hour);

        if (log.city) locations.add(log.city);
        if (log.ip_address) ipAddresses.add(log.ip_address);
        if (log.resource_type) resources.add(log.resource_type);
      });

      const baseline: UserBaseline = {
        user_id: userId,
        firm_id: firmId,
        typical_login_hours: Array.from(loginHours),
        typical_login_locations: Array.from(locations),
        typical_ip_addresses: Array.from(ipAddresses),
        average_session_duration_minutes: 120, // Mock
        typical_resources_accessed: Array.from(resources),
        average_daily_actions: logs.length / 30,
        typical_api_calls_per_hour: logs.filter(l => l.action_type === 'api.call').length / (30 * 24),
        last_updated: new Date().toISOString(),
        data_points: logs.length
      };

      // Store baseline
      await this.supabase
        .from('user_baselines')
        .upsert(baseline, { onConflict: 'user_id' });

      return baseline;
    } catch (error) {
      console.error('Failed to build user baseline:', error);
      return null;
    }
  }

  /**
   * Update user baseline
   */
  async updateBaseline(userId: string, firmId?: string): Promise<AnomalyResult<UserBaseline>> {
    try {
      const baseline = await this.buildUserBaseline(userId, firmId);
      
      if (!baseline) {
        throw new Error('Failed to build baseline');
      }

      return { success: true, data: baseline };
    } catch (error) {
      console.error('Failed to update baseline:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==========================================================================
  // ALERT MANAGEMENT
  // ==========================================================================

  /**
   * Generate security alert from anomaly
   */
  async generateAlert(anomaly: AnomalyDetection): Promise<AnomalyResult<void>> {
    try {
      // Log as security event
      await this.auditService.logSecurityEvent({
        firmId: anomaly.firm_id,
        userId: anomaly.user_id,
        eventType: anomaly.type,
        severity: this.mapSeverityToRiskLevel(anomaly.severity),
        title: `Anomaly Detected: ${anomaly.type}`,
        description: anomaly.description,
        metadata: {
          confidence: anomaly.confidence,
          deviation_score: anomaly.deviation_score,
          auto_blocked: anomaly.auto_blocked
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to generate alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Configure alert settings
   */
  async configureAlerts(config: AlertConfig): Promise<AnomalyResult<void>> {
    try {
      // Store alert configuration
      await this.supabase
        .from('alert_configs')
        .upsert(config);

      return { success: true };
    } catch (error) {
      console.error('Failed to configure alerts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Create anomaly record
   */
  private async createAnomaly(params: {
    type: AnomalyType;
    severity: AnomalySeverity;
    confidence: number;
    userId?: string;
    firmId?: string;
    description: string;
    evidence: any[];
    baseline_metrics?: Record<string, any>;
    current_metrics?: Record<string, any>;
    deviation_score: number;
    recommended_action: string;
    auto_blocked?: boolean;
  }): Promise<AnomalyDetection> {
    const anomaly: AnomalyDetection = {
      id: this.generateAnomalyId(),
      type: params.type,
      severity: params.severity,
      confidence: params.confidence,
      user_id: params.userId,
      firm_id: params.firmId,
      detected_at: new Date().toISOString(),
      description: params.description,
      evidence: params.evidence,
      baseline_metrics: params.baseline_metrics,
      current_metrics: params.current_metrics,
      deviation_score: params.deviation_score,
      recommended_action: params.recommended_action,
      auto_blocked: params.auto_blocked || false,
      acknowledged: false
    };

    // Store anomaly
    await this.supabase
      .from('anomaly_detections')
      .insert(anomaly);

    // Generate alert
    await this.generateAlert(anomaly);

    return anomaly;
  }

  private generateAnomalyId(): string {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapSeverityToRiskLevel(severity: AnomalySeverity): AuditRiskLevel {
    const map: Record<AnomalySeverity, AuditRiskLevel> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical'
    };
    return map[severity];
  }

  private groupByUser(logs: AuditLog[]): Record<string, AuditLog[]> {
    return logs.reduce((acc, log) => {
      if (log.user_id) {
        if (!acc[log.user_id]) acc[log.user_id] = [];
        acc[log.user_id].push(log);
      }
      return acc;
    }, {} as Record<string, AuditLog[]>);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const anomalyDetectionService = new AnomalyDetectionService();

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createAnomalyDetectionService(supabaseClient?: SupabaseClient): AnomalyDetectionService {
  return new AnomalyDetectionService(supabaseClient);
}
