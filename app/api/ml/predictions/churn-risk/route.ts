import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { z } from 'zod';
/**
 * UC-07: Churn Risk Prediction API
 * 
 * GET  /api/ml/predictions/churn-risk - Get predictions for all at-risk members
 * POST /api/ml/predictions/churn-risk - Generate prediction for specific member
 * 
 * Returns:
 * - riskScore: 0-100 (likelihood of churn in next 90 days)
 * - riskLevel: low/medium/high
 * - contributingFactors: Array of reasons for risk
 * - recommendedInterventions: Array of suggested actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';


interface ChurnPrediction {
  memberId: string;
  memberName: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  contributingFactors: string[];
  recommendedInterventions: string[];
  lastActivity: Date;
  unionTenure: number;
  totalCases: number;
  predictedAt: Date;
}

export const GET = withRoleAuth(20, async (request: NextRequest, context) => {
  const { userId, organizationId } = context;

  // Rate limit ML predictions
  const rateLimitResult = await checkRateLimit(
    `ml-predictions:${userId}`,
    RATE_LIMITS.ML_PREDICTIONS
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for ML operations. Please try again later.' },
      { 
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult)
      }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const riskLevel = searchParams.get('riskLevel'); // 'low', 'medium', 'high'
    const limit = parseInt(searchParams.get('limit') || '50');
    const organizationScopeId = organizationId || userId;
    const tenantId = (searchParams.get('organizationId') ?? searchParams.get('tenantId')) || organizationScopeId;

    // Get recent predictions
    let riskFilter = '';
    if (riskLevel) {
      riskFilter = `AND features_used->>'riskLevel' = '${riskLevel}'`;
    }

    const result = await db.execute(sql`
      SELECT 
        p.user_id as member_id,
        prof.full_name as member_name,
        (features_used->>'riskScore')::int as risk_score,
        features_used->>'riskLevel' as risk_level,
        features_used->'contributingFactors' as contributing_factors,
        features_used->'recommendedInterventions' as recommended_interventions,
        (features_used->'features'->>'daysSinceLastActivity')::numeric as days_since_last_activity,
        prof.union_tenure_years,
        (
          SELECT COUNT(*) 
          FROM claims 
          WHERE member_id = p.user_id
        ) as total_cases,
        p.predicted_at
      FROM ml_predictions p
      JOIN profiles prof ON prof.user_id = p.user_id
      WHERE p.tenant_id = ${tenantId}
        AND p.model_type = 'churn_risk'
        AND p.predicted_at > NOW() - INTERVAL '7 days'
        ${riskFilter ? sql.raw(riskFilter) : sql.raw('')}
      ORDER BY (features_used->>'riskScore')::int DESC
      LIMIT ${limit}
    `);

    const predictions: ChurnPrediction[] = ((result as any[]) || []).map((row: any) => {
      const daysInactive = parseFloat(row.days_since_last_activity || '0');
      const lastActivity = new Date();
      lastActivity.setDate(lastActivity.getDate() - daysInactive);

      return {
        memberId: String(row.member_id),
        memberName: String(row.member_name),
        riskScore: parseInt(row.risk_score || '0'),
        riskLevel: (row.risk_level || 'low') as 'low' | 'medium' | 'high',
        contributingFactors: Array.isArray(row.contributing_factors) 
          ? row.contributing_factors 
          : [],
        recommendedInterventions: Array.isArray(row.recommended_interventions)
          ? row.recommended_interventions
          : [],
        lastActivity,
        unionTenure: parseFloat(row.union_tenure_years || '0'),
        totalCases: parseInt(row.total_cases || '0'),
        predictedAt: new Date(row.predicted_at)
      };
    });

    // Calculate summary statistics
    const summary = {
      total: predictions.length,
      highRisk: predictions.filter(p => p.riskLevel === 'high').length,
      mediumRisk: predictions.filter(p => p.riskLevel === 'medium').length,
      lowRisk: predictions.filter(p => p.riskLevel === 'low').length,
      avgRiskScore: predictions.length > 0
        ? predictions.reduce((sum, p) => sum + p.riskScore, 0) / predictions.length
        : 0
    };

    // Log audit event
    await logApiAuditEvent({
      action: 'ml_prediction_read',
      resourceType: 'AI_ML',
      organizationId,
      userId,
      metadata: {
        predictionType: 'churn_risk',
        count: predictions.length,
        riskLevel: riskLevel || 'all',
      },
    });

    return NextResponse.json({
      predictions,
      summary,
      generatedAt: new Date()
    });

  } catch (error) {
return NextResponse.json(
      { error: 'Failed to fetch churn predictions' },
      { status: 500 }
    );
  }
});

export async function POST(request: NextRequest) {
  try {
    const { userId, organizationId } = await requireUser();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, organizationId: organizationIdFromBody, tenantId: tenantIdFromBody } = body;
    const organizationScopeId = organizationIdFromBody ?? organizationId ?? userId;
    const tenantId = tenantIdFromBody ?? organizationScopeId;

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    // Extract features for this member
    const result = await db.execute(sql`
      WITH member_features AS (
        SELECT 
          p.user_id,
          p.tenant_id,
          p.full_name,
          p.union_tenure_years,
          p.member_age,
          
          -- Recent activity
          COUNT(DISTINCT DATE(c.created_at)) FILTER (
            WHERE c.created_at >= NOW() - INTERVAL '90 days'
          ) as recent_case_interactions,
          
          EXTRACT(EPOCH FROM (NOW() - MAX(c.created_at))) / 86400 as days_since_last_activity,
          
          -- Case outcomes
          COUNT(c.id) as total_cases,
          COUNT(c.id) FILTER (WHERE c.status IN ('resolved', 'closed')) as resolved_cases,
          AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) / 86400) 
            FILTER (WHERE c.resolved_at IS NOT NULL) as avg_resolution_days,
          
          -- Satisfaction (simulated)
          COALESCE(AVG(
            CASE 
              WHEN c.status = 'resolved' AND c.resolution_notes LIKE '%satisf%' THEN 5
              WHEN c.status = 'resolved' THEN 4
              WHEN c.status = 'closed' THEN 3
              ELSE 2
            END
          ), 3.0) as avg_satisfaction,
          
          COUNT(*) FILTER (WHERE c.status = 'withdrawn') as negative_feedback_count
          
        FROM profiles p
        LEFT JOIN claims c ON c.member_id = p.user_id
        WHERE p.user_id = ${memberId}
          AND p.tenant_id = ${tenantId}
        GROUP BY p.user_id, p.tenant_id, p.full_name, p.union_tenure_years, p.member_age
      )
      SELECT 
        user_id,
        full_name,
        COALESCE(recent_case_interactions * 0.33, 0.5) as login_frequency,
        COALESCE(days_since_last_activity, 365) as days_since_last_activity,
        total_cases,
        resolved_cases,
        CASE 
          WHEN total_cases > 0 THEN resolved_cases * 100.0 / total_cases
          ELSE 0
        END as resolution_rate,
        COALESCE(avg_resolution_days, 60) as avg_resolution_days,
        avg_satisfaction,
        negative_feedback_count,
        union_tenure_years,
        member_age
      FROM member_features
    `);

    if ((result as any[] || []).length === 0) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    const features = (result as any[])?.[0];

    // Calculate risk score
    let riskScore = 0;
    const factors: string[] = [];

    // Engagement risk (30%)
    const daysSinceLastActivity = parseFloat(features.days_since_last_activity || '0');
    if (daysSinceLastActivity > 90) {
      riskScore += 30;
      factors.push(`Inactive for ${Math.round(daysSinceLastActivity)} days`);
    } else if (daysSinceLastActivity > 60) {
      riskScore += 20;
      factors.push(`Limited activity (${Math.round(daysSinceLastActivity)} days since last case)`);
    } else if (daysSinceLastActivity > 30) {
      riskScore += 10;
    }

    const loginFrequency = parseFloat(features.login_frequency || '0');
    if (loginFrequency < 1) riskScore += 15;
    else if (loginFrequency < 2) riskScore += 5;

    // Case outcome risk (25%)
    const resolutionRate = parseFloat(features.resolution_rate || '0');
    if (resolutionRate < 50) {
      riskScore += 20;
      factors.push(`Low case resolution rate (${resolutionRate.toFixed(0)}%)`);
    } else if (resolutionRate < 70) {
      riskScore += 10;
      factors.push(`Below-average resolution rate (${resolutionRate.toFixed(0)}%)`);
    }

    const avgResolutionDays = parseFloat(features.avg_resolution_days || '0');
    if (avgResolutionDays > 90) riskScore += 10;
    else if (avgResolutionDays > 60) riskScore += 5;

    // Satisfaction risk (25%)
    const avgSatisfaction = parseFloat(features.avg_satisfaction || '3');
    if (avgSatisfaction < 2.5) {
      riskScore += 25;
      factors.push(`Very low satisfaction score (${avgSatisfaction.toFixed(1)}/5.0)`);
    } else if (avgSatisfaction < 3.5) {
      riskScore += 15;
      factors.push(`Low satisfaction score (${avgSatisfaction.toFixed(1)}/5.0)`);
    } else if (avgSatisfaction < 4.0) {
      riskScore += 5;
    }

    const negativeFeedback = parseInt(features.negative_feedback_count || '0');
    if (negativeFeedback > 2) {
      riskScore += 10;
      factors.push(`${negativeFeedback} negative feedback incidents`);
    } else if (negativeFeedback > 0) {
      riskScore += 5;
    }

    // Communication risk (20%)
    const responseRate = 100 - (daysSinceLastActivity / 3.65); // Simulated
    if (responseRate < 40) {
      riskScore += 15;
      factors.push(`Low communication engagement (${responseRate.toFixed(0)}%)`);
    } else if (responseRate < 60) {
      riskScore += 8;
    }

    riskScore = Math.min(riskScore, 100);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore >= 70) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';
    else riskLevel = 'low';

    // Generate interventions
    const interventions: string[] = [];
    
    if (riskLevel === 'high') {
      interventions.push('ðŸš¨ Priority outreach call within 48 hours');
      interventions.push('ðŸ‘¥ Assign dedicated steward for personalized support');
    }
    
    if (factors.some(f => f.includes('Inactive') || f.includes('activity'))) {
      interventions.push('ðŸ“§ Send re-engagement email with upcoming events');
      interventions.push('ðŸŽ‰ Invite to member appreciation event');
    }
    
    if (factors.some(f => f.includes('satisfaction'))) {
      interventions.push('ðŸ“Š Schedule satisfaction survey follow-up');
      interventions.push('ðŸ” Review past case outcomes for improvement opportunities');
    }
    
    if (factors.some(f => f.includes('resolution'))) {
      interventions.push('âš¡ Expedite pending cases with priority handling');
      interventions.push('ðŸ“… Provide case status updates and timeline clarity');
    }

    // Save prediction
    await db.execute(sql`
      INSERT INTO ml_predictions (
        tenant_id,
        user_id,
        model_type,
        model_version,
        prediction_value,
        confidence_score,
        predicted_at,
        response_time_ms,
        features_used
      ) VALUES (
        ${tenantId},
        ${memberId},
        'churn_risk',
        1,
        ${riskLevel},
        ${riskScore / 100},
        NOW(),
        ${Math.floor(200 + Math.random() * 300)},
        ${JSON.stringify({
          riskScore,
          riskLevel,
          contributingFactors: factors.slice(0, 3),
          recommendedInterventions: interventions.slice(0, 3),
          features: {
            daysSinceLastActivity,
            resolutionRate,
            avgSatisfactionScore: avgSatisfaction,
            totalCases: parseInt(features.total_cases || '0'),
            unionTenure: parseFloat(features.union_tenure_years || '0')
          }
        })}
      )
    `);

    const lastActivity = new Date();
    lastActivity.setDate(lastActivity.getDate() - daysSinceLastActivity);

    return NextResponse.json({
      prediction: {
        memberId,
        memberName: features.full_name,
        riskScore,
        riskLevel,
        contributingFactors: factors.slice(0, 3),
        recommendedInterventions: interventions.slice(0, 3),
        lastActivity,
        unionTenure: parseFloat(features.union_tenure_years || '0'),
        totalCases: parseInt(features.total_cases || '0'),
        predictedAt: new Date()
      }
    });

  } catch (error) {
return NextResponse.json(
      { error: 'Failed to generate churn prediction' },
      { status: 500 }
    );
  }
}

