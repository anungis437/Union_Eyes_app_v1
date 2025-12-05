"use strict";
/**
 * Analytics Endpoints Test Suite
 *
 * Tests all analytics endpoints:
 * - Fund health metrics
 * - Burn rate predictions
 * - Top donors
 * - Fund activity
 * - Automated alerts
 * - Weekly forecasts
 * - Fund performance
 * - Trend analysis
 * - Summary statistics
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const crypto_1 = require("crypto");
const index_1 = __importDefault(require("../index"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Generate valid UUIDs for test identifiers
const TEST_TENANT_ID = (0, crypto_1.randomUUID)();
const TEST_USER_ID = (0, crypto_1.randomUUID)();
let testFundId1;
let testFundId2;
let testMemberId;
(0, globals_1.describe)('Analytics Endpoints - Comprehensive Tests', () => {
    (0, globals_1.beforeAll)(async () => {
        console.log('Setting up analytics test data...');
        // Create test member
        const memberResult = await db_1.db.insert(schema_1.members).values({
            tenantId: TEST_TENANT_ID,
            organizationId: TEST_TENANT_ID,
            userId: TEST_USER_ID,
            name: 'Test Donor',
            email: 'donor@test.com',
            status: 'active',
        }).returning();
        testMemberId = memberResult[0].id;
        // Create test strike funds
        testFundId1 = `fund_analytics_1_${Date.now()}`;
        testFundId2 = `fund_analytics_2_${Date.now()}`;
        const funds = await db_1.db.insert(schema_1.strikeFunds).values([
            {
                tenantId: TEST_TENANT_ID,
                fundName: 'Test Strike Fund 1',
                fundCode: 'TEST_FUND_1',
                fundType: 'strike',
                targetAmount: '100000.00',
                isActive: true,
                createdBy: TEST_USER_ID,
            },
            {
                tenantId: TEST_TENANT_ID,
                fundName: 'Test Strike Fund 2',
                fundCode: 'TEST_FUND_2',
                fundType: 'strike',
                targetAmount: '50000.00',
                isActive: true,
                createdBy: TEST_USER_ID,
            },
        ]).returning();
        testFundId1 = funds[0].id;
        testFundId2 = funds[1].id;
        // Create test donations
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const donationData = [];
        for (let i = 0; i < 10; i++) {
            const date = new Date(thirtyDaysAgo);
            date.setDate(date.getDate() + i * 3);
            donationData.push({
                id: `donation_${Date.now()}_${i}`,
                tenantId: TEST_TENANT_ID,
                strikeFundId: testFundId1,
                donorName: `Donor ${i}`,
                amount: (100 + i * 50).toString(),
                donationDate: date,
                donationType: 'one_time',
                status: 'completed',
            });
        }
        await db_1.db.insert(schema_1.donations).values(donationData);
        // Create test expenses - SKIPPED: strikeExpenses table not yet in schema
        // Create test stipends
        const stipendData = [];
        for (let i = 0; i < 3; i++) {
            const weekStart = new Date(thirtyDaysAgo);
            weekStart.setDate(weekStart.getDate() + i * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            stipendData.push({
                id: `stipend_${Date.now()}_${i}`,
                tenantId: TEST_TENANT_ID,
                memberId: testMemberId,
                fundId: testFundId1,
                weekStartDate: weekStart,
                weekEndDate: weekEnd,
                daysWorked: 5,
                hoursWorked: '40.0',
                dailyRate: '100.00',
                calculatedAmount: '500.00',
                approvedAmount: '500.00',
                status: 'disbursed',
                disbursedAt: new Date(weekEnd.getTime() + 2 * 24 * 60 * 60 * 1000),
            });
        }
        await db_1.db.insert(schema_1.stipendDisbursements).values(stipendData);
        console.log('Analytics test data created');
    });
    (0, globals_1.afterAll)(async () => {
        console.log('Cleaning up analytics test data...');
        await db_1.db.delete(schema_1.stipendDisbursements).where((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, TEST_TENANT_ID));
        await db_1.db.delete(schema_1.donations).where((0, drizzle_orm_1.eq)(schema_1.donations.tenantId, TEST_TENANT_ID));
        await db_1.db.delete(schema_1.strikeFunds).where((0, drizzle_orm_1.eq)(schema_1.strikeFunds.tenantId, TEST_TENANT_ID));
        await db_1.db.delete(schema_1.members).where((0, drizzle_orm_1.eq)(schema_1.members.tenantId, TEST_TENANT_ID));
        console.log('Analytics test data cleaned up');
    });
    (0, globals_1.describe)('GET /api/analytics/summary', () => {
        (0, globals_1.it)('should return summary statistics for tenant', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/summary')
                .query({ tenantId: TEST_TENANT_ID });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('totalFunds');
            (0, globals_1.expect)(response.body).toHaveProperty('activeFunds');
            (0, globals_1.expect)(response.body).toHaveProperty('totalBalance');
            (0, globals_1.expect)(response.body).toHaveProperty('totalDonations');
            (0, globals_1.expect)(response.body).toHaveProperty('totalExpenses');
            (0, globals_1.expect)(response.body.activeFunds).toBeGreaterThanOrEqual(2);
        });
        (0, globals_1.it)('should require tenantId parameter', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/summary');
            (0, globals_1.expect)(response.status).toBe(400);
        });
    });
    (0, globals_1.describe)('GET /api/analytics/fund-health/:fundId', () => {
        (0, globals_1.it)('should return health metrics for specific fund', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get(`/api/analytics/fund-health/${testFundId1}`)
                .query({ tenantId: TEST_TENANT_ID });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('fundId', testFundId1);
            (0, globals_1.expect)(response.body).toHaveProperty('currentBalance');
            (0, globals_1.expect)(response.body).toHaveProperty('targetBalance');
            (0, globals_1.expect)(response.body).toHaveProperty('percentOfTarget');
            (0, globals_1.expect)(response.body).toHaveProperty('healthStatus');
            (0, globals_1.expect)(response.body).toHaveProperty('daysOfRunway');
        });
        (0, globals_1.it)('should return 404 for non-existent fund', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/fund-health/nonexistent-fund')
                .query({ tenantId: TEST_TENANT_ID });
            (0, globals_1.expect)(response.status).toBe(404);
        });
    });
    (0, globals_1.describe)('GET /api/analytics/burn-rate/:fundId', () => {
        (0, globals_1.it)('should calculate burn rate predictions', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get(`/api/analytics/burn-rate/${testFundId1}`)
                .query({ tenantId: TEST_TENANT_ID });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('fundId', testFundId1);
            (0, globals_1.expect)(response.body).toHaveProperty('currentBurnRate');
            (0, globals_1.expect)(response.body).toHaveProperty('predictedBurnRate');
            (0, globals_1.expect)(response.body).toHaveProperty('daysUntilDepletion');
            (0, globals_1.expect)(response.body).toHaveProperty('severity');
            (0, globals_1.expect)(response.body).toHaveProperty('recommendations');
            (0, globals_1.expect)(Array.isArray(response.body.recommendations)).toBe(true);
        });
        (0, globals_1.it)('should accept optional daysToAnalyze parameter', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get(`/api/analytics/burn-rate/${testFundId1}`)
                .query({
                tenantId: TEST_TENANT_ID,
                daysToAnalyze: 60
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('analysisWindow');
        });
    });
    (0, globals_1.describe)('GET /api/analytics/top-donors', () => {
        (0, globals_1.it)('should return list of top donors with amounts', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/top-donors')
                .query({
                tenantId: TEST_TENANT_ID,
                limit: 5
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(Array.isArray(response.body)).toBe(true);
            (0, globals_1.expect)(response.body.length).toBeGreaterThan(0);
            (0, globals_1.expect)(response.body[0]).toHaveProperty('donorName');
            (0, globals_1.expect)(response.body[0]).toHaveProperty('totalAmount');
            (0, globals_1.expect)(response.body[0]).toHaveProperty('donationCount');
        });
        (0, globals_1.it)('should respect limit parameter', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/top-donors')
                .query({
                tenantId: TEST_TENANT_ID,
                limit: 3
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.length).toBeLessThanOrEqual(3);
        });
        (0, globals_1.it)('should filter by fundId if provided', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/top-donors')
                .query({
                tenantId: TEST_TENANT_ID,
                fundId: testFundId1,
                limit: 10
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(Array.isArray(response.body)).toBe(true);
        });
    });
    (0, globals_1.describe)('GET /api/analytics/fund-activity/:fundId', () => {
        (0, globals_1.it)('should return activity timeline for fund', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get(`/api/analytics/fund-activity/${testFundId1}`)
                .query({
                tenantId: TEST_TENANT_ID,
                days: 30
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('fundId', testFundId1);
            (0, globals_1.expect)(response.body).toHaveProperty('activities');
            (0, globals_1.expect)(Array.isArray(response.body.activities)).toBe(true);
            if (response.body.activities.length > 0) {
                (0, globals_1.expect)(response.body.activities[0]).toHaveProperty('date');
                (0, globals_1.expect)(response.body.activities[0]).toHaveProperty('type');
                (0, globals_1.expect)(response.body.activities[0]).toHaveProperty('amount');
            }
        });
        (0, globals_1.it)('should accept days parameter', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get(`/api/analytics/fund-activity/${testFundId1}`)
                .query({
                tenantId: TEST_TENANT_ID,
                days: 7
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('periodDays', 7);
        });
    });
    (0, globals_1.describe)('GET /api/analytics/automated-alerts', () => {
        (0, globals_1.it)('should return list of active alerts', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/automated-alerts')
                .query({ tenantId: TEST_TENANT_ID });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(Array.isArray(response.body)).toBe(true);
            // Each alert should have required fields
            if (response.body.length > 0) {
                (0, globals_1.expect)(response.body[0]).toHaveProperty('fundId');
                (0, globals_1.expect)(response.body[0]).toHaveProperty('severity');
                (0, globals_1.expect)(response.body[0]).toHaveProperty('message');
                (0, globals_1.expect)(['critical', 'warning', 'info']).toContain(response.body[0].severity);
            }
        });
        (0, globals_1.it)('should filter by severity if provided', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/automated-alerts')
                .query({
                tenantId: TEST_TENANT_ID,
                severity: 'critical'
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(Array.isArray(response.body)).toBe(true);
            // All returned alerts should be critical
            response.body.forEach((alert) => {
                (0, globals_1.expect)(alert.severity).toBe('critical');
            });
        });
    });
    (0, globals_1.describe)('GET /api/analytics/weekly-forecast', () => {
        (0, globals_1.it)('should return forecast for all funds', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/weekly-forecast')
                .query({ tenantId: TEST_TENANT_ID });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('generatedAt');
            (0, globals_1.expect)(response.body).toHaveProperty('funds');
            (0, globals_1.expect)(Array.isArray(response.body.funds)).toBe(true);
            (0, globals_1.expect)(response.body.funds.length).toBeGreaterThan(0);
            const fund = response.body.funds[0];
            (0, globals_1.expect)(fund).toHaveProperty('fundId');
            (0, globals_1.expect)(fund).toHaveProperty('fundName');
            (0, globals_1.expect)(fund).toHaveProperty('currentBalance');
            (0, globals_1.expect)(fund).toHaveProperty('predictedBalance');
            (0, globals_1.expect)(fund).toHaveProperty('trend');
        });
        (0, globals_1.it)('should filter by fundId if provided', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/weekly-forecast')
                .query({
                tenantId: TEST_TENANT_ID,
                fundId: testFundId1
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.funds).toHaveLength(1);
            (0, globals_1.expect)(response.body.funds[0].fundId).toBe(testFundId1);
        });
    });
    (0, globals_1.describe)('GET /api/analytics/fund-performance/:fundId', () => {
        (0, globals_1.it)('should return performance metrics', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get(`/api/analytics/fund-performance/${testFundId1}`)
                .query({
                tenantId: TEST_TENANT_ID,
                period: '30d'
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('fundId', testFundId1);
            (0, globals_1.expect)(response.body).toHaveProperty('period');
            (0, globals_1.expect)(response.body).toHaveProperty('totalInflow');
            (0, globals_1.expect)(response.body).toHaveProperty('totalOutflow');
            (0, globals_1.expect)(response.body).toHaveProperty('netChange');
            (0, globals_1.expect)(response.body).toHaveProperty('averageDailyBurn');
        });
        (0, globals_1.it)('should accept different period values', async () => {
            const periods = ['7d', '30d', '90d'];
            for (const period of periods) {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get(`/api/analytics/fund-performance/${testFundId1}`)
                    .query({
                    tenantId: TEST_TENANT_ID,
                    period
                });
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.body.period).toBe(period);
            }
        });
    });
    (0, globals_1.describe)('GET /api/analytics/trend-analysis/:fundId', () => {
        (0, globals_1.it)('should return trend data points', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get(`/api/analytics/trend-analysis/${testFundId1}`)
                .query({
                tenantId: TEST_TENANT_ID,
                days: 30
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('fundId', testFundId1);
            (0, globals_1.expect)(response.body).toHaveProperty('dataPoints');
            (0, globals_1.expect)(Array.isArray(response.body.dataPoints)).toBe(true);
            if (response.body.dataPoints.length > 0) {
                const point = response.body.dataPoints[0];
                (0, globals_1.expect)(point).toHaveProperty('date');
                (0, globals_1.expect)(point).toHaveProperty('balance');
                (0, globals_1.expect)(point).toHaveProperty('inflow');
                (0, globals_1.expect)(point).toHaveProperty('outflow');
            }
        });
        (0, globals_1.it)('should support different granularity levels', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get(`/api/analytics/trend-analysis/${testFundId1}`)
                .query({
                tenantId: TEST_TENANT_ID,
                days: 90,
                granularity: 'weekly'
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('granularity', 'weekly');
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should return 400 for missing tenantId', async () => {
            const endpoints = [
                '/api/analytics/summary',
                '/api/analytics/top-donors',
                '/api/analytics/automated-alerts',
                '/api/analytics/weekly-forecast',
            ];
            for (const endpoint of endpoints) {
                const response = await (0, supertest_1.default)(index_1.default).get(endpoint);
                (0, globals_1.expect)(response.status).toBe(400);
                (0, globals_1.expect)(response.body).toHaveProperty('error');
            }
        });
        (0, globals_1.it)('should return 404 for non-existent fundId', async () => {
            const endpoints = [
                '/api/analytics/fund-health/fake-fund',
                '/api/analytics/burn-rate/fake-fund',
                '/api/analytics/fund-activity/fake-fund',
                '/api/analytics/fund-performance/fake-fund',
                '/api/analytics/trend-analysis/fake-fund',
            ];
            for (const endpoint of endpoints) {
                const response = await (0, supertest_1.default)(index_1.default)
                    .get(endpoint)
                    .query({ tenantId: TEST_TENANT_ID });
                (0, globals_1.expect)(response.status).toBe(404);
            }
        });
        (0, globals_1.it)('should handle invalid parameter types gracefully', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/top-donors')
                .query({
                tenantId: TEST_TENANT_ID,
                limit: 'not-a-number'
            });
            // Should either return 400 or use default limit
            (0, globals_1.expect)([200, 400]).toContain(response.status);
        });
    });
    (0, globals_1.describe)('Performance Tests', () => {
        (0, globals_1.it)('should respond within acceptable time for summary endpoint', async () => {
            const startTime = Date.now();
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/summary')
                .query({ tenantId: TEST_TENANT_ID });
            const responseTime = Date.now() - startTime;
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
        });
        (0, globals_1.it)('should handle concurrent requests efficiently', async () => {
            const requests = Array(5).fill(null).map(() => (0, supertest_1.default)(index_1.default)
                .get('/api/analytics/summary')
                .query({ tenantId: TEST_TENANT_ID }));
            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const totalTime = Date.now() - startTime;
            responses.forEach(response => {
                (0, globals_1.expect)(response.status).toBe(200);
            });
            (0, globals_1.expect)(totalTime).toBeLessThan(5000); // All 5 requests within 5 seconds
        });
    });
});
//# sourceMappingURL=analytics.test.js.map