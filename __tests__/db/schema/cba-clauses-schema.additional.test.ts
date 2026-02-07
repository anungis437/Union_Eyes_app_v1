/**
 * Coverage hints (from coverage-final.json)
 * - Uncovered lines: 48, 132, 133, 170, 171
 * - Uncovered functions: (anonymous_0), (anonymous_3), (anonymous_4), (anonymous_6), (anonymous_7)
 */

import { describe, it, expect } from 'vitest';
import { clauseTypeEnum, entityTypeEnum, cbaClause, clauseComparisons, wageProgressions, benefitComparisons } from '@/lib/../db/schema/cba-clauses-schema';

describe('cba-clauses-schema', () => {
  describe('clauseTypeEnum', () => {
    it('is defined', () => {
      expect(clauseTypeEnum).toBeDefined();
    });
  });

  describe('entityTypeEnum', () => {
    it('is defined', () => {
      expect(entityTypeEnum).toBeDefined();
    });
  });

  describe('cbaClause', () => {
    it('is defined', () => {
      expect(cbaClause).toBeDefined();
    });
  });

  describe('clauseComparisons', () => {
    it('is defined', () => {
      expect(clauseComparisons).toBeDefined();
    });
  });

  describe('wageProgressions', () => {
    it('is defined', () => {
      expect(wageProgressions).toBeDefined();
    });
  });

  describe('benefitComparisons', () => {
    it('is defined', () => {
      expect(benefitComparisons).toBeDefined();
    });
  });
});
