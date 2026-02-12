/**
 * AI Burn-Rate Predictor Service
 * Week 9-10: Predict fund depletion using historical data and ML-based forecasting
 *
 * Features:
 * - Historical trend analysis
 * - Seasonal pattern detection
 * - Multi-scenario forecasting (optimistic, realistic, pessimistic)
 * - Early warning system
 * - Automated alert generation
 */
interface BurnRateData {
    date: Date;
    balance: number;
    deposits: number;
    withdrawals: number;
    netChange: number;
    runRate: number;
}
interface ForecastScenario {
    scenario: 'optimistic' | 'realistic' | 'pessimistic';
    projectedBalance: number[];
    depletionDate: Date | null;
    daysRemaining: number | null;
    confidence: number;
    assumptions: {
        dailyBurnRate: number;
        weeklyDonations: number;
        monthlyStipends: number;
    };
}
interface BurnRateForecast {
    fundId: string;
    fundName: string;
    currentBalance: number;
    asOfDate: Date;
    historicalBurnRate: number;
    scenarios: ForecastScenario[];
    recommendations: string[];
    alerts: {
        severity: 'info' | 'warning' | 'critical';
        message: string;
        daysUntilDepletion: number | null;
    }[];
}
interface SeasonalPattern {
    month: number;
    avgBurnRate: number;
    avgDonations: number;
    variance: number;
}
/**
 * Get historical burn rate data for a strike fund
 */
export declare function getHistoricalBurnRate(organizationId: string, fundId: string, startDate: Date, endDate: Date): Promise<BurnRateData[]>;
/**
 * Detect seasonal patterns in burn rate
 */
export declare function detectSeasonalPatterns(organizationId: string, fundId: string): Promise<SeasonalPattern[]>;
/**
 * Generate multi-scenario forecast
 */
export declare function generateBurnRateForecast(organizationId: string, fundId: string, forecastDays?: number): Promise<BurnRateForecast>;
/**
 * Check all funds and send alerts if needed
 */
export declare function processAutomatedAlerts(params: {
    organizationId: string;
}): Promise<{
    success: boolean;
    alertsSent: number;
    alerts?: Array<{
        fundId: string;
        fundName: string;
        severity: string;
        message: string;
    }>;
}>;
/**
 * Generate weekly forecast report for all funds
 */
export declare function generateWeeklyForecastReport(params: {
    organizationId: string;
    recipientUserId?: string;
}): Promise<{
    success: boolean;
    reportGenerated: boolean;
    totalFunds: number;
    criticalFunds: number;
    warningFunds: number;
}>;
export {};
//# sourceMappingURL=burn-rate-predictor.d.ts.map