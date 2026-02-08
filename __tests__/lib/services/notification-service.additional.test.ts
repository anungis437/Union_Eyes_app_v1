/**
 * Coverage hints (from coverage-final.json)
 * - Uncovered lines: 368, 369, 496, 501, 512, 560, 567, 568, 569, 570, 574, 575, 577, 579, 580, 591, 595, 601, 610, 611, 646, 661, 743, 774, 775
 * - Uncovered functions: (anonymous_11), (anonymous_14), (anonymous_15), (anonymous_16), (anonymous_19)
 */

import { describe, it, expect } from 'vitest';
import { getNotificationService, processPendingNotifications, retryFailedNotificationsJob, SendGridEmailProvider, TwilioSMSProvider, FirebasePushProvider, NotificationService, NotificationTemplates } from '@/lib/services/notification-service';

describe('notification-service', () => {
  describe('getNotificationService', () => {
    it('is defined', () => {
      expect(getNotificationService).toBeDefined();
    });
  });

  describe('processPendingNotifications', () => {
    it('is defined', () => {
      expect(processPendingNotifications).toBeDefined();
    });
  });

  describe('retryFailedNotificationsJob', () => {
    it('is defined', () => {
      expect(retryFailedNotificationsJob).toBeDefined();
    });
  });

  describe('SendGridEmailProvider', () => {
    it('is defined', () => {
      expect(SendGridEmailProvider).toBeDefined();
    });
  });

  describe('TwilioSMSProvider', () => {
    it('is defined', () => {
      expect(TwilioSMSProvider).toBeDefined();
    });
  });

  describe('FirebasePushProvider', () => {
    it('is defined', () => {
      expect(FirebasePushProvider).toBeDefined();
    });
  });

  describe('NotificationService', () => {
    it('is defined', () => {
      expect(NotificationService).toBeDefined();
    });
  });

  describe('NotificationTemplates', () => {
    it('is defined', () => {
      expect(NotificationTemplates).toBeDefined();
    });
  });
});
