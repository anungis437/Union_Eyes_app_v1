/**
 * Health & Safety Dashboard API Route
 * 
 * Provides summary metrics and analytics for health & safety management.
 * Returns key statistics, trends, and alerts for dashboard displays.
 * 
 * Authentication: Minimum role level 30 (health_safety_rep)
 * RLS: Organization-level isolation enforced by database policies
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  workplaceIncidents, 
  safetyInspections, 
  hazardReports,
  ppeEquipment 
} from "@/db/schema/domains/health-safety/health-safety-schema";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

/**
 * GET /api/health-safety/dashboard
 * Retrieve comprehensive health & safety metrics
 * 
 * Query parameters:
 * - period: Time period for metrics (7d, 30d, 90d, 1y, all) - default 30d
 * - workplaceId: Optional filter by specific workplace
 */
export const GET = withEnhancedRoleAuth(30, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";
    const workplaceId = searchParams.get("workplaceId");

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(2000); // Far back date for all records
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return withRLSContext(async (tx) => {
      // Build workplace filter if provided
      const workplaceCondition = workplaceId ? eq(workplaceIncidents.workplaceId, workplaceId) : undefined;

      // ===================================================================
      // INCIDENTS METRICS
      // ===================================================================
      const incidentsStats = await tx
        .select({
          total: sql<number>`count(*)`,
          critical: sql<number>`count(*) filter (where ${workplaceIncidents.severity} = 'critical')`,
          fatal: sql<number>`count(*) filter (where ${workplaceIncidents.severity} = 'fatal')`,
          serious: sql<number>`count(*) filter (where ${workplaceIncidents.severity} = 'serious')`,
          moderate: sql<number>`count(*) filter (where ${workplaceIncidents.severity} = 'moderate')`,
          minor: sql<number>`count(*) filter (where ${workplaceIncidents.severity} = 'minor')`,
          nearMiss: sql<number>`count(*) filter (where ${workplaceIncidents.severity} = 'near_miss')`,
          
          open: sql<number>`count(*) filter (where ${workplaceIncidents.status} = 'reported')`,
          investigating: sql<number>`count(*) filter (where ${workplaceIncidents.status} = 'investigating')`,
          closed: sql<number>`count(*) filter (where ${workplaceIncidents.status} = 'closed')`,
          
          totalLostTimeDays: sql<number>`sum(${workplaceIncidents.lostTimeDays})`,
          avgLostTimeDays: sql<number>`avg(${workplaceIncidents.lostTimeDays})`,
        })
        .from(workplaceIncidents)
        .where(
          and(
            gte(workplaceIncidents.incidentDate, startDate),
            lte(workplaceIncidents.incidentDate, endDate),
            workplaceCondition
          )
        );

      // Recent critical incidents
      const recentCriticalIncidents = await tx
        .select({
          id: workplaceIncidents.id,
          incidentNumber: workplaceIncidents.incidentNumber,
          incidentType: workplaceIncidents.incidentType,
          severity: workplaceIncidents.severity,
          incidentDate: workplaceIncidents.incidentDate,
          locationDescription: workplaceIncidents.locationDescription,
          description: workplaceIncidents.description,
          status: workplaceIncidents.status,
        })
        .from(workplaceIncidents)
        .where(
          and(
            sql`${workplaceIncidents.severity} IN ('critical', 'fatal', 'serious')`,
            gte(workplaceIncidents.incidentDate, startDate),
            workplaceCondition
          )
        )
        .orderBy(desc(workplaceIncidents.incidentDate))
        .limit(10);

      // ===================================================================
      // INSPECTIONS METRICS
      // ===================================================================
      const inspectionsStats = await tx
        .select({
          total: sql<number>`count(*)`,
          completed: sql<number>`count(*) filter (where ${safetyInspections.status} = 'completed')`,
          scheduled: sql<number>`count(*) filter (where ${safetyInspections.status} = 'scheduled')`,
          inProgress: sql<number>`count(*) filter (where ${safetyInspections.status} = 'in_progress')`,
          overdue: sql<number>`count(*) filter (where ${safetyInspections.status} = 'overdue')`,
          requiresFollowup: sql<number>`count(*) filter (where ${safetyInspections.followUpRequired} = true and ${safetyInspections.followUpCompleted} = false)`,
          
          avgScore: sql<number>`avg(${safetyInspections.scorePercentage})`,
          totalHazardsFound: sql<number>`sum(${safetyInspections.hazardsIdentified})`,
          criticalHazardsFound: sql<number>`sum(${safetyInspections.criticalHazards})`,
        })
        .from(safetyInspections)
        .where(
          and(
            gte(safetyInspections.scheduledDate, startDate),
            lte(safetyInspections.scheduledDate, endDate),
            workplaceId ? eq(safetyInspections.workplaceId, workplaceId) : undefined
          )
        );

      // Upcoming inspections
      const upcomingInspections = await tx
        .select({
          id: safetyInspections.id,
          inspectionNumber: safetyInspections.inspectionNumber,
          inspectionType: safetyInspections.inspectionType,
          scheduledDate: safetyInspections.scheduledDate,
          workplaceName: safetyInspections.workplaceName,
          status: safetyInspections.status,
        })
        .from(safetyInspections)
        .where(
          and(
            gte(safetyInspections.scheduledDate, new Date()),
            sql`${safetyInspections.status} IN ('scheduled', 'in_progress')`,
            workplaceId ? eq(safetyInspections.workplaceId, workplaceId) : undefined
          )
        )
        .orderBy(safetyInspections.scheduledDate)
        .limit(10);

      // ===================================================================
      // HAZARDS METRICS
      // ===================================================================
      const hazardsStats = await tx
        .select({
          total: sql<number>`count(*)`,
          extreme: sql<number>`count(*) filter (where ${hazardReports.hazardLevel} = 'extreme')`,
          critical: sql<number>`count(*) filter (where ${hazardReports.hazardLevel} = 'critical')`,
          high: sql<number>`count(*) filter (where ${hazardReports.hazardLevel} = 'high')`,
          moderate: sql<number>`count(*) filter (where ${hazardReports.hazardLevel} = 'moderate')`,
          low: sql<number>`count(*) filter (where ${hazardReports.hazardLevel} = 'low')`,
          
          reported: sql<number>`count(*) filter (where ${hazardReports.status} = 'reported')`,
          assessed: sql<number>`count(*) filter (where ${hazardReports.status} = 'assessed')`,
          assigned: sql<number>`count(*) filter (where ${hazardReports.status} = 'assigned')`,
          resolved: sql<number>`count(*) filter (where ${hazardReports.status} = 'resolved')`,
          closed: sql<number>`count(*) filter (where ${hazardReports.status} = 'closed')`,
          
          avgRiskScore: sql<number>`avg(${hazardReports.riskScore})`,
        })
        .from(hazardReports)
        .where(
          and(
            gte(hazardReports.reportedDate, startDate),
            lte(hazardReports.reportedDate, endDate),
            workplaceId ? eq(hazardReports.workplaceId, workplaceId) : undefined
          )
        );

      // Active high-risk hazards
      const activeHighRiskHazards = await tx
        .select({
          id: hazardReports.id,
          reportNumber: hazardReports.reportNumber,
          hazardCategory: hazardReports.hazardCategory,
          hazardLevel: hazardReports.hazardLevel,
          reportedDate: hazardReports.reportedDate,
          specificLocation: hazardReports.specificLocation,
          hazardDescription: hazardReports.hazardDescription,
          status: hazardReports.status,
          riskScore: hazardReports.riskScore,
        })
        .from(hazardReports)
        .where(
          and(
            sql`${hazardReports.hazardLevel} IN ('extreme', 'critical', 'high')`,
            sql`${hazardReports.status} NOT IN ('resolved', 'closed')`,
            workplaceId ? eq(hazardReports.workplaceId, workplaceId) : undefined
          )
        )
        .orderBy(desc(hazardReports.riskScore), desc(hazardReports.reportedDate))
        .limit(10);

      // ===================================================================
      // PPE INVENTORY METRICS
      // ===================================================================
      const ppeStats = await tx
        .select({
          totalInStock: sql<number>`sum(${ppeEquipment.quantityInStock})`,
          totalIssued: sql<number>`sum(${ppeEquipment.quantityIssued})`,
          itemsInStock: sql<number>`count(*) filter (where ${ppeEquipment.status} = 'in_stock')`,
          itemsIssued: sql<number>`count(*) filter (where ${ppeEquipment.status} = 'issued')`,
          lowStockItems: sql<number>`count(*) filter (where ${ppeEquipment.quantityInStock} <= ${ppeEquipment.reorderLevel})`,
          expiringItems: sql<number>`count(*) filter (where ${ppeEquipment.expiryDate} <= current_date + interval '30 days')`,
        })
        .from(ppeEquipment);

      // ===================================================================
      // TRENDS DATA (Monthly aggregation)
      // ===================================================================
      const monthlyIncidentTrend = await tx
        .select({
          month: sql<string>`to_char(${workplaceIncidents.incidentDate}, 'YYYY-MM')`,
          count: sql<number>`count(*)`,
          critical: sql<number>`count(*) filter (where ${workplaceIncidents.severity} IN ('critical', 'fatal', 'serious'))`,
        })
        .from(workplaceIncidents)
        .where(
          and(
            gte(workplaceIncidents.incidentDate, startDate),
            lte(workplaceIncidents.incidentDate, endDate),
            workplaceCondition
          )
        )
        .groupBy(sql`to_char(${workplaceIncidents.incidentDate}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${workplaceIncidents.incidentDate}, 'YYYY-MM')`);

      // ===================================================================
      // COMPILE RESPONSE
      // ===================================================================
      const dashboard = {
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        
        incidents: {
          summary: incidentsStats[0],
          recentCritical: recentCriticalIncidents,
        },
        
        inspections: {
          summary: inspectionsStats[0],
          upcoming: upcomingInspections,
        },
        
        hazards: {
          summary: hazardsStats[0],
          activeHighRisk: activeHighRiskHazards,
        },
        
        ppe: {
          summary: ppeStats[0],
        },
        
        trends: {
          monthlyIncidents: monthlyIncidentTrend,
        },
        
        alerts: {
          criticalIncidents: (incidentsStats[0]?.critical || 0) + (incidentsStats[0]?.fatal || 0),
          overdueInspections: inspectionsStats[0]?.overdue || 0,
          highRiskHazards: (hazardsStats[0]?.extreme || 0) + (hazardsStats[0]?.critical || 0),
          lowStockPPE: ppeStats[0]?.lowStockItems || 0,
          expiringPPE: ppeStats[0]?.expiringItems || 0,
        },
      };

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/health-safety/dashboard',
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        dataType: 'HEALTH_SAFETY',
        details: { organizationId, period, workplaceId },
      });

      return standardSuccessResponse({ dashboard });
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/health-safety/dashboard',
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'HEALTH_SAFETY',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch dashboard metrics',
      error
    );
  }
});
