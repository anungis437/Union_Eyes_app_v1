/**
 * LRO Metrics API
 * 
 * Returns aggregated metrics for LRO dashboard and analytics.
 */

import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { cases } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import {
  getAggregatedMetrics,
  calculateSLAComplianceRate,
  calculateAvgResolutionTime,
  calculateSignalActionRate,
  type AggregatedMetrics,
} from '@/lib/services/lro-metrics';
import { detectAllSignals, getDashboardStats } from '@/lib/services/lro-signals';

/**
 * GET /api/admin/lro/metrics
 * 
 * Query Parameters:
 * - startDate: ISO date string (default: 30 days ago)
 * - endDate: ISO date string (default: now)
 * - organizationId: Filter by organization (optional)
 */
export async function GET(request: Request) {
  try {
    const { userId, orgId } = await getAuth(request as any);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const organizationId = searchParams.get('organizationId') || orgId || undefined;
    
    // Default to last 30 days
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Fetch cases for the period
    const casesData = await db
      .select()
      .from(cases)
      .where(
        and(
          gte(cases.createdAt, startDate),
          lte(cases.createdAt, endDate),
          organizationId ? eq(cases.organizationId, organizationId) : undefined
        )
      );
    
    // Calculate case metrics
    const totalCases = casesData.length;
    const openCases = casesData.filter(c => 
      !['resolved', 'closed', 'withdrawn'].includes(c.currentState)
    ).length;
    const resolvedCases = casesData.filter(c =>
      ['resolved', 'closed'].includes(c.currentState)
    ).length;
    
    // Calculate average resolution time (for resolved cases)
    const avgResolutionTimeHours = calculateAvgResolutionTime(
      casesData.map(c => ({
        createdAt: c.createdAt,
        resolvedAt: ['resolved', 'closed'].includes(c.currentState) 
          ? c.lastUpdated 
          : null,
      }))
    );
    
    // Calculate SLA compliance
    const slaComplianceRate = calculateSLAComplianceRate(
      casesData.map(c => ({
        id: c.id,
        slaStatus: c.slaStatus as 'compliant' | 'at_risk' | 'breached',
      }))
    );
    
    // Detect signals for all cases
    const currentDate = new Date();
    const allSignals = detectAllSignals(
      casesData.map(c => ({
        id: c.id,
        title: c.title,
        currentState: c.currentState,
        priority: c.priority as 'low' | 'medium' | 'high' | 'urgent',
        submittedDate: c.createdAt,
        acknowledgedDate: c.acknowledgedAt || undefined,
        memberName: c.memberName || 'Unknown',
        assignedOfficerId: c.assignedOfficerId || undefined,
        slaStatus: c.slaStatus as 'compliant' | 'at_risk' | 'breached',
        slaType: c.slaType as 'acknowledgment' | 'investigation' | 'response' | null,
        lastUpdated: c.lastUpdated,
      })),
      currentDate
    );
    
    const dashboardStats = getDashboardStats(allSignals);
    
    // Calculate signal action rate (for now, estimate based on resolved cases)
    const signalActionRate = resolvedCases > 0 
      ? (resolvedCases / totalCases) * 100 
      : 0;
    
    // Build aggregated metrics response
    const metrics: AggregatedMetrics = {
      totalCases,
      openCases,
      resolvedCases,
      avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 10) / 10,
      slaComplianceRate: Math.round(slaComplianceRate * 10) / 10,
      
      totalSignals: allSignals.length,
      criticalSignals: dashboardStats.critical,
      urgentSignals: dashboardStats.urgent,
      signalActionRate: Math.round(signalActionRate * 10) / 10,
      
      avgCasesPerOfficer: 0, // Would calculate from officer assignments
      avgResponseTimeHours: avgResolutionTimeHours,
      
      featureAdoptionRate: {}, // Would track from feature flag evaluations
      dashboardActiveUsers: 0, // Would track from dashboard views
      
      startDate,
      endDate,
    };
    
    return NextResponse.json({
      metrics,
      dashboardStats,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysIncluded: Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)),
      },
    });
  } catch (error) {
return NextResponse.json(
      { 
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

