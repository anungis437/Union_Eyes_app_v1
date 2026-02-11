/**
 * Coverage hints (from coverage-final.json)
 * - Uncovered lines: 47
 * - Uncovered functions: (anonymous_0)
 */

import { describe, it, expect } from 'vitest';
import { memberCategoryEnum, organizationMembers } from '@/lib/../db/schema/organization-members-schema';

describe('organization-members-schema', () => {
  describe('memberCategoryEnum', () => {
    it('is defined', () => {
      expect(memberCategoryEnum).toBeDefined();
    });
  });

  describe('organizationMembers', () => {
    it('is defined', () => {
      expect(organizationMembers).toBeDefined();
    });

    it('has expected fields', () => {
      const columns = Object.keys(organizationMembers);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('organizationId');
      expect(columns).toContain('role');
      expect(columns).toContain('status');
      expect(columns).toContain('memberCategory');
    });
  });
});
