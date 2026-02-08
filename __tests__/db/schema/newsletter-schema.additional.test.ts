/**
 * Coverage hints (from coverage-final.json)
 * - Uncovered lines: 98, 109, 126, 133, 151, 156, 173, 174, 206, 221, 222, 245, 248, 249
 * - Uncovered functions: (anonymous_0), (anonymous_1), (anonymous_2), (anonymous_3), (anonymous_4), (anonymous_5), (anonymous_6), (anonymous_7), (anonymous_8), (anonymous_9)
 */

import { describe, it, expect } from 'vitest';
import { templateCategoryEnum, listTypeEnum, subscriberStatusEnum, campaignStatusEnum, recipientStatusEnum, bounceTypeEnum, engagementEventEnum, newsletterTemplates, newsletterDistributionLists, newsletterListSubscribers, newsletterCampaigns, newsletterRecipients, newsletterEngagement, newsletterTemplatesRelations, newsletterDistributionListsRelations, newsletterListSubscribersRelations, newsletterCampaignsRelations, newsletterRecipientsRelations, newsletterEngagementRelations } from '@/lib/../db/schema/newsletter-schema';

describe('newsletter-schema', () => {
  describe('templateCategoryEnum', () => {
    it('is defined', () => {
      expect(templateCategoryEnum).toBeDefined();
    });
  });

  describe('listTypeEnum', () => {
    it('is defined', () => {
      expect(listTypeEnum).toBeDefined();
    });
  });

  describe('subscriberStatusEnum', () => {
    it('is defined', () => {
      expect(subscriberStatusEnum).toBeDefined();
    });
  });

  describe('campaignStatusEnum', () => {
    it('is defined', () => {
      expect(campaignStatusEnum).toBeDefined();
    });
  });

  describe('recipientStatusEnum', () => {
    it('is defined', () => {
      expect(recipientStatusEnum).toBeDefined();
    });
  });

  describe('bounceTypeEnum', () => {
    it('is defined', () => {
      expect(bounceTypeEnum).toBeDefined();
    });
  });

  describe('engagementEventEnum', () => {
    it('is defined', () => {
      expect(engagementEventEnum).toBeDefined();
    });
  });

  describe('newsletterTemplates', () => {
    it('is defined', () => {
      expect(newsletterTemplates).toBeDefined();
    });
  });

  describe('newsletterDistributionLists', () => {
    it('is defined', () => {
      expect(newsletterDistributionLists).toBeDefined();
    });
  });

  describe('newsletterListSubscribers', () => {
    it('is defined', () => {
      expect(newsletterListSubscribers).toBeDefined();
    });
  });

  describe('newsletterCampaigns', () => {
    it('is defined', () => {
      expect(newsletterCampaigns).toBeDefined();
    });
  });

  describe('newsletterRecipients', () => {
    it('is defined', () => {
      expect(newsletterRecipients).toBeDefined();
    });
  });

  describe('newsletterEngagement', () => {
    it('is defined', () => {
      expect(newsletterEngagement).toBeDefined();
    });
  });

  describe('newsletterTemplatesRelations', () => {
    it('is defined', () => {
      expect(newsletterTemplatesRelations).toBeDefined();
    });
  });

  describe('newsletterDistributionListsRelations', () => {
    it('is defined', () => {
      expect(newsletterDistributionListsRelations).toBeDefined();
    });
  });

  describe('newsletterListSubscribersRelations', () => {
    it('is defined', () => {
      expect(newsletterListSubscribersRelations).toBeDefined();
    });
  });

  describe('newsletterCampaignsRelations', () => {
    it('is defined', () => {
      expect(newsletterCampaignsRelations).toBeDefined();
    });
  });

  describe('newsletterRecipientsRelations', () => {
    it('is defined', () => {
      expect(newsletterRecipientsRelations).toBeDefined();
    });
  });

  describe('newsletterEngagementRelations', () => {
    it('is defined', () => {
      expect(newsletterEngagementRelations).toBeDefined();
    });
  });
});
