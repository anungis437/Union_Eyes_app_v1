export interface DateRange {
    startDate: Date;
    endDate: Date;
}
export interface CollectionMetrics {
    totalDuesCharged: number;
    totalCollected: number;
    collectionRate: number;
    outstandingAmount: number;
    membersPaying: number;
    totalMembers: number;
    paymentRate: number;
    averagePaymentTime: number;
}
export interface ArrearsStatistics {
    totalCases: number;
    totalOwed: number;
    casesByStatus: Record<string, number>;
    casesByEscalationLevel: Record<number, number>;
    averageDaysOverdue: number;
    oldestCase: {
        id: string;
        memberId: string;
        daysOverdue: number;
        totalOwed: number;
    } | null;
}
export interface RevenueAnalysis {
    totalRevenue: number;
    revenueByMonth: Array<{
        month: string;
        amount: number;
        transactionCount: number;
    }>;
    revenueByType: Record<string, number>;
    growthRate: number;
}
export interface MemberPaymentPattern {
    memberId: string;
    totalTransactions: number;
    totalPaid: number;
    averagePaymentAmount: number;
    onTimePayments: number;
    latePayments: number;
    missedPayments: number;
    paymentReliabilityScore: number;
    lastPaymentDate: Date | null;
}
/**
 * Calculate collection metrics for a given date range
 */
export declare function getCollectionMetrics(organizationId: string, dateRange: DateRange): Promise<CollectionMetrics>;
/**
 * Get arrears statistics
 */
export declare function getArrearsStatistics(organizationId: string): Promise<ArrearsStatistics>;
/**
 * Analyze revenue trends over time
 */
export declare function getRevenueAnalysis(organizationId: string, dateRange: DateRange): Promise<RevenueAnalysis>;
/**
 * Analyze payment patterns for members
 */
export declare function getMemberPaymentPatterns(organizationId: string, dateRange: DateRange, limit?: number): Promise<MemberPaymentPattern[]>;
/**
 * Get top-level financial dashboard summary
 */
export declare function getFinancialDashboard(organizationId: string, dateRange: DateRange): Promise<{
    collectionMetrics: CollectionMetrics;
    arrearsStats: ArrearsStatistics;
    revenueAnalysis: RevenueAnalysis;
    topPayers: MemberPaymentPattern[];
    generatedAt: string;
}>;
//# sourceMappingURL=financial-reports.d.ts.map