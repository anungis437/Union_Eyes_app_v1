"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const financial_reports_1 = require("../services/financial-reports");
const router = (0, express_1.Router)();
// Role-based authorization (assumes authenticate middleware already ran)
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        next();
    };
};
// Date range schema for validation
const dateRangeSchema = zod_1.z.object({
    startDate: zod_1.z.coerce.date(),
    endDate: zod_1.z.coerce.date(),
});
/**
 * GET /api/reports/dashboard
 * Get comprehensive financial dashboard
 */
router.get('/dashboard', authorize(['admin', 'financial_admin', 'financial_viewer']), async (req, res) => {
    try {
        const { tenantId } = req.user;
        // Default to last 30 days if not specified
        const endDate = req.query.endDate
            ? new Date(req.query.endDate)
            : new Date();
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const dashboard = await (0, financial_reports_1.getFinancialDashboard)(tenantId, {
            startDate,
            endDate,
        });
        res.json({
            success: true,
            data: dashboard,
        });
    }
    catch (error) {
res.status(500).json({
            success: false,
            error: 'Failed to generate dashboard',
        });
    }
});
/**
 * GET /api/reports/collection-metrics
 * Get dues collection metrics for a date range
 */
router.get('/collection-metrics', authorize(['admin', 'financial_admin', 'financial_viewer']), async (req, res) => {
    try {
        const { tenantId } = req.user;
        const validation = dateRangeSchema.safeParse(req.query);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date range',
                details: validation.error.errors,
            });
        }
        const { startDate, endDate } = validation.data;
        const metrics = await (0, financial_reports_1.getCollectionMetrics)(tenantId, {
            startDate,
            endDate,
        });
        res.json({
            success: true,
            data: metrics,
        });
    }
    catch (error) {
res.status(500).json({
            success: false,
            error: 'Failed to calculate collection metrics',
        });
    }
});
/**
 * GET /api/reports/arrears-statistics
 * Get current arrears statistics
 */
router.get('/arrears-statistics', authorize(['admin', 'financial_admin', 'financial_viewer']), async (req, res) => {
    try {
        const { tenantId } = req.user;
        const statistics = await (0, financial_reports_1.getArrearsStatistics)(tenantId);
        res.json({
            success: true,
            data: statistics,
        });
    }
    catch (error) {
res.status(500).json({
            success: false,
            error: 'Failed to calculate arrears statistics',
        });
    }
});
/**
 * GET /api/reports/revenue-analysis
 * Get revenue trends and analysis
 */
router.get('/revenue-analysis', authorize(['admin', 'financial_admin', 'financial_viewer']), async (req, res) => {
    try {
        const { tenantId } = req.user;
        const validation = dateRangeSchema.safeParse(req.query);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date range',
                details: validation.error.errors,
            });
        }
        const { startDate, endDate } = validation.data;
        const analysis = await (0, financial_reports_1.getRevenueAnalysis)(tenantId, {
            startDate,
            endDate,
        });
        res.json({
            success: true,
            data: analysis,
        });
    }
    catch (error) {
res.status(500).json({
            success: false,
            error: 'Failed to analyze revenue',
        });
    }
});
/**
 * GET /api/reports/member-payment-patterns
 * Get member payment patterns and reliability scores
 */
router.get('/member-payment-patterns', authorize(['admin', 'financial_admin', 'financial_viewer']), async (req, res) => {
    try {
        const { tenantId } = req.user;
        const validation = dateRangeSchema.safeParse(req.query);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date range',
                details: validation.error.errors,
            });
        }
        const { startDate, endDate } = validation.data;
        const limit = req.query.limit
            ? Math.min(parseInt(req.query.limit), 1000)
            : 100;
        const patterns = await (0, financial_reports_1.getMemberPaymentPatterns)(tenantId, { startDate, endDate }, limit);
        res.json({
            success: true,
            data: {
                patterns,
                count: patterns.length,
                limit,
            },
        });
    }
    catch (error) {
res.status(500).json({
            success: false,
            error: 'Failed to analyze member payment patterns',
        });
    }
});
/**
 * GET /api/reports/export
 * Export financial report data in various formats
 */
router.get('/export', authorize(['admin', 'financial_admin']), async (req, res) => {
    try {
        const { tenantId } = req.user;
        const format = req.query.format || 'json';
        const reportType = req.query.type;
        if (!reportType) {
            return res.status(400).json({
                success: false,
                error: 'Report type is required',
            });
        }
        const validation = dateRangeSchema.safeParse(req.query);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date range',
                details: validation.error.errors,
            });
        }
        const { startDate, endDate } = validation.data;
        let data;
        switch (reportType) {
            case 'dashboard':
                data = await (0, financial_reports_1.getFinancialDashboard)(tenantId, { startDate, endDate });
                break;
            case 'collection':
                data = await (0, financial_reports_1.getCollectionMetrics)(tenantId, { startDate, endDate });
                break;
            case 'arrears':
                data = await (0, financial_reports_1.getArrearsStatistics)(tenantId);
                break;
            case 'revenue':
                data = await (0, financial_reports_1.getRevenueAnalysis)(tenantId, { startDate, endDate });
                break;
            case 'patterns':
                data = await (0, financial_reports_1.getMemberPaymentPatterns)(tenantId, { startDate, endDate }, 1000);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid report type',
                });
        }
        if (format === 'csv') {
            // Convert to CSV (simplified)
            const csv = convertToCSV(data);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${Date.now()}.csv"`);
            res.send(csv);
        }
        else {
            // JSON format
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${Date.now()}.json"`);
            res.json({
                success: true,
                reportType,
                dateRange: { startDate, endDate },
                data,
                exportedAt: new Date().toISOString(),
            });
        }
    }
    catch (error) {
res.status(500).json({
            success: false,
            error: 'Failed to export report',
        });
    }
});
/**
 * Simple CSV converter for export
 */
function convertToCSV(data) {
    if (Array.isArray(data)) {
        if (data.length === 0)
            return '';
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(item => Object.values(item).map(val => typeof val === 'string' ? `"${val}"` : val).join(','));
        return [headers, ...rows].join('\n');
    }
    else {
        // For single objects, convert to key-value pairs
        const rows = Object.entries(data).map(([key, value]) => `"${key}","${value}"`);
        return ['Field,Value', ...rows].join('\n');
    }
}
exports.default = router;
//# sourceMappingURL=reports.js.map