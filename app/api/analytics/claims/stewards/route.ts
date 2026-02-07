/**
 * Steward Performance Analytics API
 * 
 * GET /api/analytics/claims/stewards
 * Returns performance metrics for all stewards handling claims
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { sql, db } from '@/db';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

interface StewardPerformance {
  id: string;
  name: string;
  caseload: number;
  resolvedCount: number;
  avgResolutionDays: number;
  winRate: number;
  performanceScore: number;
}

async function handler(req: NextRequest, context) {
  try {
    const tenantId = context.tenantId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const daysBack = parseInt(url.searchParams.get('days') || '30');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get steward performance metrics
    const stewards = await db.execute(sql`
      SELECT 
        om.id,
        CONCAT(om.first_name, ' ', om.last_name) AS name,
        COUNT(c.id) AS caseload,
        COUNT(c.id) FILTER (WHERE c.status = 'resolved') AS resolved_count,
        AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS avg_resolution_days,
        ROUND(100.0 * COUNT(c.id) FILTER (WHERE c.outcome = 'won') / NULLIF(COUNT(c.id) FILTER (WHERE c.outcome IS NOT NULL), 0), 1) AS win_rate
      FROM organization_members om
      LEFT JOIN claims c ON c.assigned_to = om.id AND c.tenant_id = om.tenant_id
        AND c.created_at BETWEEN ${startDate} AND ${endDate}
      WHERE om.tenant_id = ${tenantId}
        AND om.role IN ('steward', 'admin', 'organizer')
      GROUP BY om.id, om.first_name, om.last_name
      HAVING COUNT(c.id) > 0
      ORDER BY COUNT(c.id) DESC
    `) as any[];

    // Calculate performance scores (0-100)
    // Formula: Weighted average of normalized metrics
    // - Caseload handling: 30%
    // - Resolution efficiency: 30%
    // - Win rate: 40%
    
    const maxCaseload = Math.max(...stewards.map(s => parseInt(s.caseload)));
    const minResolutionDays = Math.min(...stewards.map(s => parseFloat(s.avg_resolution_days) || Infinity).filter(d => d !== Infinity));
    const maxResolutionDays = Math.max(...stewards.map(s => parseFloat(s.avg_resolution_days) || 0));

    const performance: StewardPerformance[] = stewards.map(steward => {
      const caseload = parseInt(steward.caseload);
      const resolvedCount = parseInt(steward.resolved_count);
      const avgResolutionDays = parseFloat(steward.avg_resolution_days) || 0;
      const winRate = parseFloat(steward.win_rate) || 0;

      // Normalize metrics to 0-100 scale
      const caseloadScore = maxCaseload > 0 ? (caseload / maxCaseload) * 100 : 0;
      const resolutionScore = maxResolutionDays > minResolutionDays 
        ? ((maxResolutionDays - avgResolutionDays) / (maxResolutionDays - minResolutionDays)) * 100 
        : 100;
      const winRateScore = winRate;

      // Weighted performance score
      const performanceScore = Math.round(
        (caseloadScore * 0.3) + 
        (resolutionScore * 0.3) + 
        (winRateScore * 0.4)
      );

      return {
        id: steward.id,
        name: steward.name,
        caseload,
        resolvedCount,
        avgResolutionDays,
        winRate,
        performanceScore,
      };
    });

    // Sort by performance score
    performance.sort((a, b) => b.performanceScore - a.performanceScore);

    return NextResponse.json(performance);
  } catch (error) {
    console.error('Steward performance analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch steward performance' },
      { status: 500 }
    );
  }
}

export const GET = withTenantAuth(handler);
