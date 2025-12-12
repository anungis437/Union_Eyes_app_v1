"use strict";
/**
 * Analytics & Forecasting Routes
 * Week 9-10: Financial analytics and burn-rate prediction endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const burn_rate_predictor_1 = require("../services/burn-rate-predictor");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
const ForecastParamsSchema = zod_1.z.object({
    fundId: zod_1.z.string().uuid(),
    forecastDays: zod_1.z.coerce.number().min(7).max(365).optional().default(90),
});
const DateRangeSchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
});
const AlertsSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid().optional(),
});
// ============================================================================
// BURN-RATE FORECASTING ENDPOINTS
// ============================================================================
/**
 * GET /api/analytics/forecast/:fundId
 * Generate burn-rate forecast for a specific fund
 */
router.get('/forecast/:fundId', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const { fundId, forecastDays } = ForecastParamsSchema.parse({
            fundId: req.params.fundId,
            forecastDays: req.query.forecastDays,
        });
        const forecast = await (0, burn_rate_predictor_1.generateBurnRateForecast)(tenantId, fundId, forecastDays);
        res.json({
            success: true,
            forecast,
        });
    }
    catch (error) {
        console.error('Error generating forecast:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate forecast',
        });
    }
});
/**
 * GET /api/analytics/historical/:fundId
 * Get historical burn rate data
 */
router.get('/historical/:fundId', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const fundId = req.params.fundId;
        const { startDate, endDate } = DateRangeSchema.parse({
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        });
        const historicalData = await (0, burn_rate_predictor_1.getHistoricalBurnRate)(tenantId, fundId, new Date(startDate), new Date(endDate));
        res.json({
            success: true,
            data: historicalData,
            count: historicalData.length,
        });
    }
    catch (error) {
        console.error('Error fetching historical data:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch historical data',
        });
    }
});
/**
 * GET /api/analytics/seasonal/:fundId
 * Get seasonal patterns for a fund
 */
router.get('/seasonal/:fundId', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const fundId = req.params.fundId;
        const patterns = await (0, burn_rate_predictor_1.detectSeasonalPatterns)(tenantId, fundId);
        res.json({
            success: true,
            patterns,
        });
    }
    catch (error) {
        console.error('Error detecting seasonal patterns:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to detect patterns',
        });
    }
});
/**
 * POST /api/analytics/alerts/process
 * Process automated alerts for all funds (admin/cron)
 */
router.post('/alerts/process', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const alertsSent = await (0, burn_rate_predictor_1.processAutomatedAlerts)({ tenantId });
        res.json({
            success: true,
            alertsSent,
            message: `Processed alerts for tenant. ${alertsSent} alerts sent.`,
        });
    }
    catch (error) {
        console.error('Error processing alerts:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process alerts',
        });
    }
});
/**
 * POST /api/analytics/reports/weekly
 * Generate weekly forecast report
 */
router.post('/reports/weekly', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.user?.id;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required',
            });
        }
        await (0, burn_rate_predictor_1.generateWeeklyForecastReport)({ tenantId });
        res.json({
            success: true,
            message: 'Weekly forecast report generated and queued for delivery',
        });
    }
    catch (error) {
        console.error('Error generating weekly report:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate report',
        });
    }
});
// ============================================================================
// FINANCIAL ANALYTICS ENDPOINTS
// ============================================================================
/**
 * GET /api/analytics/summary
 * Get financial summary for the tenant
 */
