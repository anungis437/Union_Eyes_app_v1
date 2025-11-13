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
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Enrich with geolocation data
    const geoData = await enrichWithGeolocation(event.ipAddress);

    // Calculate risk level if not provided
    const riskLevel = event.riskLevel || calculateRiskLevel(event);

    // Insert audit log
    const { data: auditLog, error: insertError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: event.userId,
        firm_id: event.firmId,
        session_id: event.sessionId,
        action_type: event.actionType,
        action_category: event.actionCategory,
        resource_type: event.resourceType,
        resource_id: event.resourceId,
        result: event.result,
        risk_level: riskLevel,
        before_state: event.beforeState,
        after_state: event.afterState,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        city: geoData.city,
        region: geoData.region,
        country: geoData.country,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
        metadata: event.metadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Check for anomalies (high-risk events)
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await detectAnomalies(supabase, event, auditLog);
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
  supabase: any,
  event: AuditEvent,
  auditLog: any
): Promise<void> {
  try {
    // Check for multiple failed logins
    if (event.actionType.includes('login') && event.result === 'failure') {
      const { data: recentFailures } = await supabase
        .from('login_attempts')
        .select('id')
        .eq('user_id', event.userId)
        .eq('result', 'failure')
        .gte('attempted_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (recentFailures && recentFailures.length >= 5) {
        await createAnomalyAlert(supabase, {
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
      await createAnomalyAlert(supabase, {
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
      const { data: recentDownloads } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('user_id', event.userId)
        .eq('action_type', 'data.document_downloaded')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (recentDownloads && recentDownloads.length >= 20) {
        await createAnomalyAlert(supabase, {
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
  supabase: any,
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
    await supabase.from('anomaly_detections').insert({
      type: alert.type,
      severity: alert.severity,
      confidence: 0.9,
      user_id: alert.userId,
      firm_id: alert.firmId,
      detected_at: new Date().toISOString(),
      description: alert.description,
      evidence: alert.evidence,
      deviation_score: 1.0,
      recommended_action: 'Investigate immediately',
      acknowledged: false
    });

    console.log(`Anomaly alert created: ${alert.type}`);
  } catch (error) {
    console.error('Failed to create anomaly alert:', error);
  }
}
