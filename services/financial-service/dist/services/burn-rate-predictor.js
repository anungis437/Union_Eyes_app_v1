"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistoricalBurnRate = getHistoricalBurnRate;
exports.detectSeasonalPatterns = detectSeasonalPatterns;
exports.generateBurnRateForecast = generateBurnRateForecast;
exports.processAutomatedAlerts = processAutomatedAlerts;
exports.generateWeeklyForecastReport = generateWeeklyForecastReport;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const notification_service_1 = require("./notification-service");
// ============================================================================
// HISTORICAL DATA ANALYSIS
// ============================================================================
/**
 * Get historical burn rate data for a strike fund
 */
async function getHistoricalBurnRate(tenantId, fundId, startDate, endDate) {
    // Get donations (deposits)
    const donationHistory = await db_1.db
        .select({
        date: (0, drizzle_orm_1.sql) `DATE(${schema_1.donations.createdAt})`,
        amount: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.donations.amount} AS NUMERIC)), 0)`,
    })
        .from(schema_1.donations)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.donations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.donations.strikeFundId, fundId), (0, drizzle_orm_1.eq)(schema_1.donations.status, 'completed'), (0, drizzle_orm_1.gte)(schema_1.donations.createdAt, startDate.toISOString()), (0, drizzle_orm_1.lte)(schema_1.donations.createdAt, endDate.toISOString())))
        .groupBy((0, drizzle_orm_1.sql) `DATE(${schema_1.donations.createdAt})`);
    // Get stipend disbursements (withdrawals)
    const stipendHistory = await db_1.db
        .select({
        date: (0, drizzle_orm_1.sql) `DATE(${schema_1.stipendDisbursements.createdAt})`,
        amount: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.stipendDisbursements.totalAmount} AS NUMERIC)), 0)`,
    })
        .from(schema_1.stipendDisbursements)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.strikeFundId, fundId), (0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.status, 'paid'), (0, drizzle_orm_1.gte)(schema_1.stipendDisbursements.createdAt, startDate.toISOString()), (0, drizzle_orm_1.lte)(schema_1.stipendDisbursements.createdAt, endDate.toISOString())))
        .groupBy((0, drizzle_orm_1.sql) `DATE(${schema_1.stipendDisbursements.createdAt})`);
    // Combine and calculate daily burn rate
    const dataMap = new Map();
    // Add donations (deposits)
    donationHistory.forEach((record) => {
        const dateKey = record.date;
        dataMap.set(dateKey, {
            date: new Date(record.date),
            balance: 0, // Will calculate running balance later
            deposits: Number(record.amount),
            withdrawals: 0,
            netChange: Number(record.amount),
            runRate: 0,
        });
    });
    // Add stipends (withdrawals)
    stipendHistory.forEach((record) => {
        const dateKey = record.date;
        const existing = dataMap.get(dateKey);
        if (existing) {
            existing.withdrawals = Number(record.amount);
            existing.netChange = existing.deposits - Number(record.amount);
        }
        else {
            dataMap.set(dateKey, {
                date: new Date(record.date),
                balance: 0,
                deposits: 0,
                withdrawals: Number(record.amount),
                netChange: -Number(record.amount),
                runRate: 0,
            });
        }
    });
    // Calculate net change, running balance, and 7-day moving average
    const sortedData = Array.from(dataMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    let runningBalance = 0;
    for (let i = 0; i < sortedData.length; i++) {
        const record = sortedData[i];
        runningBalance += record.netChange;
        record.balance = runningBalance;
        // Calculate 7-day moving average burn rate
        const lookback = Math.min(7, i + 1);
        const recentRecords = sortedData.slice(Math.max(0, i - lookback + 1), i + 1);
        const avgWithdrawals = recentRecords.reduce((sum, r) => sum + r.withdrawals, 0) / lookback;
        record.runRate = avgWithdrawals;
    }
    return sortedData;
}
/**
 * Detect seasonal patterns in burn rate
 */
