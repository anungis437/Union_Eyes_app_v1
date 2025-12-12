import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

// Newsletter templates
export const newsletterTemplates = pgTable('newsletter_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  htmlContent: text('html_content').notNull(),
  jsonContent: jsonb('json_content'),
  isDefault: boolean('is_default').default(false),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Newsletters
export const newsletters = pgTable('newsletters', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').references(() => newsletterTemplates.id, { onDelete: 'set null' }),
  subject: varchar('subject', { length: 500 }).notNull(),
  previewText: varchar('preview_text', { length: 255 }),
  fromName: varchar('from_name', { length: 255 }).notNull(),
  fromEmail: varchar('from_email', { length: 255 }).notNull(),
  replyTo: varchar('reply_to', { length: 255 }),
  htmlContent: text('html_content').notNull(),
  jsonContent: jsonb('json_content'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  recipientCount: integer('recipient_count').default(0),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),
  openCount: integer('open_count').default(0),
  clickCount: integer('click_count').default(0),
  unsubscribeCount: integer('unsubscribe_count').default(0),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Newsletter recipients
export const newsletterRecipients = pgTable('newsletter_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  newsletterId: uuid('newsletter_id').notNull().references(() => newsletters.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  openedAt: timestamp('opened_at', { withTimezone: true }),
  clickedAt: timestamp('clicked_at', { withTimezone: true }),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  bounceReason: text('bounce_reason'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Newsletter links
export const newsletterLinks = pgTable('newsletter_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  newsletterId: uuid('newsletter_id').notNull().references(() => newsletters.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  displayText: varchar('display_text', { length: 500 }),
  clickCount: integer('click_count').default(0),
  uniqueClickCount: integer('unique_click_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Newsletter clicks
export const newsletterClicks = pgTable('newsletter_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  newsletterId: uuid('newsletter_id').notNull().references(() => newsletters.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').notNull().references(() => newsletterRecipients.id, { onDelete: 'cascade' }),
  linkId: uuid('link_id').notNull().references(() => newsletterLinks.id, { onDelete: 'cascade' }),
  clickedAt: timestamp('clicked_at', { withTimezone: true }).defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  referer: text('referer'),
});

// TypeScript types
export type NewsletterTemplate = typeof newsletterTemplates.$inferSelect;
export type NewNewsletterTemplate = typeof newsletterTemplates.$inferInsert;

export type Newsletter = typeof newsletters.$inferSelect;
export type NewNewsletter = typeof newsletters.$inferInsert;

export type NewsletterRecipient = typeof newsletterRecipients.$inferSelect;
export type NewNewsletterRecipient = typeof newsletterRecipients.$inferInsert;

export type NewsletterLink = typeof newsletterLinks.$inferSelect;
export type NewNewsletterLink = typeof newsletterLinks.$inferInsert;

export type NewsletterClick = typeof newsletterClicks.$inferSelect;
export type NewNewsletterClick = typeof newsletterClicks.$inferInsert;
