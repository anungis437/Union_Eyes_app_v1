/**
 * Notification Schema
 * 
 * Defines database tables for:
 * - User notification preferences
 * - In-app notifications
 * - Notification history/audit log
 */

import { pgTable, text, timestamp, boolean, jsonb, uuid, pgEnum } from 'drizzle-orm/pg-core';

// ============================================
// Enums
// ============================================

export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'sms',
  'push',
  'in-app',
  'multi',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'sent',
  'failed',
  'partial',
  'pending',
]);

export const digestFrequencyEnum = pgEnum('digest_frequency', [
  'immediate',
  'daily',
  'weekly',
  'never',
]);

// ============================================
// User Notification Preferences
// ============================================

export const userNotificationPreferences = pgTable('user_notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),
  tenantId: text('tenant_id').notNull(),
  
  // Contact info
  email: text('email').notNull(),
  phone: text('phone'),
  
  // Channel preferences
  emailEnabled: boolean('email_enabled').notNull().default(true),
  smsEnabled: boolean('sms_enabled').notNull().default(false),
  pushEnabled: boolean('push_enabled').notNull().default(true),
  inAppEnabled: boolean('in_app_enabled').notNull().default(true),
  
  // Frequency preferences
  digestFrequency: digestFrequencyEnum('digest_frequency').notNull().default('daily'),
  
  // Quiet hours (HH:MM format)
  quietHoursStart: text('quiet_hours_start'), // e.g., "22:00"
  quietHoursEnd: text('quiet_hours_end'), // e.g., "08:00"
  
  // Notification type preferences
  claimUpdates: boolean('claim_updates').notNull().default(true),
  documentUpdates: boolean('document_updates').notNull().default(true),
  deadlineAlerts: boolean('deadline_alerts').notNull().default(true),
  systemAnnouncements: boolean('system_announcements').notNull().default(true),
  securityAlerts: boolean('security_alerts').notNull().default(true),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// In-App Notifications
// ============================================

export const inAppNotifications = pgTable('in_app_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  
  // Notification content
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('info'), // info, success, warning, error
  
  // Optional action
  actionLabel: text('action_label'),
  actionUrl: text('action_url'),
  
  // Metadata
  data: jsonb('data'),
  
  // Status
  read: boolean('read').notNull().default(false),
  readAt: timestamp('read_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'), // Optional expiration
});

// ============================================
// Notification History (Audit Log)
// ============================================

export const notificationHistory = pgTable('notification_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Recipient info
  userId: text('user_id'), // Nullable for system-wide notifications
  tenantId: text('tenant_id'),
  recipient: text('recipient').notNull(), // Email, phone, or user ID
  
  // Notification details
  channel: notificationChannelEnum('channel').notNull(),
  subject: text('subject'),
  template: text('template'),
  
  // Status
  status: notificationStatusEnum('status').notNull(),
  error: text('error'), // Error message if failed
  
  // Delivery tracking
  sentAt: timestamp('sent_at').notNull(),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  
  // External IDs for tracking
  metadata: jsonb('metadata'), // e.g., { twilioSid, sendgridId, channels: [] }
});

// ============================================
// Scheduled Notifications (for deadlines, reminders, etc.)
// ============================================

export const notificationScheduleStatusEnum = pgEnum('notification_schedule_status', [
  'scheduled',
  'sent',
  'cancelled',
  'failed',
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  
  // Notification content
  type: text('type').notNull(), // deadline_reminder, deadline_missed, etc.
  title: text('title').notNull(),
  message: text('message').notNull(),
  priority: text('priority').default('medium'), // critical, high, medium, low
  
  // Related entity
  relatedEntityType: text('related_entity_type'), // grievance_deadline, claim, etc.
  relatedEntityId: text('related_entity_id'),
  
  // Scheduling
  scheduledFor: timestamp('scheduled_for'),
  status: notificationScheduleStatusEnum('status').notNull().default('scheduled'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  sentAt: timestamp('sent_at'),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// ============================================
// Types
// ============================================

export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type NewUserNotificationPreferences = typeof userNotificationPreferences.$inferInsert;

export type InAppNotification = typeof inAppNotifications.$inferSelect;
export type NewInAppNotification = typeof inAppNotifications.$inferInsert;

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type NewNotificationHistory = typeof notificationHistory.$inferInsert;

// ============================================
// Indexes
// ============================================

// Create indexes for common queries
// These would be created in a migration file:
//
// CREATE INDEX idx_user_notifications_user_id ON user_notification_preferences(user_id);
// CREATE INDEX idx_user_notifications_tenant_id ON user_notification_preferences(tenant_id);
// 
// CREATE INDEX idx_in_app_notifications_user_id ON in_app_notifications(user_id);
// CREATE INDEX idx_in_app_notifications_user_read ON in_app_notifications(user_id, read);
// CREATE INDEX idx_in_app_notifications_created_at ON in_app_notifications(created_at DESC);
// 
// CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
// CREATE INDEX idx_notification_history_tenant_id ON notification_history(tenant_id);
// CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at DESC);
// CREATE INDEX idx_notification_history_status ON notification_history(status);