async function detectSeasonalPatterns(tenantId, fundId) {
    // Get 12 months of historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    const historicalData = await getHistoricalBurnRate(tenantId, fundId, startDate, endDate);
    // Group by month
    const monthlyData = new Map();
    historicalData.forEach((record) => {
        const month = record.date.getMonth();
        if (!monthlyData.has(month)) {
            monthlyData.set(month, { burnRates: [], donations: [] });
        }
        const data = monthlyData.get(month);
        data.burnRates.push(record.runRate);
        data.donations.push(record.deposits);
    });
    // Calculate averages and variance for each month
    const patterns = [];
    for (let month = 0; month < 12; month++) {
        const data = monthlyData.get(month) || { burnRates: [0], donations: [0] };
        const avgBurnRate = data.burnRates.reduce((a, b) => a + b, 0) / data.burnRates.length;
        const avgDonations = data.donations.reduce((a, b) => a + b, 0) / data.donations.length;
        // Calculate variance
        const variance = data.burnRates.reduce((sum, rate) => sum + Math.pow(rate - avgBurnRate, 2), 0) /
            data.burnRates.length;
        patterns.push({
            month,
            avgBurnRate,
            avgDonations,
            variance,
        });
    }
    return patterns;
}
// ============================================================================
// FORECASTING ENGINE
// ============================================================================
/**
 * Generate multi-scenario forecast
 */
async function generateBurnRateForecast(tenantId, fundId, forecastDays = 90) {
    // Get current fund data
    const [fund] = await db_1.db
        .select()
        .from(schema_1.strikeFunds)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.strikeFunds.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.strikeFunds.id, fundId)))
        .limit(1);
    if (!fund) {
        throw new Error('Strike fund not found');
    }
    // Calculate current balance from all-time donations - stipends
    const [balanceResult] = await db_1.db
        .select({
        totalDonations: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.donations.amount} AS NUMERIC)), 0)`,
        totalStipends: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.stipendDisbursements.totalAmount} AS NUMERIC)), 0)`,
    })
        .from(schema_1.donations)
        .leftJoin(schema_1.stipendDisbursements, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.strikeFundId, fundId), (0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.status, 'paid')))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.donations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.donations.strikeFundId, fundId), (0, drizzle_orm_1.eq)(schema_1.donations.status, 'completed')));
    const currentBalance = Number(balanceResult.totalDonations) - Number(balanceResult.totalStipends);
    const targetAmount = fund.targetAmount ? Number(fund.targetAmount) : currentBalance * 2; // Default to 2x current if not set
    // Get historical data (90 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const historicalData = await getHistoricalBurnRate(tenantId, fundId, startDate, endDate);
    const seasonalPatterns = await detectSeasonalPatterns(tenantId, fundId);
    // Calculate historical averages
    const avgDailyBurnRate = historicalData.length > 0
        ? historicalData.reduce((sum, d) => sum + d.withdrawals, 0) / historicalData.length
        : 0;
    const avgDailyDonations = historicalData.length > 0
        ? historicalData.reduce((sum, d) => sum + d.deposits, 0) / historicalData.length
        : 0;
    // Get current month's seasonal adjustment
    const currentMonth = new Date().getMonth();
    const seasonalAdjustment = seasonalPatterns[currentMonth];
    // Generate three scenarios
    const scenarios = [
        generateScenario('optimistic', currentBalance, avgDailyBurnRate * 0.7, // 30% lower burn rate
        avgDailyDonations * 1.3, // 30% higher donations
        forecastDays, seasonalAdjustment),
        generateScenario('realistic', currentBalance, avgDailyBurnRate, avgDailyDonations, forecastDays, seasonalAdjustment),
        generateScenario('pessimistic', currentBalance, avgDailyBurnRate * 1.3, // 30% higher burn rate
        avgDailyDonations * 0.7, // 30% lower donations
        forecastDays, seasonalAdjustment),
    ];
    // Generate recommendations
    const recommendations = generateRecommendations(currentBalance, targetAmount, scenarios, avgDailyBurnRate, avgDailyDonations);
    // Generate alerts
    const alerts = generateAlerts(currentBalance, scenarios, avgDailyBurnRate);
    return {
        fundId: fund.id,
        fundName: fund.fundName,
        currentBalance,
        asOfDate: new Date(),
        historicalBurnRate: avgDailyBurnRate,
        scenarios,
        recommendations,
        alerts,
    };
}
/**
 * Generate a single forecast scenario
 */
