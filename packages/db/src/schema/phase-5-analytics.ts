import { pgTable, uuid, varchar, text, boolean, timestamp, integer, decimal, date, time, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from '../../../../db/schema-organizations';
import { profiles } from '../../../../db/schema/profiles-schema';

// Communication analytics summary
export const communicationAnalytics = pgTable('communication_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  channel: varchar('channel', { length: 50 }).notNull(),
  messagesSent: integer('messages_sent').default(0),
  messagesDelivered: integer('messages_delivered').default(0),
  messagesFailed: integer('messages_failed').default(0),
  messagesOpened: integer('messages_opened').default(0),
  messagesClicked: integer('messages_clicked').default(0),
  uniqueRecipients: integer('unique_recipients').default(0),
  optOuts: integer('opt_outs').default(0),
  bounces: integer('bounces').default(0),
  complaints: integer('complaints').default(0),
  engagementRate: decimal('engagement_rate', { precision: 5, scale: 2 }),
  deliveryRate: decimal('delivery_rate', { precision: 5, scale: 2 }),
  openRate: decimal('open_rate', { precision: 5, scale: 2 }),
  clickRate: decimal('click_rate', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// User engagement scores
export const userEngagementScores = pgTable('user_engagement_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => profiles.userId, { onDelete: 'cascade' }),
  overallScore: integer('overall_score').default(0),
  emailScore: integer('email_score').default(0),
  smsScore: integer('sms_score').default(0),
  pushScore: integer('push_score').default(0),
  lastEmailOpen: timestamp('last_email_open', { withTimezone: true }),
  lastSmsReply: timestamp('last_sms_reply', { withTimezone: true }),
  lastPushOpen: timestamp('last_push_open', { withTimezone: true }),
  totalEmailsReceived: integer('total_emails_received').default(0),
  totalEmailsOpened: integer('total_emails_opened').default(0),
  totalSmsReceived: integer('total_sms_received').default(0),
  totalSmsReplied: integer('total_sms_replied').default(0),
  totalPushReceived: integer('total_push_received').default(0),
  totalPushOpened: integer('total_push_opened').default(0),
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Push notification devices
export const pushDevices = pgTable('push_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => profiles.userId, { onDelete: 'cascade' }),
  deviceToken: varchar('device_token', { length: 500 }).notNull().unique(),
  deviceType: varchar('device_type', { length: 50 }).notNull(),
  deviceName: varchar('device_name', { length: 255 }),
  platformVersion: varchar('platform_version', { length: 50 }),
  appVersion: varchar('app_version', { length: 50 }),
  isActive: boolean('is_active').default(true),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Push notification messages
export const pushNotifications = pgTable('push_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  imageUrl: text('image_url'),
  iconUrl: text('icon_url'),
  badgeCount: integer('badge_count'),
  sound: varchar('sound', { length: 100 }),
  clickAction: text('click_action'),
  priority: varchar('priority', { length: 20 }).default('normal'),
  ttl: integer('ttl').default(86400),
  data: jsonb('data'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  recipientCount: integer('recipient_count').default(0),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),
  openCount: integer('open_count').default(0),
  createdBy: uuid('created_by').notNull().references(() => profiles.userId),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Push notification recipients
export const pushNotificationRecipients = pgTable('push_notification_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  notificationId: uuid('notification_id').notNull().references(() => pushNotifications.id, { onDelete: 'cascade' }),
  deviceId: uuid('device_id').notNull().references(() => pushDevices.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => profiles.userId, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  openedAt: timestamp('opened_at', { withTimezone: true }),
  fcmMessageId: varchar('fcm_message_id', { length: 255 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Communication preferences
export const communicationPreferences = pgTable('communication_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => profiles.userId, { onDelete: 'cascade' }),
  emailEnabled: boolean('email_enabled').default(true),
  smsEnabled: boolean('sms_enabled').default(true),
  pushEnabled: boolean('push_enabled').default(true),
  newsletterEnabled: boolean('newsletter_enabled').default(true),
  marketingEnabled: boolean('marketing_enabled').default(false),
  grievanceUpdates: boolean('grievance_updates').default(true),
  trainingReminders: boolean('training_reminders').default(true),
  deadlineAlerts: boolean('deadline_alerts').default(true),
  strikeFundUpdates: boolean('strike_fund_updates').default(true),
  duesReminders: boolean('dues_reminders').default(true),
  quietHoursStart: time('quiet_hours_start'),
  quietHoursEnd: time('quiet_hours_end'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// TypeScript types
export type CommunicationAnalytics = typeof communicationAnalytics.$inferSelect;
export type NewCommunicationAnalytics = typeof communicationAnalytics.$inferInsert;

export type UserEngagementScore = typeof userEngagementScores.$inferSelect;
export type NewUserEngagementScore = typeof userEngagementScores.$inferInsert;

export type PushDevice = typeof pushDevices.$inferSelect;
export type NewPushDevice = typeof pushDevices.$inferInsert;

export type PushNotification = typeof pushNotifications.$inferSelect;
export type NewPushNotification = typeof pushNotifications.$inferInsert;

export type PushNotificationRecipient = typeof pushNotificationRecipients.$inferSelect;
export type NewPushNotificationRecipient = typeof pushNotificationRecipients.$inferInsert;

export type CommunicationPreference = typeof communicationPreferences.$inferSelect;
export type NewCommunicationPreference = typeof communicationPreferences.$inferInsert;
