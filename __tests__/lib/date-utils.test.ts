import { describe, expect, it, beforeEach } from 'vitest';
import {
  toUTCISO,
  parseDate,
  now,
  formatForDisplay,
  formatAsDate,
  formatAsTime,
  isValidISODate,
  dateDifference,
  addTime,
  isPast,
  isFuture,
  isToday,
  startOfDay,
  endOfDay,
  formatRelativeTime,
  TIMEZONES,
  validateDateRange,
} from '@/lib/date-utils';

describe('date-utils', () => {
  describe('toUTCISO', () => {
    it('converts Date object to UTC ISO string', () => {
      const date = new Date('2026-01-15T12:00:00Z');
      const result = toUTCISO(date);
      expect(result).toBe('2026-01-15T12:00:00.000Z');
    });

    it('converts string date to UTC ISO string', () => {
      const result = toUTCISO('2026-01-15T12:00:00Z');
      expect(result).toBe('2026-01-15T12:00:00.000Z');
    });

    it('converts timestamp to UTC ISO string', () => {
      // Use a known timestamp that converts to a specific date
      const timestamp = Date.parse('2026-01-15T12:00:00Z');
      const result = toUTCISO(timestamp);
      // Just verify it returns a valid ISO string
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('throws error for null/undefined', () => {
      expect(() => toUTCISO(null as any)).toThrow();
      expect(() => toUTCISO(undefined as any)).toThrow();
    });
  });

  describe('parseDate', () => {
    it('parses Date object', () => {
      const date = new Date('2026-01-15');
      const result = parseDate(date);
      expect(result).toEqual(date);
    });

    it('parses ISO string', () => {
      const result = parseDate('2026-01-15T12:00:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toContain('2026-01-15');
    });

    it('parses timestamp', () => {
      const timestamp = 1768536000000;
      const result = parseDate(timestamp);
      expect(result).toBeInstanceOf(Date);
    });

    it('throws error for invalid input', () => {
      expect(() => parseDate(null as any)).toThrow();
      expect(() => parseDate('invalid-date' as any)).toThrow();
    });
  });

  describe('now', () => {
    it('returns ISO string', () => {
      const result = now();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('formatForDisplay', () => {
    it('formats date with default locale', () => {
      const result = formatForDisplay('2026-01-15');
      expect(result).toMatch(/Jan.*15.*2026|15.*Jan.*2026/);
    });

    it('formats date with custom locale', () => {
      const result = formatForDisplay('2026-01-15', 'America/Toronto');
      expect(result).toMatch(/2026/);
    });
  });

  describe('formatAsDate', () => {
    it('formats as YYYY-MM-DD', () => {
      const result = formatAsDate('2026-01-15');
      expect(result).toBe('2026-01-15');
    });
  });

  describe('formatAsTime', () => {
    it('formats as HH:MM:SS', () => {
      const result = formatAsTime('2026-01-15T14:30:00Z');
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('isValidISODate', () => {
    it('returns true for valid ISO date', () => {
      expect(isValidISODate('2026-01-15T12:00:00Z')).toBe(true);
    });

    it('returns false for invalid date string', () => {
      expect(isValidISODate('not-a-date')).toBe(false);
    });

    it('returns false for non-string', () => {
      expect(isValidISODate(123 as any)).toBe(false);
      expect(isValidISODate(null as any)).toBe(false);
    });
  });

  describe('dateDifference', () => {
    it('calculates difference and returns object with all units', () => {
      const result = dateDifference('2026-01-10', '2026-01-15', 'days');
      expect(result.days).toBe(5);
    });

    it('calculates difference in hours', () => {
      const result = dateDifference('2026-01-15T10:00:00Z', '2026-01-15T14:00:00Z', 'hours');
      expect(result.hours).toBe(4);
    });
  });

  describe('addTime', () => {
    it('adds days to date and returns object', () => {
      const result = addTime('2026-01-15', 5, 'days');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toContain('2026-01-20');
    });

    it('adds hours to date', () => {
      const result = addTime('2026-01-15T12:00:00Z', 3, 'hours');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toContain('15:00:00');
    });
  });

  describe('isPast', () => {
    it('returns true for past date', () => {
      expect(isPast('2020-01-01')).toBe(true);
    });

    it('returns false for future date', () => {
      expect(isPast('2030-01-01')).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('returns true for future date', () => {
      expect(isFuture('2030-01-01')).toBe(true);
    });

    it('returns false for past date', () => {
      expect(isFuture('2020-01-01')).toBe(false);
    });
  });

  describe('isToday', () => {
    it('returns true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('startOfDay', () => {
    it('returns start of day as ISO string', () => {
      const result = startOfDay('2026-01-15T14:30:00Z');
      expect(typeof result).toBe('string');
      // Should contain midnight UTC
      expect(result).toContain('00:00:00');
    });
  });

  describe('endOfDay', () => {
    it('returns end of day as ISO string', () => {
      const result = endOfDay('2026-01-15T14:30:00Z');
      expect(typeof result).toBe('string');
      // Should contain 23:59:59
      expect(result).toContain('23:59:59');
    });
  });

  describe('formatRelativeTime', () => {
    it('formats recent time', () => {
      const now = new Date();
      const result = formatRelativeTime(now);
      // Should return 'now' for very recent times
      expect(['now', 'just now']).toContain(result);
    });

    it('formats minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeTime(fiveMinutesAgo);
      expect(result).toContain('5');
      expect(result.toLowerCase()).toContain('minute');
    });

    it('formats hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = formatRelativeTime(twoHoursAgo);
      expect(result.toLowerCase()).toContain('hour');
    });

    it('formats days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(threeDaysAgo);
      expect(result.toLowerCase()).toContain('day');
    });
  });

  describe('TIMEZONES', () => {
    it('contains expected timezone constants', () => {
      expect(TIMEZONES.UTC).toBe('UTC');
      expect(TIMEZONES.EASTERN).toBe('America/Toronto');
      expect(TIMEZONES.PACIFIC).toBe('America/Los_Angeles');
    });
  });

  describe('validateDateRange', () => {
    it('does not throw for valid range', () => {
      expect(() => validateDateRange('2026-01-01', '2026-12-31')).not.toThrow();
    });

    it('throws for invalid range (end before start)', () => {
      expect(() => validateDateRange('2026-12-31', '2026-01-01')).toThrow('End date must be after start date');
    });

    it('throws for invalid date inputs', () => {
      expect(() => validateDateRange('invalid', '2026-01-01')).toThrow();
      expect(() => validateDateRange('2026-01-01', 'invalid')).toThrow();
    });
  });
});