function generateScenario(scenario, currentBalance, dailyBurnRate, dailyDonations, forecastDays, seasonalAdjustment) {
    const projectedBalance = [currentBalance];
    let balance = currentBalance;
    let depletionDate = null;
    let daysRemaining = null;
    for (let day = 1; day <= forecastDays; day++) {
        // Apply seasonal adjustment
        const adjustedBurnRate = dailyBurnRate * (1 + seasonalAdjustment.variance / 100);
        const adjustedDonations = dailyDonations * (seasonalAdjustment.avgDonations / dailyDonations);
        // Weekly stipend disbursement pattern (assume stipends every 7 days)
        const isDisbursementDay = day % 7 === 0;
        const weeklyStipendAmount = isDisbursementDay ? adjustedBurnRate * 7 : 0;
        // Daily operations
        balance = balance + adjustedDonations - adjustedBurnRate - weeklyStipendAmount;
        projectedBalance.push(Math.max(0, balance));
        // Check for depletion
        if (balance <= 0 && depletionDate === null) {
            depletionDate = new Date();
            depletionDate.setDate(depletionDate.getDate() + day);
            daysRemaining = day;
            break;
        }
    }
    // Calculate confidence based on historical variance
    const confidence = Math.max(0.5, 1 - seasonalAdjustment.variance / 100);
    return {
        scenario,
        projectedBalance,
        depletionDate,
        daysRemaining,
        confidence,
        assumptions: {
            dailyBurnRate,
            weeklyDonations: dailyDonations * 7,
            monthlyStipends: dailyBurnRate * 30,
        },
    };
}
/**
 * Generate actionable recommendations
 */
function generateRecommendations(currentBalance, targetAmount, scenarios, avgDailyBurnRate, avgDailyDonations) {
    const recommendations = [];
    const realisticScenario = scenarios.find((s) => s.scenario === 'realistic');
    // Balance recommendations
    const balanceRatio = currentBalance / targetAmount;
    if (balanceRatio < 0.25) {
        recommendations.push(`CRITICAL: Current balance is ${(balanceRatio * 100).toFixed(1)}% of target. Immediate fundraising required.`);
    }
    else if (balanceRatio < 0.5) {
        recommendations.push(`WARNING: Current balance is ${(balanceRatio * 100).toFixed(1)}% of target. Increase fundraising efforts.`);
    }
    // Depletion warnings
    if (realisticScenario.daysRemaining !== null) {
        if (realisticScenario.daysRemaining < 30) {
            recommendations.push(`URGENT: Fund may deplete in ${realisticScenario.daysRemaining} days. Emergency fundraising campaign needed.`);
        }
        else if (realisticScenario.daysRemaining < 60) {
            recommendations.push(`Fund projected to deplete in ${realisticScenario.daysRemaining} days. Start fundraising campaign now.`);
        }
    }
    // Burn rate recommendations
    const burnRateRatio = avgDailyBurnRate / avgDailyDonations;
    if (burnRateRatio > 2) {
        recommendations.push(`Burn rate is ${burnRateRatio.toFixed(1)}x higher than donation rate. Consider reducing stipend amounts or increasing donation drive.`);
    }
    // Donation recommendations
    const requiredDailyDonations = avgDailyBurnRate * 1.2; // 20% buffer
    if (avgDailyDonations < requiredDailyDonations) {
        const shortfall = requiredDailyDonations - avgDailyDonations;
        recommendations.push(`Need $${shortfall.toFixed(2)}/day more in donations to maintain sustainable operations.`);
    }
    // Positive reinforcement
    if (recommendations.length === 0) {
        recommendations.push('Fund is healthy. Current donation and burn rates are sustainable for the forecast period.');
    }
    return recommendations;
}
/**
 * Generate automated alerts
 */
function generateAlerts(currentBalance, scenarios, avgDailyBurnRate) {
    const alerts = [];
    const realisticScenario = scenarios.find((s) => s.scenario === 'realistic');
    const pessimisticScenario = scenarios.find((s) => s.scenario === 'pessimistic');
    // Critical: Less than 30 days in pessimistic scenario
    if (pessimisticScenario.daysRemaining !== null && pessimisticScenario.daysRemaining < 30) {
        alerts.push({
            severity: 'critical',
            message: `CRITICAL: Fund may deplete in ${pessimisticScenario.daysRemaining} days (pessimistic scenario)`,
            daysUntilDepletion: pessimisticScenario.daysRemaining,
        });
    }
    // Warning: Less than 60 days in realistic scenario
    if (realisticScenario.daysRemaining !== null && realisticScenario.daysRemaining < 60) {
        alerts.push({
            severity: 'warning',
            message: `WARNING: Fund projected to deplete in ${realisticScenario.daysRemaining} days`,
            daysUntilDepletion: realisticScenario.daysRemaining,
        });
    }
    // Low balance warning
    const daysOfRunway = currentBalance / avgDailyBurnRate;
    if (daysOfRunway < 45) {
        alerts.push({
            severity: 'warning',
            message: `Low balance alert: Only ${daysOfRunway.toFixed(0)} days of runway remaining`,
            daysUntilDepletion: Math.floor(daysOfRunway),
        });
    }
    // Info: Healthy fund
    if (alerts.length === 0) {
        alerts.push({
            severity: 'info',
            message: 'Fund health is good. No immediate concerns.',
            daysUntilDepletion: null,
        });
    }
    return alerts;
}
// ============================================================================
// AUTOMATED ALERT SYSTEM
// ============================================================================
/**
 * Check all funds and send alerts if needed
 */
