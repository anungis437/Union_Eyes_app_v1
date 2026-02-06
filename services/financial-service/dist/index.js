"use strict";
/**
 * Financial Service - Main Entry Point
 *
 * Microservice handling:
 * - Dues calculations and management
 * - Employer remittance processing
 * - Arrears tracking and collections
 * - Strike fund operations
 * - Payment integrations (Stripe)
 *
 * Port: 3007
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const winston_1 = __importDefault(require("winston"));
// Route imports
const dues_rules_1 = __importDefault(require("./routes/dues-rules"));
const dues_assignments_1 = __importDefault(require("./routes/dues-assignments"));
const dues_transactions_1 = __importDefault(require("./routes/dues-transactions"));
const remittances_1 = __importDefault(require("./routes/remittances"));
const arrears_1 = __importDefault(require("./routes/arrears"));
const strike_funds_1 = __importDefault(require("./routes/strike-funds"));
const donations_1 = __importDefault(require("./routes/donations"));
const reports_1 = __importDefault(require("./routes/reports"));
const picket_tracking_1 = __importDefault(require("./routes/picket-tracking"));
const stipends_1 = __importDefault(require("./routes/stipends"));
const payments_1 = __importDefault(require("./routes/payments"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const analytics_processor_1 = require("./jobs/analytics-processor");
const dues_calculation_workflow_1 = require("./jobs/dues-calculation-workflow");
const arrears_management_workflow_1 = require("./jobs/arrears-management-workflow");
const payment_collection_workflow_1 = require("./jobs/payment-collection-workflow");
const stipend_processing_workflow_1 = require("./jobs/stipend-processing-workflow");
dotenv_1.default.config();
// ============================================================================
// LOGGER SETUP
// ============================================================================
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
        }),
    ],
});
// ============================================================================
// EXPRESS APP SETUP
// ============================================================================
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3007;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);
// Body parsing - Stripe webhook needs raw body
app.use((req, res, next) => {
    if (req.originalUrl === '/api/donations/webhooks/stripe') {
        next(); // Skip body parsing for Stripe webhook
    }
    else {
        express_1.default.json({ limit: '10mb' })(req, res, next);
    }
});
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    next();
});
const authenticate = async (req, res, next) => {
    try {
        // Development bypass for testing
        if (process.env.NODE_ENV === 'development' && req.headers['x-test-user']) {
            try {
                req.user = JSON.parse(req.headers['x-test-user']);
                logger.info('Development auth bypass used', { userId: req.user?.id });
                return next();
            }
            catch (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid X-Test-User header format. Expected JSON string.',
                });
            }
        }
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Missing or invalid authorization header',
            });
        }
        const token = authHeader.substring(7);
        // TODO: Implement JWT verification with Clerk
        // For now, parse basic info from token
        // In production, verify signature and expiration
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            req.user = {
                id: payload.sub,
                tenantId: payload.tenant_id,
                role: payload.org_role,
                permissions: payload.org_permissions || [],
            };
            next();
        }
        catch (error) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token format',
            });
        }
    }
    catch (error) {
        logger.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed',
        });
    }
};
// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                requiredRoles: roles,
            });
        }
        next();
    };
};
// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'financial-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
// ============================================================================
// API ROUTES
// ============================================================================
// Dues Management
app.use('/api/dues/rules', authenticate, dues_rules_1.default);
app.use('/api/dues/assignments', authenticate, dues_assignments_1.default);
app.use('/api/dues/transactions', authenticate, dues_transactions_1.default);
// Remittance Processing
app.use('/api/remittances', authenticate, remittances_1.default);
// Arrears Management
app.use('/api/arrears', authenticate, arrears_1.default);
// Strike Funds
app.use('/api/strike-funds', authenticate, strike_funds_1.default);
// Picket Tracking
app.use('/api/picket', authenticate, picket_tracking_1.default);
// Stipend Management
app.use('/api/stipends', authenticate, stipends_1.default);
// Payment Processing
app.use('/api/payments', payments_1.default); // Note: Some endpoints allow public access
// Notification System
app.use('/api/notifications', authenticate, notifications_1.default);
// Analytics & Forecasting
app.use('/api/analytics', authenticate, analytics_1.default);
// Financial Reports (authentication applied)
app.use('/api/reports', authenticate, reports_1.default);
// Public Donations (no auth required for donations)
app.use('/api/donations', donations_1.default);
// ============================================================================
// ERROR HANDLING
// ============================================================================
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
    });
});
// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});
// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
    logger.info(`Financial service started on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('Available endpoints:');
    logger.info('  - GET  /health');
    logger.info('  - POST /api/dues/rules');
    logger.info('  - GET  /api/dues/rules');
    logger.info('  - POST /api/dues/assignments');
    logger.info('  - POST /api/dues/transactions/calculate');
    logger.info('  - POST /api/dues/transactions/batch');
    logger.info('  - POST /api/remittances');
    logger.info('  - GET  /api/arrears');
    logger.info('  - POST /api/strike-funds');
    logger.info('  - POST /api/donations');
    // Start scheduled jobs and workflows
    if (process.env.ENABLE_SCHEDULED_JOBS !== 'false') {
        try {
            // Analytics jobs (hourly alerts, weekly forecasts)
            (0, analytics_processor_1.startAnalyticsJobs)();
            logger.info('✓ Analytics scheduled jobs started');
            // Workflow automation (dues, arrears, payments, stipends)
            (0, dues_calculation_workflow_1.startDuesCalculationWorkflow)();
            (0, arrears_management_workflow_1.startArrearsManagementWorkflow)();
            (0, payment_collection_workflow_1.startPaymentCollectionWorkflow)();
            (0, stipend_processing_workflow_1.startStipendProcessingWorkflow)();
            logger.info('✓ All automated workflows started (4 workflows)');
        }
        catch (error) {
            logger.error('Failed to start scheduled jobs/workflows', { error });
        }
    }
    else {
        logger.info('Scheduled jobs and workflows disabled (ENABLE_SCHEDULED_JOBS=false)');
    }
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    // Stop scheduled jobs and workflows
    try {
        (0, analytics_processor_1.stopAnalyticsJobs)();
        (0, dues_calculation_workflow_1.stopDuesCalculationWorkflow)();
        (0, arrears_management_workflow_1.stopArrearsManagementWorkflow)();
        (0, payment_collection_workflow_1.stopPaymentCollectionWorkflow)();
        (0, stipend_processing_workflow_1.stopStipendProcessingWorkflow)();
        logger.info('✓ All scheduled jobs and workflows stopped');
    }
    catch (error) {
        logger.error('Error stopping scheduled jobs/workflows', { error });
    }
    process.exit(0);
});
process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    // Stop scheduled jobs and workflows
    try {
        (0, analytics_processor_1.stopAnalyticsJobs)();
        (0, dues_calculation_workflow_1.stopDuesCalculationWorkflow)();
        (0, arrears_management_workflow_1.stopArrearsManagementWorkflow)();
        (0, payment_collection_workflow_1.stopPaymentCollectionWorkflow)();
        (0, stipend_processing_workflow_1.stopStipendProcessingWorkflow)();
        logger.info('✓ All scheduled jobs and workflows stopped');
    }
    catch (error) {
        logger.error('Error stopping scheduled jobs/workflows', { error });
    }
    process.exit(0);
});
exports.default = app;
//# sourceMappingURL=index.js.map