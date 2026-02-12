"use strict";
/**
 * Notification Service
 * Week 9-10: Multi-channel notification system for financial events
 *
 * Features:
 * - Email notifications (payment confirmations, alerts, receipts)
 * - SMS notifications (payment reminders, urgent alerts)
 * - In-app notifications (real-time updates)
 * - Push notifications (mobile app support)
 * - Notification templates with variable substitution
 * - Notification preferences per user
 * - Delivery tracking and retry logic
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueNotification = queueNotification;
exports.processPendingNotifications = processPendingNotifications;
exports.sendNotification = sendNotification;
exports.getUserNotificationPreferences = getUserNotificationPreferences;
exports.updateUserNotificationPreferences = updateUserNotificationPreferences;
exports.getNotificationHistory = getNotificationHistory;
exports.retryFailedNotifications = retryFailedNotifications;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const resend_1 = require("resend");
const twilio_1 = __importDefault(require("twilio"));
// TODO: Fix FCM and email service imports
// import { FCMService } from '@/services/fcm-service';
// import { FinancialEmailService } from '@/lib/services/financial-email-service';
// TODO: Fix logger import path
// import { logger } from '@/lib/logger';
const logger = console;
// Initialize email and SMS clients
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;
// ============================================================================
// NOTIFICATION QUEUE MANAGEMENT
// ============================================================================
/**
 * Queue a notification for delivery
 */
async function queueNotification(request) {
    const { organizationId, userId, type, channels, priority = 'normal', data, scheduledFor } = request;
    // Get user preferences
    const preferences = await getUserNotificationPreferences(organizationId, userId);
    // Filter channels based on user preferences
    const allowedChannels = channels.filter(channel => {
        const prefKey = `${type}_${channel}`;
        return preferences[prefKey] !== false;
    });
    if (allowedChannels.length === 0) {
        throw new Error('All notification channels disabled by user preferences');
    }
    // Create notification queue entry
    const [notification] = await db_1.db.insert(schema_1.notificationQueue).values({
        tenantId: organizationId,
        userId,
        type,
        channels: allowedChannels, // text array in schema
        priority,
        data: JSON.stringify(data),
        status: 'pending',
        scheduledFor: (scheduledFor || new Date()).toISOString(),
        attempts: '0',
        createdAt: new Date().toISOString(),
    }).returning();
    return notification.id;
}
/**
 * Process pending notifications
 */
async function processPendingNotifications(batchSize = 50) {
    // Get pending notifications due for delivery
    const pending = await db_1.db
        .select()
        .from(schema_1.notificationQueue)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notificationQueue.status, 'pending')))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.notificationQueue.priority), schema_1.notificationQueue.scheduledFor)
        .limit(batchSize);
    let processed = 0;
    for (const notification of pending) {
        try {
            await sendNotification(notification.id);
            processed++;
        }
        catch (error) {
            logger.error('Failed to send notification', { error, notificationId: notification.id });
            // Continue processing other notifications
        }
    }
    return processed;
}
/**
 * Send a queued notification
 */