async function processAutomatedAlerts(params) {
    const { tenantId } = params;
    // Get all strike funds
    const activeFunds = await db_1.db
        .select()
        .from(schema_1.strikeFunds)
        .where((0, drizzle_orm_1.eq)(schema_1.strikeFunds.tenantId, tenantId));
    let alertsSent = 0;
    const allAlerts = [];
    for (const fund of activeFunds) {
        try {
            const forecast = await generateBurnRateForecast(tenantId, fund.id);
            // Send alerts for critical and warning severities
            for (const alert of forecast.alerts) {
                if (alert.severity === 'critical' || alert.severity === 'warning') {
                    // Queue notification to fund administrators
                    await (0, notification_service_1.queueNotification)({
                        tenantId,
                        userId: fund.createdBy || 'admin', // Send to fund creator or admin
                        type: 'low_balance_alert',
                        channels: ['email', 'sms'],
                        priority: alert.severity === 'critical' ? 'urgent' : 'high',
                        data: {
                            fundName: fund.fundName,
                            currentBalance: `$${forecast.currentBalance.toFixed(2)}`,
                            daysRemaining: alert.daysUntilDepletion?.toString() || 'Unknown',
                            message: alert.message,
                            forecastUrl: `${process.env.APP_URL}/funds/${fund.id}/forecast`,
                        },
                    });
                    alertsSent++;
                    allAlerts.push({
                        fundId: fund.id,
                        fundName: fund.fundName,
                        severity: alert.severity,
                        message: alert.message,
                    });
                }
            }
        }
        catch (error) {
}
    }
    return {
        success: true,
        alertsSent,
        alerts: allAlerts,
    };
}
/**
 * Generate weekly forecast report for all funds
 */
async function generateWeeklyForecastReport(params) {
    const { tenantId, recipientUserId = 'admin' } = params;
    const activeFunds = await db_1.db
        .select()
        .from(schema_1.strikeFunds)
        .where((0, drizzle_orm_1.eq)(schema_1.strikeFunds.tenantId, tenantId));
    const forecasts = await Promise.all(activeFunds.map((fund) => generateBurnRateForecast(tenantId, fund.id)));
    // Generate report summary
    const reportData = {
        generatedDate: new Date().toISOString(),
        totalFunds: forecasts.length,
        criticalFunds: forecasts.filter((f) => f.alerts.some((a) => a.severity === 'critical')).length,
        warningFunds: forecasts.filter((f) => f.alerts.some((a) => a.severity === 'warning')).length,
        healthyFunds: forecasts.filter((f) => f.alerts.every((a) => a.severity === 'info')).length,
        forecasts: forecasts.map((f) => ({
            fundName: f.fundName,
            currentBalance: f.currentBalance,
            daysRemaining: f.scenarios.find((s) => s.scenario === 'realistic')?.daysRemaining,
            alerts: f.alerts,
        })),
    };
    // Send weekly report via email
    await (0, notification_service_1.queueNotification)({
        tenantId,
        userId: recipientUserId,
        type: 'strike_announcement', // Reusing type for report
        channels: ['email'],
        priority: 'normal',
        data: {
            title: 'Weekly Fund Forecast Report',
            message: `Weekly forecast report generated with ${reportData.criticalFunds} critical alerts and ${reportData.warningFunds} warnings.`,
            reportUrl: `${process.env.APP_URL}/reports/weekly-forecast`,
            reportData: JSON.stringify(reportData),
        },
    });
    return {
        success: true,
        reportGenerated: true,
        totalFunds: reportData.totalFunds,
        criticalFunds: reportData.criticalFunds,
        warningFunds: reportData.warningFunds,
    };
}
//# sourceMappingURL=burn-rate-predictor.js.map