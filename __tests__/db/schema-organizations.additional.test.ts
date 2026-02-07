/**
 * Coverage hints (from coverage-final.json)
 * - Uncovered lines: 82, 184, 187, 336, 342, 347, 352, 357, 362, 382, 386, 390, 394
 * - Uncovered functions: (anonymous_0), (anonymous_2), (anonymous_3), (anonymous_9), (anonymous_10), (anonymous_11), (anonymous_12), (anonymous_13), (anonymous_14), isCLCRootOrg
 */

import { describe, it, expect } from 'vitest';
import { isCLCRootOrg, isNationalUnion, isLocalUnion, isFederation, organizationTypeEnum, caJurisdictionEnum, labourSectorEnum, organizationStatusEnum, organizations, organizationRelationshipTypeEnum, organizationRelationships, organizationsRelations, organizationRelationshipsRelations, organizationMembers, organizationMembersRelations, claimsOrganizationMigration, membersOrganizationMigration, strikeFundsOrganizationMigration, duesPaymentsOrganizationMigration, deadlinesOrganizationMigration, documentsOrganizationMigration } from '@/lib/../db/schema-organizations';

describe('schema-organizations', () => {
  describe('isCLCRootOrg', () => {
    it('is defined', () => {
      expect(isCLCRootOrg).toBeDefined();
    });
  });

  describe('isNationalUnion', () => {
    it('is defined', () => {
      expect(isNationalUnion).toBeDefined();
    });
  });

  describe('isLocalUnion', () => {
    it('is defined', () => {
      expect(isLocalUnion).toBeDefined();
    });
  });

  describe('isFederation', () => {
    it('is defined', () => {
      expect(isFederation).toBeDefined();
    });
  });

  describe('organizationTypeEnum', () => {
    it('is defined', () => {
      expect(organizationTypeEnum).toBeDefined();
    });
  });

  describe('caJurisdictionEnum', () => {
    it('is defined', () => {
      expect(caJurisdictionEnum).toBeDefined();
    });
  });

  describe('labourSectorEnum', () => {
    it('is defined', () => {
      expect(labourSectorEnum).toBeDefined();
    });
  });

  describe('organizationStatusEnum', () => {
    it('is defined', () => {
      expect(organizationStatusEnum).toBeDefined();
    });
  });

  describe('organizations', () => {
    it('is defined', () => {
      expect(organizations).toBeDefined();
    });
  });

  describe('organizationRelationshipTypeEnum', () => {
    it('is defined', () => {
      expect(organizationRelationshipTypeEnum).toBeDefined();
    });
  });

  describe('organizationRelationships', () => {
    it('is defined', () => {
      expect(organizationRelationships).toBeDefined();
    });
  });

  describe('organizationsRelations', () => {
    it('is defined', () => {
      expect(organizationsRelations).toBeDefined();
    });
  });

  describe('organizationRelationshipsRelations', () => {
    it('is defined', () => {
      expect(organizationRelationshipsRelations).toBeDefined();
    });
  });

  describe('organizationMembers', () => {
    it('is defined', () => {
      expect(organizationMembers).toBeDefined();
    });
  });

  describe('organizationMembersRelations', () => {
    it('is defined', () => {
      expect(organizationMembersRelations).toBeDefined();
    });
  });

  describe('claimsOrganizationMigration', () => {
    it('is defined', () => {
      expect(claimsOrganizationMigration).toBeDefined();
    });
  });

  describe('membersOrganizationMigration', () => {
    it('is defined', () => {
      expect(membersOrganizationMigration).toBeDefined();
    });
  });

  describe('strikeFundsOrganizationMigration', () => {
    it('is defined', () => {
      expect(strikeFundsOrganizationMigration).toBeDefined();
    });
  });

  describe('duesPaymentsOrganizationMigration', () => {
    it('is defined', () => {
      expect(duesPaymentsOrganizationMigration).toBeDefined();
    });
  });

  describe('deadlinesOrganizationMigration', () => {
    it('is defined', () => {
      expect(deadlinesOrganizationMigration).toBeDefined();
    });
  });

  describe('documentsOrganizationMigration', () => {
    it('is defined', () => {
      expect(documentsOrganizationMigration).toBeDefined();
    });
  });
});
