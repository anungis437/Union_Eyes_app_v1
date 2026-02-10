/**
 * Audit Logger Edge Function
 * 
 * Supabase Edge Function for real-time audit log capture and anomaly detection.
 * Processes incoming audit events, enriches with metadata, and triggers alerts.
 * 
 * @module AuditLoggerEdgeFunction
 * @author CourtLens Platform Team
 * @date October 23, 2025
 * @phase Phase 2 Week 1 Day 7
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { dbQuery } from '../_shared/azure-db.ts';

// ============================================================================
// TYPES
// ============================================================================

interface AuditEvent {
  userId?: string;
  firmId?: string;
  sessionId?: string;
  actionType: string;
  actionCategory: string;
  resourceType?: string;
  resourceId?: string;
  result: 'success' | 'failure' | 'partial';
  riskLevel?: string;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface GeolocationData {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  try {
    // CORS handling
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        }
      });
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request
    const event: AuditEvent = await req.json();

    // Validate required fields
    if (!event.actionType || !event.actionCategory || !event.result) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: actionType, actionCategory, result' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Enrich with geolocation data
    const geoData = await enrichWithGeolocation(event.ipAddress);

    // Calculate risk level if not provided
    const riskLevel = event.riskLevel || calculateRiskLevel(event);

    // Insert audit log
    const insertResult = await dbQuery<{ id: string }>(
      `INSERT INTO audit_logs (
        user_id, firm_id, session_id, action_type, action_category, resource_type, resource_id,
        result, risk_level, before_state, after_state, ip_address, user_agent, city, region,
        country, latitude, longitude, metadata, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20
      ) RETURNING id`,
      [
        event.userId ?? null,
        event.firmId ?? null,
        event.sessionId ?? null,
        event.actionType,
        event.actionCategory,
        event.resourceType ?? null,
        event.resourceId ?? null,
        event.result,
        riskLevel,
        event.beforeState ?? null,
        event.afterState ?? null,
        event.ipAddress ?? null,
        event.userAgent ?? null,
        geoData.city ?? null,
        geoData.region ?? null,
        geoData.country ?? null,
        geoData.latitude ?? null,
        geoData.longitude ?? null,
        event.metadata ?? null,
        new Date().toISOString()
      ]
    );
    const auditLog = insertResult.rows[0];

    // Check for anomalies (high-risk events)
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await detectAnomalies(event, auditLog);
    }

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        logId: auditLog.id,
        riskLevel 
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('Error processing audit event:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Enrich with geolocation data from IP address
 */
async function enrichWithGeolocation(ipAddress?: string): Promise<GeolocationData> {
  if (!ipAddress) {
    return {};
  }

  try {
    // In production, use a geolocation service like MaxMind or IPStack
    // For now, return mock data
    return {
      city: 'Mock City',
      region: 'Mock Region',
      country: 'US',
      latitude: 37.7749,
      longitude: -122.4194
    };
  } catch (error) {
    console.error('Geolocation enrichment failed:', error);
    return {};
  }
}

/**
 * Calculate risk level based on event characteristics
 */
function calculateRiskLevel(event: AuditEvent): string {
  // Critical risk factors
  if (
    event.actionType.includes('privilege_escalation') ||
    event.actionType.includes('admin_') ||
    event.actionType === 'auth.mfa_disabled' ||
    event.result === 'failure' && event.actionType.includes('login')
  ) {
    return 'critical';
  }

  // High risk factors
  if (
    event.actionType.includes('password_') ||
    event.actionType.includes('role_') ||
    event.actionType.includes('permission_') ||
    event.actionType === 'data.deleted' ||
    event.actionType.includes('security_')
  ) {
    return 'high';
  }

  // Medium risk factors
  if (
    event.actionType.includes('data.modified') ||
    event.actionType.includes('export') ||
    event.actionType === 'auth.session_created' ||
    event.result === 'failure'
  ) {
    return 'medium';
  }

  // Low risk (default)
  return 'low';
}

/**
 * Detect anomalies for high-risk events
 */
async function detectAnomalies(
  event: AuditEvent,
  auditLog: any
): Promise<void> {
  try {
    // Check for multiple failed logins
    if (event.actionType.includes('login') && event.result === 'failure') {
      const recentFailuresResult = await dbQuery<{ id: string }>(
        'SELECT id FROM login_attempts WHERE user_id = $1 AND result = $2 AND attempted_at >= $3',
        [event.userId ?? null, 'failure', new Date(Date.now() - 60 * 60 * 1000).toISOString()]
      );
      const recentFailures = recentFailuresResult.rows;

      if (recentFailures && recentFailures.length >= 5) {
        await createAnomalyAlert({
          type: 'excessive_failed_logins',
          severity: 'high',
          userId: event.userId,
          firmId: event.firmId,
          description: `${recentFailures.length} failed login attempts in the last hour`,
          evidence: [auditLog]
        });
      }
    }

    // Check for privilege escalation attempts
    if (event.actionType.includes('privilege_escalation')) {
      await createAnomalyAlert({
        type: 'privilege_escalation_attempt',
        severity: 'critical',
        userId: event.userId,
        firmId: event.firmId,
        description: 'Privilege escalation attempt detected',
        evidence: [auditLog]
      });
    }

    // Check for unusual data access patterns
    if (event.actionType === 'data.document_downloaded') {
      const recentDownloadsResult = await dbQuery<{ id: string }>(
        'SELECT id FROM audit_logs WHERE user_id = $1 AND action_type = $2 AND created_at >= $3',
        [event.userId ?? null, 'data.document_downloaded', new Date(Date.now() - 60 * 60 * 1000).toISOString()]
      );
      const recentDownloads = recentDownloadsResult.rows;

      if (recentDownloads && recentDownloads.length >= 20) {
        await createAnomalyAlert({
          type: 'excessive_data_downloads',
          severity: 'high',
          userId: event.userId,
          firmId: event.firmId,
          description: `${recentDownloads.length} documents downloaded in the last hour`,
          evidence: [auditLog]
        });
      }
    }
  } catch (error) {
    console.error('Anomaly detection failed:', error);
  }
}

/**
 * Create anomaly alert
 */
async function createAnomalyAlert(
  alert: {
    type: string;
    severity: string;
    userId?: string;
    firmId?: string;
    description: string;
    evidence: any[];
  }
): Promise<void> {
  try {
    await dbQuery(
      `INSERT INTO anomaly_detections (
        type, severity, confidence, user_id, firm_id, detected_at, description,
        evidence, deviation_score, recommended_action, acknowledged
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)`,
      [
        alert.type,
        alert.severity,
        0.9,
        alert.userId ?? null,
        alert.firmId ?? null,
        new Date().toISOString(),
        alert.description,
        JSON.stringify(alert.evidence ?? []),
        1.0,
        'Investigate immediately',
        false
      ]
    );

    console.log(`Anomaly alert created: ${alert.type}`);
  } catch (error) {
    console.error('Failed to create anomaly alert:', error);
  }
}
