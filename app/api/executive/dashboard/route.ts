/**
 * Executive Dashboard API Route
 * 
 * Provides high-level metrics and analytics for executive leadership.
 * Returns organization-wide KPIs, trends, and strategic insights.
 * 
 * Authentication: Minimum role level 85 (vice_president)
 * RLS: Organization-level isolation enforced by database policies
 */

import { NextRequest, NextResponse } from "next/server";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

/**
 * GET /api/executive/dashboard
 * Retrieve comprehensive executive metrics
 * 
 * Query parameters:
 * - period: Time period for metrics (7d, 30d, 90d, 1y, all) - default 30d
 */
export const GET = withEnhancedRoleAuth(85, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";

    // Mock comprehensive executive dashboard data
    const dashboardData = {
      period,
      organizationId,
      timestamp: new Date().toISOString(),
      
      // Membership Overview
      membership: {
        total: 1247,
        active: 1189,
        inactive: 58,
        newThisMonth: 23,
        retentionRate: 95.3,
        growthRate: 1.9,
        byCategory: {
          fullTime: 987,
          partTime: 203,
          retired: 57
        },
        byWorkplace: [
          { workplaceId: "wp-001", name: "Main Facility", count: 645 },
          { workplaceId: "wp-002", name: "North Campus", count: 402 },
          { workplaceId: "wp-003", name: "Distribution Center", count: 200 }
        ],
        demographics: {
          avgYearsService: 8.4,
          avgAge: 42.1,
          genderDistribution: {
            male: 58.2,
            female: 40.1,
            other: 1.7
          }
        }
      },

      // Financial Health
      finances: {
        totalRevenue: 487500,
        totalExpenses: 312800,
        netIncome: 174700,
        reserveFund: 1250000,
        perCapitaIncome: 391,
        budgetUtilization: 64.2,
        projectedYearEnd: {
          revenue: 1950000,
          expenses: 1251200,
          surplus: 698800
        },
        byCategory: {
          dues: 435600,
          initiationFees: 28900,
          fines: 12000,
          donations: 8000,
          other: 3000
        },
        expenses: {
          payroll: 185000,
          operations: 78200,
          legal: 34600,
          training: 15000
        }
      },

      // Bargaining Status
      bargaining: {
        activeCampaigns: 3,
        upcomingExpirations: 2,
        recentSettlements: 1,
        averageSettlementDays: 87,
        avgWageIncrease: 3.2,
        campaigns: [
          {
            id: "neg-001",
            title: "Main Facility CBA 2024",
            employerName: "Acme Manufacturing",
            status: "negotiating",
            progress: 65,
            membersAffected: 645,
            daysInNegotiation: 42,
            keyIssues: ["wages", "benefits", "scheduling"],
            nextSessionDate: "2026-02-15T10:00:00Z"
          },
          {
            id: "neg-002",
            title: "North Campus Renewal",
            employerName: "TechCorp Inc",
            status: "mediation",
            progress: 45,
            membersAffected: 402,
            daysInNegotiation: 68,
            keyIssues: ["pension", "job security"],
            nextSessionDate: "2026-02-18T14:00:00Z"
          },
          {
            id: "neg-003",
            title: "Distribution Center First Contract",
            employerName: "LogisTrans",
            status: "preparation",
            progress: 20,
            membersAffected: 200,
            daysInNegotiation: 15,
            keyIssues: ["wages", "health & safety", "hours of work"],
            nextSessionDate: "2026-02-20T09:00:00Z"
          }
        ]
      },

      // Grievances & Legal
      grievances: {
        total: 47,
        open: 18,
        resolved: 29,
        avgResolutionDays: 32,
        byStage: {
          informal: 8,
          step1: 6,
          step2: 3,
          arbitration: 1
        },
        bySeverity: {
          critical: 2,
          high: 7,
          medium: 9,
          low: 0
        },
        successRate: 76.5,
        recentCritical: [
          {
            id: "grv-045",
            type: "unjust_dismissal",
            severity: "critical",
            filedDate: "2026-01-28",
            status: "step2",
            memberName: "Member 847"
          },
          {
            id: "grv-041",
            type: "harassment",
            severity: "critical",
            filedDate: "2026-01-15",
            status: "arbitration",
            memberName: "Member 523"
          }
        ]
      },

      // Health & Safety
      healthSafety: {
        incidentsThisPeriod: 12,
        lostTimeDays: 45,
        nearMisses: 23,
        criticalIncidents: 2,
        inspectionsCompleted: 18,
        avgInspectionScore: 87.3,
        openHazards: 7,
        criticalHazards: 1,
        trainingCompliance: 91.2,
        trendDirection: "improving",
        incidentRate: 1.0, // per 100 workers
        comparisonToIndustry: "below_average"
      },

      // Member Engagement
      engagement: {
        meetingAttendance: 68.4,
        volunteerRate: 15.3,
        committeesActive: 12,
        committeesTotal: 15,
        surveyResponseRate: 42.1,
        satisfactionScore: 7.8,
        communicationsReach: 89.3,
        activeVolunteers: 191,
        eventParticipation: {
          socialEvents: 234,
          trainingEvents: 156,
          politicalAction: 89
        }
      },

      // Training & Development
      training: {
        sessionsCompleted: 24,
        membersTrained: 312,
        totalHours: 1248,
        certifications: 67,
        compliance: 91.2,
        upcomingSessions: 8,
        popularPrograms: [
          { name: "Steward Training", participants: 45, satisfaction: 8.9 },
          { name: "Health & Safety Level 1", participants: 89, satisfaction: 9.2 },
          { name: "Grievance Handling", participants: 34, satisfaction: 8.5 }
        ]
      },

      // Strategic Alerts & Actions Required
      alerts: [
        {
          id: "alert-001",
          severity: "critical",
          category: "grievance",
          message: "Arbitration hearing scheduled for Feb 22 - Dismissal case",
          actionRequired: "Ensure legal counsel and witness statements prepared",
          deadline: "2026-02-20"
        },
        {
          id: "alert-002",
          severity: "high",
          category: "bargaining",
          message: "Main Facility CBA expires in 45 days",
          actionRequired: "Schedule membership ratification meeting",
          deadline: "2026-02-25"
        },
        {
          id: "alert-003",
          severity: "medium",
          category: "health_safety",
          message: "Q1 safety inspections 15% behind schedule",
          actionRequired: "Assign additional inspection coordinators",
          deadline: "2026-03-01"
        },
        {
          id: "alert-004",
          severity: "medium",
          category: "finance",
          message: "Per-capita remittance to CLC due in 2 weeks",
          actionRequired: "Review and submit Q1 remittance calculations",
          deadline: "2026-02-25"
        }
      ],

      // Trends & Analytics
      trends: {
        membershipTrend: [
          { month: "Sep", count: 1198 },
          { month: "Oct", count: 1205 },
          { month: "Nov", count: 1223 },
          { month: "Dec", count: 1231 },
          { month: "Jan", count: 1247 }
        ],
        grievanceTrend: [
          { month: "Sep", count: 8 },
          { month: "Oct", count: 11 },
          { month: "Nov", count: 9 },
          { month: "Dec", count: 7 },
          { month: "Jan", count: 12 }
        ],
        incidentTrend: [
          { month: "Sep", count: 3 },
          { month: "Oct", count: 2 },
          { month: "Nov", count: 4 },
          { month: "Dec", count: 1 },
          { month: "Jan", count: 3 }
        ],
        financeTrend: [
          { month: "Sep", revenue: 95200, expenses: 61400 },
          { month: "Oct", revenue: 96800, expenses: 63200 },
          { month: "Nov", revenue: 98100, expenses: 59800 },
          { month: "Dec", revenue: 97400, expenses: 65600 },
          { month: "Jan", revenue: 100000, expenses: 62800 }
        ]
      }
    };

    return NextResponse.json(dashboardData);
    
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch executive dashboard',
      error
    );
  }
});
