/**
 * Coverage hints (from coverage-final.json)
 * - Uncovered lines: 63, 66, 108, 148, 170, 174, 225, 249, 252
 * - Uncovered functions: (anonymous_0), (anonymous_1), (anonymous_3), (anonymous_4), (anonymous_6), (anonymous_7), (anonymous_8), (anonymous_10), (anonymous_11)
 */

import { describe, it, expect } from 'vitest';
import { pushPlatformEnum, pushNotificationStatusEnum, pushDeliveryStatusEnum, pushPriorityEnum, pushDevices, pushNotificationTemplates, pushNotifications, pushDeliveries, pushDevicesRelations, pushNotificationTemplatesRelations, pushNotificationsRelations, pushDeliveriesRelations } from '@/lib/../db/schema/push-notifications';

describe('push-notifications', () => {
  describe('pushPlatformEnum', () => {
    it('is defined', () => {
      expect(pushPlatformEnum).toBeDefined();
    });
  });

  describe('pushNotificationStatusEnum', () => {
    it('is defined', () => {
      expect(pushNotificationStatusEnum).toBeDefined();
    });
  });

  describe('pushDeliveryStatusEnum', () => {
    it('is defined', () => {
      expect(pushDeliveryStatusEnum).toBeDefined();
    });
  });

  describe('pushPriorityEnum', () => {
    it('is defined', () => {
      expect(pushPriorityEnum).toBeDefined();
    });
  });

  describe('pushDevices', () => {
    it('is defined', () => {
      expect(pushDevices).toBeDefined();
    });
  });

  describe('pushNotificationTemplates', () => {
    it('is defined', () => {
      expect(pushNotificationTemplates).toBeDefined();
    });
  });

  describe('pushNotifications', () => {
    it('is defined', () => {
      expect(pushNotifications).toBeDefined();
    });
  });

  describe('pushDeliveries', () => {
    it('is defined', () => {
      expect(pushDeliveries).toBeDefined();
    });
  });

  describe('pushDevicesRelations', () => {
    it('is defined', () => {
      expect(pushDevicesRelations).toBeDefined();
    });
  });

  describe('pushNotificationTemplatesRelations', () => {
    it('is defined', () => {
      expect(pushNotificationTemplatesRelations).toBeDefined();
    });
  });

  describe('pushNotificationsRelations', () => {
    it('is defined', () => {
      expect(pushNotificationsRelations).toBeDefined();
    });
  });

  describe('pushDeliveriesRelations', () => {
    it('is defined', () => {
      expect(pushDeliveriesRelations).toBeDefined();
    });
  });
});
