/**
 * Communications Domain
 * 
 * Member engagement and notification schemas.
 * 
 * This domain consolidates:
 * - messages-schema.ts
 * - notifications-schema.ts
 * - newsletter-schema.ts
 * - sms-communications-schema.ts
 * - survey-polling-schema.ts
 * - communication-analytics-schema.ts
 * - push-notifications.ts
 * 
 * Priority: 6
 * Lines: ~1,200 (largest domain)
 * 
 * Duplicates to resolve:
 * - campaignStatusEnum (2 locations)
 */

// Export all communication-related schemas from consolidated domain location
export * from './messages';
export * from './notifications';
export * from './newsletters';
export * from './sms';
export * from './surveys';
export * from './analytics';
export * from './push-notifications';
