import { describe, expect, it } from 'vitest';
import {
  mapJurisdictionValue,
  getJurisdictionName,
  requiresBilingualSupport,
  getDeadlineUrgency,
  type CAJurisdiction,
} from '@/lib/jurisdiction-helpers-client';

describe('jurisdiction-helpers', () => {
  describe('mapJurisdictionValue', () => {
    it('should map federal jurisdiction correctly', () => {
      expect(mapJurisdictionValue('federal')).toBe('CA-FED');
      expect(mapJurisdictionValue('FEDERAL')).toBe('CA-FED');
      expect(mapJurisdictionValue('Federal')).toBe('CA-FED');
    });

    it('should map all provincial abbreviations correctly', () => {
      const provincialMappings: [string, CAJurisdiction][] = [
        ['AB', 'CA-AB'],
        ['BC', 'CA-BC'],
        ['MB', 'CA-MB'],
        ['NB', 'CA-NB'],
        ['NL', 'CA-NL'],
        ['NS', 'CA-NS'],
        ['ON', 'CA-ON'],
        ['PE', 'CA-PE'],
        ['QC', 'CA-QC'],
        ['SK', 'CA-SK'],
      ];

      provincialMappings.forEach(([input, expected]) => {
        expect(mapJurisdictionValue(input)).toBe(expected);
        expect(mapJurisdictionValue(input.toLowerCase())).toBe(expected);
      });
    });

    it('should map territorial abbreviations correctly', () => {
      const territorialMappings: [string, CAJurisdiction][] = [
        ['NT', 'CA-NT'],
        ['NU', 'CA-NU'],
        ['YT', 'CA-YT'],
      ];

      territorialMappings.forEach(([input, expected]) => {
        expect(mapJurisdictionValue(input)).toBe(expected);
      });
    });

    it('should pass through already formatted jurisdictions', () => {
      expect(mapJurisdictionValue('CA-FED')).toBe('CA-FED');
      expect(mapJurisdictionValue('CA-ON')).toBe('CA-ON');
      expect(mapJurisdictionValue('CA-QC')).toBe('CA-QC');
    });

    it('should return CA-FED as fallback for unknown values', () => {
      expect(mapJurisdictionValue('UNKNOWN')).toBe('CA-FED');
      expect(mapJurisdictionValue('')).toBe('CA-FED');
      expect(mapJurisdictionValue('XYZ')).toBe('CA-FED');
    });
  });

  describe('getJurisdictionName', () => {
    it('should return correct names for all jurisdictions', () => {
      const jurisdictionNames: [CAJurisdiction, string][] = [
        ['CA-FED', 'Federal'],
        ['CA-AB', 'Alberta'],
        ['CA-BC', 'British Columbia'],
        ['CA-MB', 'Manitoba'],
        ['CA-NB', 'New Brunswick'],
        ['CA-NL', 'Newfoundland and Labrador'],
        ['CA-NS', 'Nova Scotia'],
        ['CA-NT', 'Northwest Territories'],
        ['CA-NU', 'Nunavut'],
        ['CA-ON', 'Ontario'],
        ['CA-PE', 'Prince Edward Island'],
        ['CA-QC', 'Quebec'],
        ['CA-SK', 'Saskatchewan'],
        ['CA-YT', 'Yukon'],
      ];

      jurisdictionNames.forEach(([jurisdiction, expectedName]) => {
        expect(getJurisdictionName(jurisdiction)).toBe(expectedName);
      });
    });

    it('should return "Unknown" for invalid jurisdiction', () => {
      expect(getJurisdictionName('INVALID' as CAJurisdiction)).toBe('Unknown');
    });
  });

  describe('requiresBilingualSupport', () => {
    it('should return true for Federal jurisdiction', () => {
      expect(requiresBilingualSupport('CA-FED')).toBe(true);
    });

    it('should return true for Quebec', () => {
      expect(requiresBilingualSupport('CA-QC')).toBe(true);
    });

    it('should return true for New Brunswick', () => {
      expect(requiresBilingualSupport('CA-NB')).toBe(true);
    });

    it('should return false for all other provinces', () => {
      const unilingualJurisdictions: CAJurisdiction[] = [
        'CA-AB',
        'CA-BC',
        'CA-MB',
        'CA-NL',
        'CA-NS',
        'CA-ON',
        'CA-PE',
        'CA-SK',
      ];

      unilingualJurisdictions.forEach((jurisdiction) => {
        expect(requiresBilingualSupport(jurisdiction)).toBe(false);
      });
    });

    it('should return false for territories', () => {
      expect(requiresBilingualSupport('CA-NT')).toBe(false);
      expect(requiresBilingualSupport('CA-NU')).toBe(false);
      expect(requiresBilingualSupport('CA-YT')).toBe(false);
    });
  });

  describe('getDeadlineUrgency', () => {
    it('should return critical urgency for negative days (overdue)', () => {
      const urgency = getDeadlineUrgency(-5);
      expect(urgency.level).toBe('critical');
      expect(urgency.color).toBe('red');
      expect(urgency.label).toBe('Overdue');
    });

    it('should return critical urgency for 0 days (due today)', () => {
      const urgency = getDeadlineUrgency(0);
      expect(urgency.level).toBe('critical');
      expect(urgency.color).toBe('red');
      expect(urgency.label).toBe('Due Today');
    });

    it('should return high urgency for 1-3 days', () => {
      [1, 2, 3].forEach((days) => {
        const urgency = getDeadlineUrgency(days);
        expect(urgency.level).toBe('high');
        expect(urgency.color).toBe('orange');
        expect(urgency.label).toBe('Urgent');
      });
    });

    it('should return medium urgency for 4-7 days', () => {
      [4, 5, 6, 7].forEach((days) => {
        const urgency = getDeadlineUrgency(days);
        expect(urgency.level).toBe('medium');
        expect(urgency.color).toBe('yellow');
        expect(urgency.label).toBe('Upcoming');
      });
    });

    it('should return low urgency for more than 7 days', () => {
      [8, 10, 20, 100].forEach((days) => {
        const urgency = getDeadlineUrgency(days);
        expect(urgency.level).toBe('low');
        expect(urgency.color).toBe('green');
        expect(urgency.label).toBe('On Track');
      });
    });

    it('should handle edge case of exactly 7 days', () => {
      const urgency = getDeadlineUrgency(7);
      expect(urgency.level).toBe('medium');
      expect(urgency.color).toBe('yellow');
    });

    it('should handle edge case of exactly 3 days', () => {
      const urgency = getDeadlineUrgency(3);
      expect(urgency.level).toBe('high');
      expect(urgency.color).toBe('orange');
    });

    it('should handle very large values', () => {
      const urgency = getDeadlineUrgency(365);
      expect(urgency.level).toBe('low');
      expect(urgency.color).toBe('green');
      expect(urgency.label).toBe('On Track');
    });

    it('should handle very negative values (long overdue)', () => {
      const urgency = getDeadlineUrgency(-100);
      expect(urgency.level).toBe('critical');
      expect(urgency.color).toBe('red');
      expect(urgency.label).toBe('Overdue');
    });
  });

  describe('jurisdiction mapping completeness', () => {
    it('should have mappings for all 14 Canadian jurisdictions', () => {
      const allJurisdictions: CAJurisdiction[] = [
        'CA-FED',
        'CA-AB',
        'CA-BC',
        'CA-MB',
        'CA-NB',
        'CA-NL',
        'CA-NS',
        'CA-NT',
        'CA-NU',
        'CA-ON',
        'CA-PE',
        'CA-QC',
        'CA-SK',
        'CA-YT',
      ];

      expect(allJurisdictions).toHaveLength(14);

      // Each jurisdiction should have a name
      allJurisdictions.forEach((jurisdiction) => {
        const name = getJurisdictionName(jurisdiction);
        expect(name).not.toBe('Unknown');
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it('should have bilingual support for exactly 3 jurisdictions', () => {
      const allJurisdictions: CAJurisdiction[] = [
        'CA-FED',
        'CA-AB',
        'CA-BC',
        'CA-MB',
        'CA-NB',
        'CA-NL',
        'CA-NS',
        'CA-NT',
        'CA-NU',
        'CA-ON',
        'CA-PE',
        'CA-QC',
        'CA-SK',
        'CA-YT',
      ];

      const bilingualCount = allJurisdictions.filter((j) =>
        requiresBilingualSupport(j)
      ).length;

      expect(bilingualCount).toBe(3); // Federal, Quebec, New Brunswick
    });

    it('should have type-safe jurisdiction codes', () => {
      // Type test - this should compile
      const validJurisdiction: CAJurisdiction = 'CA-ON';
      expect(getJurisdictionName(validJurisdiction)).toBe('Ontario');
    });
  });

  describe('Async Functions (Mocked)', () => {
    // Note: These tests require database mocking
    // In a real test environment, you would use vi.mock() to mock the database calls

    describe('getOrganizationJurisdiction', () => {
      it('should be tested with database mocking', () => {
        // Placeholder for async function tests
        // Implementation requires:
        // 1. Mock database connection
        // 2. Mock organizations table query
        // 3. Test valid organization ID returns jurisdiction
        // 4. Test invalid organization ID returns null
        // 5. Test database error handling
        expect(true).toBe(true); // Placeholder
      });
    });

    describe('getOrganizationJurisdiction (legacy alias)', () => {
      it('should be tested with database mocking', () => {
        // Placeholder for async function tests
        // Implementation requires:
        // 1. Mock database connection
        // 2. Mock organizations join query
        // 3. Test valid organization ID returns jurisdiction
        // 4. Test invalid organization ID returns null
        // 5. Test database error handling
        expect(true).toBe(true); // Placeholder
      });
    });

    describe('getJurisdictionDeadline', () => {
      it('should be tested with database mocking', () => {
        // Placeholder for async function tests
        // Implementation requires:
        // 1. Mock jurisdiction_rules table query
        // 2. Test Federal grievance filing returns 25 days
        // 3. Test Ontario grievance filing returns 30 days
        // 4. Test invalid category returns null
        // 5. Test database error handling
        expect(true).toBe(true); // Placeholder
      });
    });

    describe('calculateBusinessDaysDeadline', () => {
      it('should be tested with database mocking', () => {
        // Placeholder for async function tests
        // Implementation requires:
        // 1. Mock PostgreSQL add_business_days() function call
        // 2. Test 25 business days from Jan 1 (skips holidays)
        // 3. Test year boundary (Dec 15 + 25 days crosses New Year's)
        // 4. Test holiday edge cases (Christmas/Boxing Day)
        // 5. Test database error handling
        expect(true).toBe(true); // Placeholder
      });
    });
  });
});