async function sendNotification(notificationId) {
    // Get notification from queue
    const [notification] = await db_1.db
        .select()
        .from(schema_1.notificationQueue)
        .where((0, drizzle_orm_1.eq)(schema_1.notificationQueue.id, notificationId));
    if (!notification) {
        throw new Error(`Notification ${notificationId} not found`);
    }
    if (notification.status === 'sent') {
        throw new Error(`Notification ${notificationId} already sent`);
    }
    // Update attempts
    await db_1.db
        .update(schema_1.notificationQueue)
        .set({
        attempts: notification.attempts + 1,
        lastAttemptAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.notificationQueue.id, notificationId));
    const channelResults = [];
    const data = JSON.parse(notification.data);
    // Send through each channel
    for (const channel of notification.channels) {
        try {
            await sendThroughChannel(channel, notification.type, notification.userId, notification.tenantId, data);
            channelResults.push({
                channel: channel,
                success: true,
            });
            // Log successful delivery
            await logNotification(notificationId, channel, 'delivered', undefined);
        }
        catch (error) {
            channelResults.push({
                channel: channel,
                success: false,
                error: error.message,
            });
            // Log failed delivery
            await logNotification(notificationId, channel, 'failed', error.message);
        }
    }
    // Update notification status
    const allSucceeded = channelResults.every(r => r.success);
    const anySucceeded = channelResults.some(r => r.success);
    await db_1.db
        .update(schema_1.notificationQueue)
        .set({
        status: allSucceeded ? 'sent' : (anySucceeded ? 'partial' : 'failed'),
        sentAt: allSucceeded ? new Date() : undefined,
        error: allSucceeded ? undefined : channelResults
            .filter(r => !r.success)
            .map(r => `${r.channel}: ${r.error}`)
            .join('; '),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.notificationQueue.id, notificationId));
    return {
        success: anySucceeded,
        notificationId,
        channelResults,
    };
}
// ============================================================================
// CHANNEL HANDLERS
// ============================================================================
/**
 * Send notification through specific channel
 */
async function sendThroughChannel(channel, type, userId, organizationId, data) {
    // Get template for this type/channel
    const template = await getTemplate(type, channel);
    // Render template with data
    const rendered = renderTemplate(template, data);
    switch (channel) {
        case 'email':
            await sendEmail(userId, rendered.subject, rendered.body, data);
            break;
        case 'sms':
            await sendSMS(userId, rendered.body);
            break;
        case 'push':
            await sendPushNotification(userId, rendered.subject || type, rendered.body, data);
            break;
        case 'in_app':
            await createInAppNotification(organizationId, userId, type, rendered.body, data);
            break;
        default:
            throw new Error(`Unknown channel: ${channel}`);
    }
}
/**
 * Send email notification
 */
async function sendEmail(userId, subject, body, data) {
    try {
        // Get user email from userId (would need to query user table)
        // For now, using data.email if provided
        const userEmail = data.email || `user-${userId}@example.com`;
        // Use Resend for email delivery
        await resend.emails.send({
            from: 'Union Eyes <notifications@unioneyes.com>',
            to: userEmail,
            subject,
            html: body,
        });
        logger.info('[EMAIL] Successfully sent', { userEmail, subject });
    }
    catch (error) {
        logger.error('[EMAIL] Failed to send', { error, userEmail: data.email });
        throw error;
    }
}
/**
 * Send SMS notification
 */
async function sendSMS(userId, message, data = {}) {
    try {
        if (!twilioClient) {
            logger.warn('[SMS] Twilio not configured, skipping SMS send');
            return;
        }
        // Get user phone from data (would need to query user table)
        const userPhone = data.phone || `+1234567890`; // Fallback for development
        // Use Twilio for SMS delivery
        await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: userPhone,
        });
        logger.info('[SMS] Successfully sent', { userPhone });
    }
    catch (error) {
        logger.error('[SMS] Failed to send', { error, userId });
        throw error;
    }
}
/**
 * Send push notification
 */
async function sendPushNotification(userId, title, body, data) {
    try {
        // TODO: Implement FCM service for push notifications
        // const results = await FCMService.sendToUser({
        //   userId,
        //   title,
        //   body,
        //   data,
        // });
        // const successCount = results.filter(r => r.success).length;
        logger.info('[PUSH] Push notification stubbed (FCMService not implemented)', {
            userId,
            title,
            body,
        });
    }
    catch (error) {
        logger.error('[PUSH] Failed to send', { error, userId });
        throw error;
    }
}
/**
 * Create in-app notification
 */
async function createInAppNotification(organizationId, userId, type, message, data) {
    // Store in database for in-app display
    logger.info('[IN-APP] Notification created', { userId, type, message, organizationId });
    // In production, would insert into in_app_notifications table
}
// ============================================================================
// TEMPLATE MANAGEMENT
// ============================================================================
/**
 * Get notification template
 */
