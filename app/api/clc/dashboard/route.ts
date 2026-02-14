/**
 * CLC Dashboard API Route
 * 
 * Provides Canadian Labour Congress executive dashboard metrics.
 * Returns affiliate status, per-capita tracking, and national-level insights.
 * 
 * Authentication: Minimum role level 120 (clc_staff)
 * RLS: CLC-level access enforced
 */

import { NextRequest, NextResponse } from "next/server";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { standardSuccessResponse } from '@/lib/api/standardized-responses';

/**
 * GET /api/clc/dashboard
 * Retrieve CLC executive dashboard data
 * 
 * Query parameters:
 * - period: Time period for metrics (30d, 90d, 1y, all) - default 90d
 * - province: Optional filter by province
 */
export const GET = withEnhancedRoleAuth(120, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "90d";
    const province = searchParams.get("province");

    // Mock CLC dashboard data
    const dashboardData = {
      period,
      timestamp: new Date().toISOString(),
      
      // National Overview
      nationalOverview: {
        totalAffiliates: 47,
        totalMembers: 3241567,
        activeMembers: 3189234,
        newAffiliatesYTD: 3,
        memberGrowthRate: 2.1,
        avgMembershipGrowth: 1.8,
        highestGrowth: { affiliate: "UNIFOR", rate: 4.3 },
        lowestGrowth: { affiliate: "Local 234", rate: -0.8 }
      },

      // Per-Capita Status
      perCapitaStatus: {
        totalDueYTD: 16207835,
        totalCollected: 15897421,
        totalOutstanding: 310414,
        collectionRate: 98.1,
        paymentCompliance: 93.6, // % of affiliates current
        projectedAnnual: 64831340,
        byQuarter: {
          q1: { due: 4051958, collected: 4051958, rate: 100.0 },
          q2: { due: 4051958, collected: 3892345, rate: 96.1 },
          q3: { due: 4051959, collected: 3953118, rate: 97.6 },
          q4: { due: 4051960, collected: 4000000, rate: 98.7 } // projected
        },
        topPayers: [
          { affiliate: "UNIFOR", members: 315000, amount: 1575000, status: "current" },
          { affiliate: "CUPE", members: 700000, amount: 3500000, status: "current" },
          { affiliate: "Steelworkers", members: 225000, amount: 1125000, status: "current" }
        ],
        delinquent: [
          { affiliate: "Local 892", members: 234, outstanding: 11700, daysPastDue: 45 },
          { affiliate: "Local 1456", members: 567, outstanding: 28350, daysPastDue: 32 },
          { affiliate: "Local 2103", members: 189, outstanding: 9450, daysPastDue: 18 }
        ]
      },

      // Affiliate Health Metrics
      affiliateHealth: {
        healthy: 38,
        atRisk: 7,
        critical: 2,
        metrics: {
          avgFinancialHealth: 8.2,
          avgEngagement: 7.5,
          avgCompliance: 94.2,
          avgGrowth: 1.8
        },
        concerns: [
          {
            affiliateId: "aff-234",
            name: "Local 234",
            issue: "declining_membership",
            severity: "high",
            membersLost: 47,
            trend: "negative"
          },
          {
            affiliateId: "aff-892",
            name: "Local 892",
            issue: "payment_delinquency",
            severity: "medium",
            daysPastDue: 45,
            amount: 11700
          }
        ]
      },

      // Provincial Breakdown
      provincialBreakdown: [
        {
          province: "ON",
          affiliates: 12,
          members: 1245678,
          perCapitaCollected: 6228390,
          complianceRate: 97.2,
          growthRate: 2.3
        },
        {
          province: "QC",
          affiliates: 9,
          members: 987654,
          perCapitaCollected: 4938270,
          complianceRate: 98.5,
          growthRate: 1.8
        },
        {
          province: "BC",
          affiliates: 8,
          members: 456789,
          perCapitaCollected: 2283945,
          complianceRate: 96.4,
          growthRate: 3.1
        },
        {
          province: "AB",
          affiliates: 6,
          members: 298765,
          perCapitaCollected: 1493825,
          complianceRate: 94.8,
          growthRate: 1.2
        },
        {
          province: "MB",
          affiliates: 3,
          members: 89234,
          perCapitaCollected: 446170,
          complianceRate: 100.0,
          growthRate: 2.7
        },
        {
          province: "SK",
          affiliates: 2,
          members: 45678,
          perCapitaCollected: 228390,
          complianceRate: 100.0,
          growthRate: 1.5
        },
        {
          province: "NS",
          affiliates: 2,
          members: 34567,
          perCapitaCollected: 172835,
          complianceRate: 95.3,
          growthRate: 0.9
        },
        {
          province: "NB",
          affiliates: 2,
          members: 28901,
          perCapitaCollected: 144505,
          complianceRate: 92.1,
          growthRate: 1.1
        },
        {
          province: "NL",
          affiliates: 2,
          members: 38567,
          perCapitaCollected: 192835,
          complianceRate: 98.7,
          growthRate: 1.9
        },
        {
          province: "PE",
          affiliates: 1,
          members: 15734,
          perCapitaCollected: 78670,
          complianceRate: 100.0,
          growthRate: 2.2
        }
      ],

      // Synchronization Status
      syncStatus: {
        lastFullSync: "2026-02-10T03:00:00Z",
        nextScheduledSync: "2026-02-12T03:00:00Z",
        totalAffiliates: 47,
        syncedSuccessfully: 45,
        syncErrors: 2,
        pendingUpdates: 5,
        dataQuality: 97.3,
        errors: [
          {
            affiliateId: "aff-1456",
            name: "Local 1456",
            error: "membership_data_mismatch",
            lastAttempt: "2026-02-10T03:15:23Z",
            retryScheduled: "2026-02-11T03:00:00Z"
          },
          {
            affiliateId: "aff-2103",
            name: "Local 2103",
            error: "api_connection_timeout",
            lastAttempt: "2026-02-10T03:22:41Z",
            retryScheduled: "2026-02-11T03:00:00Z"
          }
        ]
      },

      // Campaign & Initiatives
      campaigns: {
        active: 8,
        completed: 3,
        totalEngagement: 1567890,
        campaigns: [
          {
            id: "camp-001",
            name: "Fair Wages for Essential Workers",
            status: "active",
            startDate: "2026-01-15",
            participatingAffiliates: 34,
            memberEngagement: 678954,
            goal: "Policy change & CBA improvements"
          },
          {
            id: "camp-002",
            name: "Climate Jobs Transition",
            status: "active",
            startDate: "2025-11-01",
            participatingAffiliates: 28,
            memberEngagement: 445231,
            goal: "Worker support in green transition"
          },
          {
            id: "camp-003",
            name: "Pharmacare Now",
            status: "active",
            startDate: "2025-09-15",
            participatingAffiliates: 41,
            memberEngagement: 443705,
            goal: "National pharmacare program"
          }
        ]
      },

      // Compliance & Reporting
      compliance: {
        affiliatesCompliant: 44,
        affiliatesNonCompliant: 3,
        complianceRate: 93.6,
        overdueReports: {
          perCapita: 3,
          membership: 2,
          financial: 1,
          healthSafety: 0
        },
        auditsDue: 5,
        auditsCompleted: 42,
        auditCompletionRate: 89.4
      },

      // Key Alerts
      alerts: [
        {
          id: "alert-clc-001",
          severity: "high",
          category: "per_capita",
          message: "3 affiliates with overdue per-capita payments (>30 days)",
          actionRequired: "Follow up with delinquent affiliates",
          affiliatesAffected: ["Local 892", "Local 1456", "Local 2103"]
        },
        {
          id: "alert-clc-002",
          severity: "medium",
          category: "sync",
          message: "2 affiliate sync failures require attention",
          actionRequired: "Review sync errors and coordinate with IT",
          affiliatesAffected: ["Local 1456", "Local 2103"]
        },
        {
          id: "alert-clc-003",
          severity: "medium",
          category: "membership",
          message: "Local 234 experiencing significant membership decline (-17% YOY)",
          actionRequired: "Schedule support consultation with affiliate leadership",
          affiliatesAffected: ["Local 234"]
        },
        {
          id: "alert-clc-004",
          severity: "low",
          category: "reporting",
          message: "Q1 provincial compliance reports due in 2 weeks",
          actionRequired: "Reminder notice sent to provincial federations",
          deadline: "2026-02-25"
        }
      ],

      // Trends
      trends: {
        membershipTrend: [
          { quarter: "Q1 2025", members: 3187456 },
          { quarter: "Q2 2025", members: 3198234 },
          { quarter: "Q3 2025", members: 3215678 },
          { quarter: "Q4 2025", members: 3229123 },
          { quarter: "Q1 2026", members: 3241567 }
        ],
        perCapitaTrend: [
          { quarter: "Q1 2025", collected: 3987234, rate: 97.2 },
          { quarter: "Q2 2025", collected: 3998765, rate: 98.5 },
          { quarter: "Q3 2025", collected: 4012345, rate: 97.8 },
          { quarter: "Q4 2025", collected: 3999012, rate: 96.3 },
          { quarter: "Q1 2026", collected: 4051958, rate: 100.0 }
        ],
        complianceTrend: [
          { quarter: "Q1 2025", rate: 91.5 },
          { quarter: "Q2 2025", rate: 93.2 },
          { quarter: "Q3 2025", rate: 94.1 },
          { quarter: "Q4 2025", rate: 92.8 },
          { quarter: "Q1 2026", rate: 93.6 }
        ]
      }
    };

    return NextResponse.json(dashboardData);
    
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch CLC dashboard',
      error
    );
  }
});
