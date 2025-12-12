"use strict";
/**
 * Notification Routes
 * Week 9-10: API endpoints for notification management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const notification_service_1 = require("../services/notification-service");
const router = (0, express_1.Router)();
// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
const QueueNotificationSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    type: zod_1.z.enum([
        'payment_confirmation',
        'payment_failed',
        'payment_reminder',
        'donation_received',
        'stipend_approved',
        'stipend_disbursed',
        'low_balance_alert',
        'arrears_warning',
        'strike_announcement',
        'picket_reminder',
    ]),
    channels: zod_1.z.array(zod_1.z.enum(['email', 'sms', 'push', 'in_app'])).min(1),
    priority: zod_1.z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    data: zod_1.z.record(zod_1.z.any()),
    scheduledFor: zod_1.z.string().datetime().optional(),
});
const UpdatePreferencesSchema = zod_1.z.object({
    preferences: zod_1.z.record(zod_1.z.boolean()),
});
// ============================================================================
// ROUTES
// ============================================================================
/**
 * POST /api/notifications/queue
 * Queue a notification for delivery
 */
router.post('/queue', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Missing x-tenant-id header',
            });
        }
        const body = QueueNotificationSchema.parse(req.body);
        const notificationId = await (0, notification_service_1.queueNotification)({
            tenantId,
            ...body,
            scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
        });
        res.json({
            success: true,
            notificationId,
            message: 'Notification queued successfully',
        });
    }
    catch (error) {
        console.error('Queue notification error:', error);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/notifications/preferences
 * Get current user's notification preferences
 */
router.get('/preferences', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.query.userId;
        if (!tenantId || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Missing tenantId or userId',
            });
        }
        const preferences = await (0, notification_service_1.getUserNotificationPreferences)(tenantId, userId);
        res.json({
            success: true,
            preferences,
        });
    }
    catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
router.put('/preferences', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.body.userId;
        if (!tenantId || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Missing tenantId or userId',
            });
        }
        const { preferences } = UpdatePreferencesSchema.parse(req.body);
        await (0, notification_service_1.updateUserNotificationPreferences)(tenantId, userId, preferences);
        res.json({
            success: true,
            message: 'Preferences updated successfully',
        });
    }
    catch (error) {
        console.error('Update preferences error:', error);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/notifications/history
 * Get notification history for a user
 */
router.get('/history', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.query.userId;
        const limit = parseInt(req.query.limit) || 50;
        if (!tenantId || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Missing tenantId or userId',
            });
        }
        const history = await (0, notification_service_1.getNotificationHistory)(tenantId, userId, limit);
        res.json({
            success: true,
            history,
            count: history.length,
        });
    }
    catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/notifications/process
 * Process pending notifications (admin/cron endpoint)
 */
router.post('/process', async (req, res) => {
    try {
        const batchSize = parseInt(req.body.batchSize) || 50;
        const processed = await (0, notification_service_1.processPendingNotifications)(batchSize);
        res.json({
            success: true,
            processed,
            message: `Processed ${processed} notifications`,
        });
    }
    catch (error) {
        console.error('Process notifications error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/notifications/retry-failed
 * Retry failed notifications (admin endpoint)
 */
router.post('/retry-failed', async (req, res) => {
    try {
        const maxAttempts = parseInt(req.body.maxAttempts) || 3;
        const retried = await (0, notification_service_1.retryFailedNotifications)(maxAttempts);
        res.json({
            success: true,
            retried,
            message: `Retried ${retried} failed notifications`,
        });
    }
    catch (error) {
        console.error('Retry failed notifications error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
// ============================================================================
// HELPER ENDPOINT: Send Test Notification
// ============================================================================
/**
 * POST /api/notifications/test
 * Send a test notification (development only)
 */
router.post('/test', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Missing x-tenant-id header',
            });
        }
        const notificationId = await (0, notification_service_1.queueNotification)({
            tenantId,
            userId: req.body.userId || '00000000-0000-0000-0000-000000000000',
            type: 'payment_confirmation',
            channels: ['email'],
            priority: 'normal',
            data: {
                amount: '$50.00',
                transactionId: 'test-123',
            },
        });
        // Process immediately
        await (0, notification_service_1.processPendingNotifications)(1);
        res.json({
            success: true,
            notificationId,
            message: 'Test notification sent',
        });
    }
    catch (error) {
        console.error('Test notification error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map