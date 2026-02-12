"use strict";
/**
 * Notification Routes
 * Week 9-10: API endpoints for notification management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const notification_service_1 = require("../services/notification-service");
// TODO: Fix logger import path
// import { logger } from '@/lib/logger';
const logger = console;
const router = (0, express_1.Router)();
const getOrganizationIdFromHeaders = (req) => req.headers['x-organization-id'] || req.headers['x-tenant-id'];
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
        const organizationId = getOrganizationIdFromHeaders(req);
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                error: 'Missing x-organization-id header',
            });
        }
        const body = QueueNotificationSchema.parse(req.body);
        const notificationId = await (0, notification_service_1.queueNotification)({
            organizationId,
            userId: body.userId,
            type: body.type,
            channels: body.channels,
            priority: body.priority,
            data: body.data,
            scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
        });
        res.json({
            success: true,
            notificationId,
            message: 'Notification queued successfully',
        });
    }
    catch (error) {
        logger.error('Queue notification error', { error });
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
        const organizationId = getOrganizationIdFromHeaders(req);
        const userId = req.query.userId;
        if (!organizationId || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Missing organizationId or userId',
            });
        }
        const preferences = await (0, notification_service_1.getUserNotificationPreferences)(organizationId, userId);
        res.json({
            success: true,
            preferences,
        });
    }
    catch (error) {
        logger.error('Get preferences error', { error });
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
        const organizationId = getOrganizationIdFromHeaders(req);
        const userId = req.body.userId;
        if (!organizationId || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Missing organizationId or userId',
            });
        }
        const { preferences } = UpdatePreferencesSchema.parse(req.body);
        await (0, notification_service_1.updateUserNotificationPreferences)(organizationId, userId, preferences);
        res.json({
            success: true,
            message: 'Preferences updated successfully',
        });
    }
    catch (error) {
        logger.error('Update preferences error', { error });
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
        const organizationId = getOrganizationIdFromHeaders(req);
        const userId = req.query.userId;
        const limit = parseInt(req.query.limit) || 50;
        if (!organizationId || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Missing organizationId or userId',
            });
        }
        const history = await (0, notification_service_1.getNotificationHistory)(organizationId, userId, limit);
        res.json({
            success: true,
            history,
            count: history.length,
        });
    }
    catch (error) {
        logger.error('Get history error', { error });
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
        logger.error('Process notifications error', { error });
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
        logger.error('Retry failed notifications error', { error });
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
        const organizationId = getOrganizationIdFromHeaders(req);
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                error: 'Missing x-organization-id header',
            });
        }
        const notificationId = await (0, notification_service_1.queueNotification)({
            organizationId,
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
        logger.error('Test notification error', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map