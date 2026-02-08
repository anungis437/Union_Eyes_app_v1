/**
 * Member Churn Risk API
 * 
 * GET /api/analytics/members/churn-risk
 * Returns members at risk of churning based on activity patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { sql, db } from '@/db';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

interface ChurnRiskMember {
  id: string;
  name: string;
  daysSinceLastActivity: number;
  totalClaims: number;
  churnRiskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
}

async function handler(req: NextRequest, context) {
  try {
    const organizationId = context.organizationId;
    const tenantId = organizationId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const riskLevel = url.searchParams.get('riskLevel') || 'all';

    // Calculate churn risk score based on:
    // - Days since last activity (weight: 50%)
    // - Total claims (weight: 30%)
    // - Claim frequency trend (weight: 20%)
    const members = await db.execute(sql`
      WITH member_activity AS (
        SELECT 
          om.id,
          CONCAT(om.first_name, ' ', om.last_name) AS name,
          COUNT(c.id) AS total_claims,
          MAX(c.created_at) AS last_claim_date,
          EXTRACT(EPOCH FROM (NOW() - MAX(c.created_at)))/86400.0 AS days_since_last_activity,
          COUNT(c.id) FILTER (WHERE c.created_at >= NOW() - INTERVAL '30 days') AS claims_last_30_days,
          COUNT(c.id) FILTER (WHERE c.created_at >= NOW() - INTERVAL '90 days') AS claims_last_90_days
        FROM organization_members om
        LEFT JOIN claims c ON c.member_id = om.id AND c.tenant_id = om.tenant_id
        WHERE om.tenant_id = ${tenantId}
          AND om.status = 'active'
        GROUP BY om.id, om.first_name, om.last_name
        HAVING MAX(c.created_at) IS NOT NULL
      )
      SELECT 
        id,
        name,
        total_claims,
        days_since_last_activity,
        -- Churn risk score calculation (0-100, higher = more risk)
        LEAST(100, GREATEST(0,
          -- Days since activity component (0-50 points)
          (days_since_last_activity / 180.0 * 50) +
          -- Low claim count component (0-30 points)
          (CASE WHEN total_claims < 3 THEN 30 ELSE 30 - (total_claims * 3) END) +
          -- Recent activity trend component (0-20 points)
          (CASE 
            WHEN claims_last_30_days = 0 THEN 20
            WHEN claims_last_90_days < 2 THEN 15
            ELSE 5
          END)
        )) AS churn_risk_score
      FROM member_activity
      WHERE days_since_last_activity >= 30  -- Only include members inactive for 30+ days
      ORDER BY churn_risk_score DESC
      LIMIT 100
    `) as any[];

    // Categorize risk levels
    const churnRisk: ChurnRiskMember[] = members
      .map(row => {
        const score = Math.round(parseFloat(row.churn_risk_score));
        let level: 'high' | 'medium' | 'low';
        
        if (score >= 70) level = 'high';
        else if (score >= 40) level = 'medium';
        else level = 'low';

        return {
          id: row.id,
          name: row.name,
          daysSinceLastActivity: Math.round(parseFloat(row.days_since_last_activity)),
          totalClaims: parseInt(row.total_claims),
          churnRiskScore: score,
          riskLevel: level,
        };
      })
      .filter(member => {
        if (riskLevel === 'all') return true;
        return member.riskLevel === riskLevel;
      });

    return NextResponse.json(churnRisk);
  } catch (error) {
    console.error('Churn risk analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch churn risk analysis' },
      { status: 500 }
    );
  }
}

export const GET = withOrganizationAuth(handler);
