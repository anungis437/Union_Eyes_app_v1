/**
 * Coverage hints (from coverage-final.json)
 * - Uncovered lines: 32, 39, 60, 64, 76, 92, 93, 96, 97, 123, 124, 148, 149, 151, 176, 177, 202
 * - Uncovered functions: (anonymous_0), (anonymous_1), (anonymous_3), (anonymous_4), (anonymous_5), (anonymous_6), (anonymous_7), (anonymous_8), (anonymous_9), (anonymous_10)
 */

import { describe, it, expect } from 'vitest';
import { smsTemplates, smsCampaigns, smsMessages, smsConversations, smsCampaignRecipients, smsOptOuts, smsRateLimits, smsTemplatesRelations, smsCampaignsRelations, smsMessagesRelations, smsConversationsRelations, smsCampaignRecipientsRelations, smsOptOutsRelations, smsRateLimitsRelations } from '@/lib/../db/schema/sms-communications-schema';

describe('sms-communications-schema', () => {
  describe('smsTemplates', () => {
    it('is defined', () => {
      expect(smsTemplates).toBeDefined();
    });
  });

  describe('smsCampaigns', () => {
    it('is defined', () => {
      expect(smsCampaigns).toBeDefined();
    });
  });

  describe('smsMessages', () => {
    it('is defined', () => {
      expect(smsMessages).toBeDefined();
    });
  });

  describe('smsConversations', () => {
    it('is defined', () => {
      expect(smsConversations).toBeDefined();
    });
  });

  describe('smsCampaignRecipients', () => {
    it('is defined', () => {
      expect(smsCampaignRecipients).toBeDefined();
    });
  });

  describe('smsOptOuts', () => {
    it('is defined', () => {
      expect(smsOptOuts).toBeDefined();
    });
  });

  describe('smsRateLimits', () => {
    it('is defined', () => {
      expect(smsRateLimits).toBeDefined();
    });
  });

  describe('smsTemplatesRelations', () => {
    it('is defined', () => {
      expect(smsTemplatesRelations).toBeDefined();
    });
  });

  describe('smsCampaignsRelations', () => {
    it('is defined', () => {
      expect(smsCampaignsRelations).toBeDefined();
    });
  });

  describe('smsMessagesRelations', () => {
    it('is defined', () => {
      expect(smsMessagesRelations).toBeDefined();
    });
  });

  describe('smsConversationsRelations', () => {
    it('is defined', () => {
      expect(smsConversationsRelations).toBeDefined();
    });
  });

  describe('smsCampaignRecipientsRelations', () => {
    it('is defined', () => {
      expect(smsCampaignRecipientsRelations).toBeDefined();
    });
  });

  describe('smsOptOutsRelations', () => {
    it('is defined', () => {
      expect(smsOptOutsRelations).toBeDefined();
    });
  });

  describe('smsRateLimitsRelations', () => {
    it('is defined', () => {
      expect(smsRateLimitsRelations).toBeDefined();
    });
  });
});