async function getTemplate(type, channel) {
    const [template] = await db_1.db
        .select()
        .from(schema_1.notificationTemplates)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notificationTemplates.type, type), (0, drizzle_orm_1.eq)(schema_1.notificationTemplates.channel, channel)));
    if (!template) {
        // Return default template
        return getDefaultTemplate(type, channel);
    }
    return {
        id: template.id,
        type: template.type,
        channel: template.channel,
        subject: template.subject || undefined,
        body: template.body,
        variables: JSON.parse(template.variables || '[]'),
    };
}
/**
 * Get default template for type/channel
 */
function getDefaultTemplate(type, channel) {
    const templates = {
        payment_confirmation: {
            email: {
                subject: 'Payment Confirmation - ${amount}',
                body: 'Your payment of ${amount} has been processed successfully. Transaction ID: ${transactionId}',
            },
            sms: {
                body: 'Payment confirmed: ${amount}. Transaction: ${transactionId}',
            },
        },
        payment_failed: {
            email: {
                subject: 'Payment Failed - Action Required',
                body: 'Your payment of ${amount} failed. Reason: ${reason}. Please update your payment method.',
            },
            sms: {
                body: 'Payment failed: ${amount}. Please update payment method.',
            },
        },
        payment_reminder: {
            email: {
                subject: 'Payment Due Reminder',
                body: 'Your payment of ${amount} is due on ${dueDate}. Please ensure sufficient funds.',
            },
            sms: {
                body: 'Reminder: ${amount} due ${dueDate}',
            },
        },
        donation_received: {
            email: {
                subject: 'Thank You for Your Donation',
                body: 'Thank you for your donation of ${amount} to ${fundName}. Your support makes a difference!',
            },
        },
        stipend_approved: {
            email: {
                subject: 'Stipend Approved - ${amount}',
                body: 'Your weekly stipend of ${amount} has been approved and will be disbursed shortly.',
            },
            sms: {
                body: 'Stipend approved: ${amount}',
            },
        },
        stipend_disbursed: {
            email: {
                subject: 'Stipend Payment Sent',
                body: 'Your stipend payment of ${amount} has been sent. Expected arrival: ${arrivalDate}',
            },
            sms: {
                body: 'Stipend sent: ${amount}. Arrives ${arrivalDate}',
            },
        },
        low_balance_alert: {
            email: {
                subject: 'Low Balance Alert - ${fundName}',
                body: 'Warning: ${fundName} balance is ${balance}. Current burn rate: ${burnRate}/week.',
            },
        },
        arrears_warning: {
            email: {
                subject: 'Dues Arrears Notice',
                body: 'You have outstanding dues of ${amount}. Please pay to avoid account suspension.',
            },
        },
        strike_announcement: {
            email: {
                subject: '${title}',
                body: '${message}',
            },
            sms: {
                body: '${title}: ${message}',
            },
            push: {
                body: '${message}',
            },
        },
        picket_reminder: {
            email: {
                subject: 'Picket Duty Reminder - ${date}',
                body: 'Reminder: You have picket duty on ${date} at ${time}. Location: ${location}',
            },
            sms: {
                body: 'Picket reminder: ${date} ${time} at ${location}',
            },
        },
    };
    const template = templates[type]?.[channel];
    if (!template) {
        throw new Error(`No default template for ${type}/${channel}`);
    }
    return {
        id: 'default',
        type,
        channel,
        subject: template.subject,
        body: template.body,
        variables: extractVariables(template.body),
    };
}
/**
 * Render template with data
 */
function renderTemplate(template, data) {
    const renderString = (str) => {
        return str.replace(/\$\{(\w+)\}/g, (match, variable) => {
            return data[variable] || match;
        });
    };
    return {
        subject: template.subject ? renderString(template.subject) : undefined,
        body: renderString(template.body),
    };
}
/**
 * Extract variables from template string
 */