router.get('/summary', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        // Get total funds
        const [fundsData] = await db_1.db
            .select({
            count: (0, drizzle_orm_1.sql) `COUNT(*)`,
        })
            .from(schema_1.strikeFunds)
            .where((0, drizzle_orm_1.eq)(schema_1.strikeFunds.tenantId, tenantId));
        // Calculate total balance from all donations - all stipends
        const [balanceData] = await db_1.db
            .select({
            totalDonations: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.donations.amount} AS NUMERIC)), 0)`,
        })
            .from(schema_1.donations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.donations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.donations.status, 'completed')));
        const [stipendData] = await db_1.db
            .select({
            totalStipends: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.stipendDisbursements.amount} AS NUMERIC)), 0)`,
        })
            .from(schema_1.stipendDisbursements)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.status, 'paid')));
        const totalBalance = Number(balanceData.totalDonations) - Number(stipendData.totalStipends);
        // Get total target amount across all funds (column doesn't exist yet, using 0)
        const targetData = { totalTarget: 0 };
        // Get total donations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [donationsData] = await db_1.db
            .select({
            count: (0, drizzle_orm_1.sql) `COUNT(*)`,
            total: (0, drizzle_orm_1.sql) `SUM(CAST(${schema_1.donations.amount} AS NUMERIC))`,
        })
            .from(schema_1.donations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.donations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.donations.status, 'completed'), (0, drizzle_orm_1.gte)(schema_1.donations.createdAt, thirtyDaysAgo)));
        // Get total stipends (last 30 days)
        const [stipendsData] = await db_1.db
            .select({
            count: (0, drizzle_orm_1.sql) `COUNT(*)`,
            total: (0, drizzle_orm_1.sql) `SUM(CAST(${schema_1.stipendDisbursements.amount} AS NUMERIC))`,
        })
            .from(schema_1.stipendDisbursements)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.status, 'paid'), (0, drizzle_orm_1.gte)(schema_1.stipendDisbursements.createdAt, thirtyDaysAgo)));
        // Get dues collected (last 30 days)
        const [duesData] = await db_1.db
            .select({
            count: (0, drizzle_orm_1.sql) `COUNT(*)`,
            total: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.duesTransactions.amount} AS NUMERIC)), 0)`,
        })
            .from(schema_1.duesTransactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.duesTransactions.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.duesTransactions.status, 'completed'), (0, drizzle_orm_1.gte)(schema_1.duesTransactions.createdAt, thirtyDaysAgo)));
        const summary = {
            strikeFunds: {
                count: Number(fundsData.count),
                totalBalance,
                totalTarget: Number(targetData.totalTarget),
                percentOfTarget: targetData.totalTarget > 0
                    ? ((totalBalance / Number(targetData.totalTarget)) * 100).toFixed(1)
                    : '0',
            },
            last30Days: {
                donations: {
                    count: Number(donationsData?.count || 0),
                    total: Number(donationsData?.total || 0),
                },
                stipends: {
                    count: Number(stipendsData?.count || 0),
                    total: Number(stipendsData?.total || 0),
                },
                duesCollected: {
                    count: Number(duesData?.count || 0),
                    total: Number(duesData?.total || 0),
                },
                netCashFlow: Number(donationsData?.total || 0) + Number(duesData?.total || 0) - Number(stipendsData?.total || 0),
            },
        };
        res.json({
            success: true,
            summary,
        });
    }
    catch (error) {
        console.error('Error fetching financial summary:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch summary',
        });
    }
});
/**
 * GET /api/analytics/trends
 * Get financial trends over time
 */
router.get('/trends', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const days = parseInt(req.query.days) || 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        // Daily donations trend
        const donationsTrend = await db_1.db
            .select({
            date: (0, drizzle_orm_1.sql) `DATE(${schema_1.donations.createdAt})`,
            amount: (0, drizzle_orm_1.sql) `SUM(CAST(${schema_1.donations.amount} AS NUMERIC))`,
            count: (0, drizzle_orm_1.sql) `COUNT(*)`,
        })
            .from(schema_1.donations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.donations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.donations.status, 'completed'), (0, drizzle_orm_1.gte)(schema_1.donations.createdAt, startDate)))
            .groupBy((0, drizzle_orm_1.sql) `DATE(${schema_1.donations.createdAt})`)
            .orderBy((0, drizzle_orm_1.sql) `DATE(${schema_1.donations.createdAt})`);
        // Daily stipends trend
        const stipendsTrend = await db_1.db
            .select({
            date: (0, drizzle_orm_1.sql) `DATE(${schema_1.stipendDisbursements.createdAt})`,
            amount: (0, drizzle_orm_1.sql) `SUM(CAST(${schema_1.stipendDisbursements.amount} AS NUMERIC))`,
            count: (0, drizzle_orm_1.sql) `COUNT(*)`,
        })
            .from(schema_1.stipendDisbursements)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.status, 'paid'), (0, drizzle_orm_1.gte)(schema_1.stipendDisbursements.createdAt, startDate)))
            .groupBy((0, drizzle_orm_1.sql) `DATE(${schema_1.stipendDisbursements.createdAt})`)
            .orderBy((0, drizzle_orm_1.sql) `DATE(${schema_1.stipendDisbursements.createdAt})`);
        res.json({
            success: true,
            trends: {
                donations: donationsTrend.map((d) => ({
                    date: d.date,
                    amount: Number(d.amount),
                    count: Number(d.count),
                })),
                stipends: stipendsTrend.map((s) => ({
                    date: s.date,
                    amount: Number(s.amount),
                    count: Number(s.count),
                })),
            },
            period: {
                startDate: startDate.toISOString(),
                endDate: new Date().toISOString(),
                days,
            },
        });
    }
    catch (error) {
        console.error('Error fetching trends:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch trends',
        });
    }
});
/**
 * GET /api/analytics/top-donors
 * Get top donors by contribution amount
 */
router.get('/top-donors', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const limit = parseInt(req.query.limit) || 10;
        const topDonors = await db_1.db
            .select({
            donorEmail: schema_1.donations.donorEmail,
            donorName: schema_1.donations.donorName,
            totalAmount: (0, drizzle_orm_1.sql) `SUM(CAST(${schema_1.donations.amount} AS NUMERIC))`,
            donationCount: (0, drizzle_orm_1.sql) `COUNT(*)`,
            lastDonation: (0, drizzle_orm_1.sql) `MAX(${schema_1.donations.createdAt})`,
        })
            .from(schema_1.donations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.donations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.donations.status, 'completed'), (0, drizzle_orm_1.eq)(schema_1.donations.isAnonymous, false)))
            .groupBy(schema_1.donations.donorEmail, schema_1.donations.donorName)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `SUM(CAST(${schema_1.donations.amount} AS NUMERIC))`))
            .limit(limit);
        res.json({
            success: true,
            topDonors: topDonors.map((donor) => ({
                donorEmail: donor.donorEmail,
                donorName: donor.donorName,
                totalAmount: Number(donor.totalAmount),
                donationCount: Number(donor.donationCount),
                lastDonation: donor.lastDonation,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching top donors:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch top donors',
        });
    }
});
/**
 * GET /api/analytics/fund-health
 * Get health status for all funds
 */
router.get('/fund-health', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const funds = await db_1.db
            .select()
            .from(schema_1.strikeFunds)
            .where((0, drizzle_orm_1.eq)(schema_1.strikeFunds.tenantId, tenantId));
        const fundHealth = await Promise.all(funds.map(async (fund) => {
            try {
                // Calculate current balance for this fund
                const [balanceData] = await db_1.db
                    .select({
                    totalDonations: (0, drizzle_orm_1.sql) `COALESCE(SUM(CASE WHEN ${schema_1.donations.status} = 'completed' THEN CAST(${schema_1.donations.amount} AS NUMERIC) ELSE 0 END), 0)`,
                    totalStipends: (0, drizzle_orm_1.sql) `COALESCE(SUM(CASE WHEN ${schema_1.stipendDisbursements.status} = 'paid' THEN CAST(${schema_1.stipendDisbursements.amount} AS NUMERIC) ELSE 0 END), 0)`,
                })
                    .from(schema_1.donations)
                    .leftJoin(schema_1.stipendDisbursements, (0, drizzle_orm_1.eq)(schema_1.donations.strikeFundId, schema_1.stipendDisbursements.strikeFundId))
                    .where((0, drizzle_orm_1.eq)(schema_1.donations.strikeFundId, fund.id));
                const currentBalance = Number(balanceData?.totalDonations || 0) - Number(balanceData?.totalStipends || 0);
                const targetAmount = Number(fund.targetAmount || currentBalance * 2);
                const forecast = await (0, burn_rate_predictor_1.generateBurnRateForecast)(tenantId, fund.id, 90);
                const realisticScenario = forecast.scenarios.find((s) => s.scenario === 'realistic');
                return {
                    fundId: fund.id,
                    fundName: fund.fundName,
                    currentBalance: Number(currentBalance.toFixed(2)),
                    targetAmount: Number(targetAmount.toFixed(2)),
                    percentOfTarget: targetAmount > 0 ? ((currentBalance / targetAmount) * 100).toFixed(1) : '0.0',
                    daysRemaining: realisticScenario?.daysRemaining ?? null,
                    healthStatus: !realisticScenario || realisticScenario?.daysRemaining === null
                        ? 'healthy'
                        : realisticScenario?.daysRemaining < 30
                            ? 'critical'
                            : realisticScenario?.daysRemaining < 60
                                ? 'warning'
                                : 'healthy',
                    alerts: forecast.alerts,
                };
            }
            catch (error) {
                // Fallback for funds without forecasts - calculate balance
                const [balanceData] = await db_1.db
                    .select({
                    totalDonations: (0, drizzle_orm_1.sql) `COALESCE(SUM(CASE WHEN ${schema_1.donations.status} = 'completed' THEN CAST(${schema_1.donations.amount} AS NUMERIC) ELSE 0 END), 0)`,
                    totalStipends: (0, drizzle_orm_1.sql) `COALESCE(SUM(CASE WHEN ${schema_1.stipendDisbursements.status} = 'paid' THEN CAST(${schema_1.stipendDisbursements.amount} AS NUMERIC) ELSE 0 END), 0)`,
                })
                    .from(schema_1.donations)
                    .leftJoin(schema_1.stipendDisbursements, (0, drizzle_orm_1.eq)(schema_1.donations.strikeFundId, schema_1.stipendDisbursements.strikeFundId))
                    .where((0, drizzle_orm_1.eq)(schema_1.donations.strikeFundId, fund.id));
                const currentBalance = Number(balanceData?.totalDonations || 0) - Number(balanceData?.totalStipends || 0);
                const targetAmount = Number(fund.targetAmount || currentBalance * 2);
                return {
                    fundId: fund.id,
                    fundName: fund.fundName,
                    currentBalance: Number(currentBalance.toFixed(2)),
                    targetAmount: Number(targetAmount.toFixed(2)),
                    percentOfTarget: targetAmount > 0 ? ((currentBalance / targetAmount) * 100).toFixed(1) : '0.0',
                    daysRemaining: null,
                    healthStatus: 'unknown',
                    alerts: [],
                    error: 'Failed to generate forecast',
                };
            }
        }));
        res.json({
            success: true,
            funds: fundHealth,
            summary: {
                total: fundHealth.length,
                healthy: fundHealth.filter((f) => f.healthStatus === 'healthy').length,
                warning: fundHealth.filter((f) => f.healthStatus === 'warning').length,
                critical: fundHealth.filter((f) => f.healthStatus === 'critical').length,
            },
        });
    }
    catch (error) {
        console.error('Error fetching fund health:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch fund health',
        });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map