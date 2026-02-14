/**
 * CLC Remittances API Route
 * 
 * Provides per-capita remittance tracking and management for CLC.
 * Returns payment status, collection details, and arrears information.
 * 
 * Authentication: Minimum role level 120 (clc_staff)
 * RLS: CLC-level access enforced
 */

import { NextRequest, NextResponse } from "next/server";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { standardSuccessResponse } from '@/lib/api/standardized-responses';

/**
 * GET /api/clc/remittances
 * Retrieve per-capita remittance data
 * 
 * Query parameters:
 * - period: Fiscal period (Q1, Q2, Q3, Q4, YTD, custom)
 * - year: Fiscal year (default: current year)
 * - status: Filter by status (all, current, overdue, partial)
 * - province: Optional filter by province
 * - affiliate: Optional filter by specific affiliate ID
 */
export const GET = withEnhancedRoleAuth(120, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "Q1";
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const status = searchParams.get("status") || "all";
    const province = searchParams.get("province");
    const affiliateId = searchParams.get("affiliate");

    // Mock CLC remittances data
    const remittancesData = {
      period,
      fiscalYear: year,
      timestamp: new Date().toISOString(),
      
      // Summary
      summary: {
        totalAffiliates: 47,
        totalDue: 4051958,
        totalCollected: 4051958,
        totalOutstanding: 0,
        collectionRate: 100.0,
        affiliatesCurrent: 44,
        affiliatesPartial: 0,
        affiliatesOverdue: 3,
        complianceRate: 93.6
      },

      // Per-Capita Rate Information
      rateInfo: {
        standardRate: 5.00,
        effectiveDate: "2026-01-01",
        previousRate: 4.75,
        nextReviewDate: "2027-01-01",
        calculationMethod: "per_member_per_month",
        specialRates: [
          { category: "retired_members", rate: 2.50 },
          { category: "student_members", rate: 3.00 },
          { category: "unemployed_members", rate: 0.00 }
        ]
      },

      // Affiliate Remittances
      affiliates: [
        {
          affiliateId: "aff-001",
          name: "UNIFOR",
          type: "national_union",
          province: "ON",
          activeMemberCount: 315000,
          totalMemberCount: 318450,
          perCapitaRate: 5.00,
          amountDue: 1575000,
          amountPaid: 1575000,
          amountOutstanding: 0,
          paymentStatus: "current",
          paymentDate: "2026-01-15T14:32:00Z",
          paymentMethod: "electronic_transfer",
          paymentReference: "REF-2026-Q1-001",
          lastPaymentDate: "2025-10-15",
          consecutiveOnTimePayments: 24,
          creditRating: "A+",
          notes: ""
        },
        {
          affiliateId: "aff-002",
          name: "CUPE",
          type: "national_union",
          province: "ON",
          activeMemberCount: 700000,
          totalMemberCount: 702100,
          perCapitaRate: 5.00,
          amountDue: 3500000,
          amountPaid: 3500000,
          amountOutstanding: 0,
          paymentStatus: "current",
          paymentDate: "2026-01-10T09:15:00Z",
          paymentMethod: "electronic_transfer",
          paymentReference: "REF-2026-Q1-002",
          lastPaymentDate: "2025-10-10",
          consecutiveOnTimePayments: 32,
          creditRating: "A+",
          notes: ""
        },
        {
          affiliateId: "aff-003",
          name: "United Steelworkers",
          type: "national_union",
          province: "ON",
          activeMemberCount: 225000,
          totalMemberCount: 226800,
          perCapitaRate: 5.00,
          amountDue: 1125000,
          amountPaid: 1125000,
          amountOutstanding: 0,
          paymentStatus: "current",
          paymentDate: "2026-01-12T11:20:00Z",
          paymentMethod: "electronic_transfer",
          paymentReference: "REF-2026-Q1-003",
          lastPaymentDate: "2025-10-12",
          consecutiveOnTimePayments: 28,
          creditRating: "A+",
          notes: ""
        },
        {
          affiliateId: "aff-234",
          name: "Local 234 - Manufacturing Workers",
          type: "local_union",
          province: "ON",
          activeMemberCount: 1198,
          totalMemberCount: 1245,
          perCapitaRate: 5.00,
          amountDue: 5990,
          amountPaid: 5990,
          amountOutstanding: 0,
          paymentStatus: "current",
          paymentDate: "2026-01-18T15:45:00Z",
          paymentMethod: "cheque",
          paymentReference: "CHQ-234-2026-Q1",
          lastPaymentDate: "2025-10-20",
          consecutiveOnTimePayments: 3,
          creditRating: "B+",
          notes: "Membership declining, under review"
        },
        {
          affiliateId: "aff-567",
          name: "Local 567 - Healthcare Workers",
          type: "local_union",
          province: "BC",
          activeMemberCount: 2456,
          totalMemberCount: 2489,
          perCapitaRate: 5.00,
          amountDue: 12280,
          amountPaid: 12280,
          amountOutstanding: 0,
          paymentStatus: "current",
          paymentDate: "2026-01-14T10:30:00Z",
          paymentMethod: "electronic_transfer",
          paymentReference: "REF-2026-Q1-567",
          lastPaymentDate: "2025-10-14",
          consecutiveOnTimePayments: 18,
          creditRating: "A",
          notes: ""
        },
        {
          affiliateId: "aff-892",
          name: "Local 892 - Retail Workers",
          type: "local_union",
          province: "AB",
          activeMemberCount: 234,
          totalMemberCount: 247,
          perCapitaRate: 5.00,
          amountDue: 1170,
          amountPaid: 0,
          amountOutstanding: 1170,
          paymentStatus: "overdue",
          dueDate: "2026-01-31",
          daysPastDue: 11,
          paymentDate: null,
          paymentMethod: null,
          paymentReference: null,
          lastPaymentDate: "2025-07-15",
          consecutiveOnTimePayments: 0,
          creditRating: "C",
          notes: "Payment plan requested, under negotiation",
          contactAttempts: 3,
          lastContactDate: "2026-02-08"
        },
        {
          affiliateId: "aff-1456",
          name: "Local 1456 - Transportation Workers",
          type: "local_union",
          province: "QC",
          activeMemberCount: 567,
          totalMemberCount: 582,
          perCapitaRate: 5.00,
          amountDue: 2835,
          amountPaid: 1500,
          amountOutstanding: 1335,
          paymentStatus: "partial",
          dueDate: "2026-01-31",
          daysPastDue: 11,
          paymentDate: "2026-01-25T16:20:00Z",
          paymentMethod: "electronic_transfer",
          paymentReference: "REF-2026-Q1-1456-PARTIAL",
          lastPaymentDate: "2025-10-28",
          consecutiveOnTimePayments: 0,
          creditRating: "B-",
          notes: "Financial difficulties, partial payment arrangement in place",
          contactAttempts: 2,
          lastContactDate: "2026-02-05"
        },
        {
          affiliateId: "aff-2103",
          name: "Local 2103 - Construction Workers",
          type: "local_union",
          province: "MB",
          activeMemberCount: 189,
          totalMemberCount: 195,
          perCapitaRate: 5.00,
          amountDue: 945,
          amountPaid: 0,
          amountOutstanding: 945,
          paymentStatus: "overdue",
          dueDate: "2026-01-31",
          daysPastDue: 11,
          paymentDate: null,
          paymentMethod: null,
          paymentReference: null,
          lastPaymentDate: "2025-09-30",
          consecutiveOnTimePayments: 0,
          creditRating: "C+",
          notes: "Treasurer transition, payment expected by Feb 15",
          contactAttempts: 1,
          lastContactDate: "2026-02-02"
        }
      ],

      // Payment History
      paymentHistory: {
        recentPayments: [
          {
            date: "2026-01-25T16:20:00Z",
            affiliateId: "aff-1456",
            affiliateName: "Local 1456",
            amount: 1500,
            reference: "REF-2026-Q1-1456-PARTIAL",
            method: "electronic_transfer",
            status: "cleared"
          },
          {
            date: "2026-01-18T15:45:00Z",
            affiliateId: "aff-234",
            affiliateName: "Local 234",
            amount: 5990,
            reference: "CHQ-234-2026-Q1",
            method: "cheque",
            status: "cleared"
          },
          {
            date: "2026-01-15T14:32:00Z",
            affiliateId: "aff-001",
            affiliateName: "UNIFOR",
            amount: 1575000,
            reference: "REF-2026-Q1-001",
            method: "electronic_transfer",
            status: "cleared"
          },
          {
            date: "2026-01-14T10:30:00Z",
            affiliateId: "aff-567",
            affiliateName: "Local 567",
            amount: 12280,
            reference: "REF-2026-Q1-567",
            method: "electronic_transfer",
            status: "cleared"
          },
          {
            date: "2026-01-12T11:20:00Z",
            affiliateId: "aff-003",
            affiliateName: "United Steelworkers",
            amount: 1125000,
            reference: "REF-2026-Q1-003",
            method: "electronic_transfer",
            status: "cleared"
          }
        ],
        totalTransactions: 45,
        totalValue: 4050623
      },

      // Collections & Arrears
      collectionsArrears: {
        totalArrears: 3450,
        affiliatesInArrears: 3,
        oldestArrears: {
          affiliateId: "aff-892",
          amount: 1170,
          daysPastDue: 11,
          quartersDue: ["Q1-2026"]
        },
        arrearsBreakdown: [
          {
            ageRange: "0-30 days",
            count: 3,
            amount: 3450
          },
          {
            ageRange: "31-60 days",
            count: 0,
            amount: 0
          },
          {
            ageRange: "61-90 days",
            count: 0,
            amount: 0
          },
          {
            ageRange: "90+ days",
            count: 0,
            amount: 0
          }
        ],
        collectionActions: [
          {
            affiliateId: "aff-892",
            action: "payment_plan_negotiation",
            assignedTo: "Collections Officer - J. Smith",
            nextFollowUp: "2026-02-15",
            status: "in_progress"
          },
          {
            affiliateId: "aff-1456",
            action: "partial_payment_monitoring",
            assignedTo: "Collections Officer - M. Johnson",
            nextFollowUp: "2026-02-20",
            status: "monitoring"
          },
          {
            affiliateId: "aff-2103",
            action: "courtesy_reminder",
            assignedTo: "Collections Officer - T. Williams",
            nextFollowUp: "2026-02-12",
            status: "pending_response"
          }
        ]
      },

      // Provincial Summary
      provincialSummary: [
        {
          province: "ON",
          affiliates: 12,
          totalDue: 6228390,
          totalCollected: 6228390,
          collectionRate: 100.0,
          affiliatesOverdue: 0
        },
        {
          province: "QC",
          affiliates: 9,
          totalDue: 4938270,
          totalCollected: 4936935,
          collectionRate: 99.97,
          affiliatesOverdue: 1
        },
        {
          province: "BC",
          affiliates: 8,
          totalDue: 2283945,
          totalCollected: 2283945,
          collectionRate: 100.0,
          affiliatesOverdue: 0
        },
        {
          province: "AB",
          affiliates: 6,
          totalDue: 1493825,
          totalCollected: 1492655,
          collectionRate: 99.92,
          affiliatesOverdue: 1
        },
        {
          province: "MB",
          affiliates: 3,
          totalDue: 446170,
          totalCollected: 445225,
          collectionRate: 99.79,
          affiliatesOverdue: 1
        },
        {
          province: "SK",
          affiliates: 2,
          totalDue: 228390,
          totalCollected: 228390,
          collectionRate: 100.0,
          affiliatesOverdue: 0
        },
        {
          province: "NS",
          affiliates: 2,
          totalDue: 172835,
          totalCollected: 172835,
          collectionRate: 100.0,
          affiliatesOverdue: 0
        },
        {
          province: "NB",
          affiliates: 2,
          totalDue: 144505,
          totalCollected: 144505,
          collectionRate: 100.0,
          affiliatesOverdue: 0
        },
        {
          province: "NL",
          affiliates: 2,
          totalDue: 192835,
          totalCollected: 192835,
          collectionRate: 100.0,
          affiliatesOverdue: 0
        },
        {
          province: "PE",
          affiliates: 1,
          totalDue: 78670,
          totalCollected: 78670,
          collectionRate: 100.0,
          affiliatesOverdue: 0
        }
      ],

      // Trends & Analytics
      trends: {
        collectionRateTrend: [
          { quarter: "Q1 2025", rate: 97.2 },
          { quarter: "Q2 2025", rate: 98.5 },
          { quarter: "Q3 2025", rate: 97.8 },
          { quarter: "Q4 2025", rate: 96.3 },
          { quarter: "Q1 2026", rate: 100.0 }
        ],
        arrearsAgingTrend: [
          { month: "Sep 2025", amount: 45200 },
          { month: "Oct 2025", amount: 38900 },
          { month: "Nov 2025", amount: 41200 },
          { month: "Dec 2025", amount: 52300 },
          { month: "Jan 2026", amount: 3450 }
        ]
      }
    };

    return NextResponse.json(remittancesData);
    
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch CLC remittances',
      error
    );
  }
});