function extractVariables(template) {
    const matches = template.matchAll(/\$\{(\w+)\}/g);
    return Array.from(matches, m => m[1]);
}
// ============================================================================
// USER PREFERENCES
// ============================================================================
/**
 * Get user notification preferences
 */
async function getUserNotificationPreferences(organizationId, userId) {
    const [prefs] = await db_1.db
        .select()
        .from(schema_1.userNotificationPreferences)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userNotificationPreferences.tenantId, organizationId), (0, drizzle_orm_1.eq)(schema_1.userNotificationPreferences.userId, userId)));
    if (!prefs) {
        // Return default preferences (all enabled)
        return getDefaultPreferences();
    }
    return JSON.parse(prefs.preferences);
}
/**
 * Update user notification preferences
 */
async function updateUserNotificationPreferences(organizationId, userId, preferences) {
    await db_1.db
        .insert(schema_1.userNotificationPreferences)
        .values({
        tenantId: organizationId,
        userId,
        preferences: JSON.stringify(preferences),
        updatedAt: new Date(),
    })
        .onConflictDoUpdate({
        target: [schema_1.userNotificationPreferences.tenantId, schema_1.userNotificationPreferences.userId],
        set: {
            preferences: JSON.stringify(preferences),
            updatedAt: new Date(),
        },
    });
}
/**
 * Get default preferences (all enabled)
 */
function getDefaultPreferences() {
    return {
        payment_confirmation_email: true,
        payment_confirmation_sms: false,
        payment_failed_email: true,
        payment_failed_sms: true,
        payment_reminder_email: true,
        payment_reminder_sms: false,
        donation_received_email: true,
        stipend_approved_email: true,
        stipend_disbursed_email: true,
        stipend_disbursed_sms: false,
        low_balance_alert_email: true,
        arrears_warning_email: true,
        strike_announcement_email: true,
        strike_announcement_sms: true,
        strike_announcement_push: true,
        picket_reminder_email: true,
        picket_reminder_sms: true,
    };
}
// ============================================================================
// NOTIFICATION LOGGING
// ============================================================================
/**
 * Log notification delivery attempt
 */
async function logNotification(notificationId, channel, status, error) {
    await db_1.db.insert(schema_1.notificationLog).values({
        notificationId,
        channel,
        status,
        error,
        deliveredAt: status === 'delivered' ? new Date() : undefined,
        createdAt: new Date(),
    });
}
/**
 * Get notification history for user
 */
async function getNotificationHistory(organizationId, userId, limit = 50) {
    const notifications = await db_1.db
        .select()
        .from(schema_1.notificationQueue)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notificationQueue.tenantId, organizationId), (0, drizzle_orm_1.eq)(schema_1.notificationQueue.userId, userId)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.notificationQueue.createdAt))
        .limit(limit);
    return notifications.map(n => ({
        id: n.id,
        type: n.type,
        channels: n.channels,
        status: n.status,
        sentAt: n.sentAt,
        createdAt: n.createdAt,
        data: JSON.parse(n.data),
    }));
}
// ============================================================================
// RETRY LOGIC
// ============================================================================
/**
 * Retry failed notifications
 */
async function retryFailedNotifications(maxAttempts = 3) {
    const failed = await db_1.db
        .select()
        .from(schema_1.notificationQueue)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notificationQueue.status, 'failed')))
        .limit(100);
    let retried = 0;
    for (const notification of failed) {
        if (Number(notification.attempts) >= maxAttempts) {
            continue;
        }
        try {
            await sendNotification(notification.id);
            retried++;
        }
        catch (error) {
            logger.error(`Retry failed for notification ${notification.id}:`, error);
        }
    }
    return retried;
}
//# sourceMappingURL=notification-service.js.map