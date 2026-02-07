import { describe, expect, it } from 'vitest';
import { cn, formatCurrency } from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names and resolves conflicts', () => {
      const result = cn('px-2', 'text-sm', 'px-3');

      expect(result).toContain('px-3');
      expect(result).toContain('text-sm');
      expect(result).not.toContain('px-2');
    });
  });

  describe('formatCurrency', () => {
    it('formats with default locale and currency', () => {
      expect(formatCurrency(1234.5)).toBe('$1,234.50');
    });

    it('formats with custom currency and locale', () => {
      expect(formatCurrency(12, 'USD', 'en-US')).toBe('$12.00');
    });
  });
});
