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
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';
export type NotificationType = 'payment_confirmation' | 'payment_failed' | 'payment_reminder' | 'donation_received' | 'stipend_approved' | 'stipend_disbursed' | 'low_balance_alert' | 'arrears_warning' | 'strike_announcement' | 'picket_reminder';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export interface NotificationRequest {
    tenantId: string;
    userId: string;
    type: NotificationType;
    channels: NotificationChannel[];
    priority?: NotificationPriority;
    data: Record<string, any>;
    scheduledFor?: Date;
}
export interface NotificationTemplate {
    id: string;
    type: NotificationType;
    channel: NotificationChannel;
    subject?: string;
    body: string;
    variables: string[];
}
export interface SendNotificationResult {
    success: boolean;
    notificationId: string;
    channelResults: {
        channel: NotificationChannel;
        success: boolean;
        error?: string;
    }[];
}
/**
 * Queue a notification for delivery
 */
export declare function queueNotification(request: NotificationRequest): Promise<string>;
/**
 * Process pending notifications
 */
export declare function processPendingNotifications(batchSize?: number): Promise<number>;
/**
 * Send a queued notification
 */
export declare function sendNotification(notificationId: string): Promise<SendNotificationResult>;
/**
 * Get user notification preferences
 */
export declare function getUserNotificationPreferences(tenantId: string, userId: string): Promise<Record<string, boolean>>;
/**
 * Update user notification preferences
 */
export declare function updateUserNotificationPreferences(tenantId: string, userId: string, preferences: Record<string, boolean>): Promise<void>;
/**
 * Get notification history for user
 */
export declare function getNotificationHistory(tenantId: string, userId: string, limit?: number): Promise<any[]>;
/**
 * Retry failed notifications
 */
export declare function retryFailedNotifications(maxAttempts?: number): Promise<number>;
//# sourceMappingURL=notification-service.d.ts.map