/**
 * Executive Metrics API Route
 * 
 * Provides detailed KPIs and performance indicators for presidential leadership.
 * Returns strategic metrics, year-over-year comparisons, and goal tracking.
 * 
 * Authentication: Minimum role level 90 (president)
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
 * GET /api/executive/metrics
 * Retrieve detailed executive KPIs and performance metrics
 * 
 * Query parameters:
 * - year: Fiscal year for metrics (default: current year)
 * - comparison: Include year-over-year comparison (true/false)
 */
export const GET = withEnhancedRoleAuth(90, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const includeComparison = searchParams.get("comparison") === "true";

    // Mock comprehensive executive metrics data
    const metricsData = {
      fiscalYear: year,
      organizationId,
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      
      // Strategic KPIs
      strategicKPIs: {
        membershipGrowth: {
          current: 1247,
          target: 1300,
          percentToTarget: 95.9,
          yoyGrowth: 4.2,
          trend: "positive",
          projection: {
            endOfYear: 1285,
            confidenceLevel: 82
          }
        },
        financialHealth: {
          reserveRatio: 2.56, // months of operating expenses
          target: 3.0,
          percentToTarget: 85.3,
          yoyImprovement: 8.1,
          trend: "positive",
          revenuePerMember: 391.23,
          expensePerMember: 250.86
        },
        bargainingSuccess: {
          settlementsWon: 8,
          settlementsTotal: 10,
          successRate: 80.0,
          target: 85.0,
          avgWageIncrease: 3.2,
          avgImprovementPackage: 4.1,
          yoyComparison: 2.8
        },
        memberSatisfaction: {
          overallScore: 7.8,
          target: 8.5,
          percentToTarget: 91.8,
          yoyChange: 0.4,
          trend: "positive",
          responseRate: 42.1
        },
        engagementLevel: {
          activeParticipation: 68.4,
          target: 75.0,
          percentToTarget: 91.2,
          yoyImprovement: 5.3,
          volunteerRate: 15.3,
          committeeParticipation: 12.8
        },
        workplaceSafety: {
          incidentReduction: 18.3, // % reduction
          target: 20.0,
          lostTimeRate: 1.0, // per 100 workers
          industryBenchmark: 1.4,
          performanceVsIndustry: 28.6, // % better
          trend: "improving"
        }
      },

      // Financial Performance Detail
      financialPerformance: {
        yearToDate: {
          revenue: 487500,
          expenses: 312800,
          netIncome: 174700,
          margin: 35.8
        },
        budgetVariance: {
          revenueBudget: 475000,
          revenueActual: 487500,
          revenueVariance: 2.6, // % over budget
          expenseBudget: 330000,
          expenseActual: 312800,
          expenseVariance: -5.2, // % under budget
          netVariance: 8.8 // % better than budget
        },
        cashFlow: {
          operatingCash: 185000,
          investingCash: -15000,
          financingCash: 0,
          netCashFlow: 170000,
          cashPosition: 1450000
        },
        revenueBreakdown: {
          memberDues: 435600,
          initiationFees: 28900,
          solidarityFund: 12000,
          training: 8000,
          other: 3000
        },
        expenseBreakdown: {
          staffCompensation: 185000,
          professionalServices: 45200,
          facilityOperations: 33000,
          communications: 18600,
          training: 15000,
          travel: 16000
        },
        perCapitaRemittances: {
          clcPaid: 62350,
          clcOutstanding: 0,
          federationPaid: 37410,
          federationOutstanding: 0,
          nationalPaid: 24940,
          nationalOutstanding: 0
        }
      },

      // Membership Analytics
      membershipAnalytics: {
        totalActive: 1247,
        newMembersYTD: 78,
        turnoverRate: 6.2,
        retentionRate: 93.8,
        byStatus: {
          active: 1189,
          leaveOfAbsence: 34,
          suspended: 15,
          retired: 9
        },
        bySeniority: {
          under1Year: 89,
          oneToFive: 312,
          fiveToTen: 445,
          tenToTwenty: 289,
          over20: 112
        },
        byWorkplace: {
          mainFacility: 645,
          northCampus: 402,
          distributionCenter: 200
        },
        avgTenure: 8.4,
        recruitmentPipeline: 23,
        atRiskMembers: 12
      },

      // Bargaining Outcomes
      bargainingOutcomes: {
        settlementsYTD: 2,
        activeNegotiations: 3,
        upcomingExpirations: 2,
        membersInBargaining: 1247,
        settlements: [
          {
            id: "settlement-001",
            employer: "Previous Employer A",
            membersCovered: 234,
            wageIncrease: [2.5, 2.5, 3.0], // 3-year deal
            retroactivePay: 45600,
            benefitImprovements: ["dental upgrade", "additional sick days"],
            totalPackageValue: 3.8,
            ratificationVote: { yes: 89.2, no: 10.8 },
            settlementDate: "2025-12-15"
          },
          {
            id: "settlement-002",
            employer: "Previous Employer B",
            membersCovered: 156,
            wageIncrease: [3.0, 3.5, 4.0], // 3-year deal
            retroactivePay: 67800,
            benefitImprovements: ["pension increase", "flex benefits"],
            totalPackageValue: 4.5,
            ratificationVote: { yes: 92.4, no: 7.6 },
            settlementDate: "2026-01-05"
          }
        ],
        avgDaysToSettle: 87,
        mediationRate: 30.0,
        arbitrationRate: 10.0
      },

      // Grievances & Representation
      grievanceMetrics: {
        totalFiled: 47,
        resolved: 29,
        pending: 18,
        successRate: 76.5,
        avgResolutionDays: 32,
        byType: {
          discipline: 12,
          unjustDismissal: 5,
          contractViolation: 18,
          harassment: 7,
          healthSafety: 3,
          other: 2
        },
        byOutcome: {
          fullVictory: 15,
          partialVictory: 7,
          withdrawn: 4,
          lost: 3
        },
        arbitrationCases: {
          active: 1,
          won: 4,
          lost: 1,
          winRate: 80.0
        },
        costAnalysis: {
          totalLegalCosts: 34600,
          avgCostPerCase: 1193,
          recoveredCosts: 12400
        }
      },

      // Training & Development
      trainingMetrics: {
        programsDelivered: 24,
        participantsTotal: 312,
        totalTrainingHours: 1248,
        averageSatisfaction: 8.7,
        certificationsIssued: 67,
        complianceRate: 91.2,
        byProgram: [
          { name: "Steward Training", participants: 45, hours: 180, satisfaction: 8.9 },
          { name: "Health & Safety Level 1", participants: 89, hours: 267, satisfaction: 9.2 },
          { name: "Grievance Handling", participants: 34, hours: 136, satisfaction: 8.5 },
          { name: "Collective Bargaining", participants: 23, hours: 184, satisfaction: 9.0 },
          { name: "Leadership Development", participants: 18, hours: 144, satisfaction: 8.8 },
          { name: "WHMIS Certification", participants: 103, hours: 206, satisfaction: 8.3 }
        ],
        investmentPerMember: 48.15,
        roi: 3.2 // estimated return on investment multiple
      },

      // Goals & Targets Progress
      goalsProgress: [
        {
          id: "goal-001",
          category: "membership",
          title: "Achieve 1300 active members by year end",
          progress: 95.9,
          status: "on_track",
          milestones: [
            { date: "Q1", target: 1260, actual: 1247, met: false },
            { date: "Q2", target: 1280, actual: null, met: null },
            { date: "Q3", target: 1290, actual: null, met: null },
            { date: "Q4", target: 1300, actual: null, met: null }
          ]
        },
        {
          id: "goal-002",
          category: "finance",
          title: "Build reserve fund to 3 months operating expenses",
          progress: 85.3,
          status: "on_track",
          currentValue: 1250000,
          targetValue: 1465000
        },
        {
          id: "goal-003",
          category: "engagement",
          title: "Increase meeting attendance to 75%",
          progress: 91.2,
          status: "on_track",
          currentValue: 68.4,
          targetValue: 75.0
        },
        {
          id: "goal-004",
          category: "safety",
          title: "Reduce workplace incidents by 20%",
          progress: 91.5,
          status: "on_track",
          currentValue: 18.3,
          targetValue: 20.0
        },
        {
          id: "goal-005",
          category: "training",
          title: "Train 400 members in key programs",
          progress: 78.0,
          status: "at_risk",
          currentValue: 312,
          targetValue: 400
        }
      ],

      // Year-over-Year Comparison (if requested)
      ...(includeComparison && {
        yoyComparison: {
          membership: {
            previousYear: 1198,
            currentYear: 1247,
            growth: 4.1,
            growthMembers: 49
          },
          revenue: {
            previousYear: 445200,
            currentYear: 487500,
            growth: 9.5
          },
          expenses: {
            previousYear: 298600,
            currentYear: 312800,
            growth: 4.8
          },
          netIncome: {
            previousYear: 146600,
            currentYear: 174700,
            growth: 19.2
          },
          grievances: {
            previousYear: 52,
            currentYear: 47,
            change: -9.6
          },
          incidents: {
            previousYear: 45,
            currentYear: 37,
            change: -17.8
          }
        }
      })
    };

    return NextResponse.json(metricsData);
    
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch executive metrics',
      error
    );
  }
});
