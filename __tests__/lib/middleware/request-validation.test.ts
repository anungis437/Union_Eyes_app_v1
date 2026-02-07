import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  RequestValidator,
  createValidator,
  validateRequest
} from '@/lib/middleware/request-validation';

describe('RequestValidator', () => {
  it('validates request body and returns parsed data', async () => {
    const schema = z.object({ email: z.string().email() });
    const request = new Request('http://example.test', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' })
    });

    const result = await RequestValidator.validateBody(request, schema);

    expect(result.isValid).toBe(true);
    if (result.isValid) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('returns errors for invalid JSON', async () => {
    const schema = z.object({ name: z.string() });
    const request = new Request('http://example.test', {
      method: 'POST',
      body: '{invalidJson}'
    });

    const result = await RequestValidator.validateBody(request, schema);

    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.errors._body).toContain('Invalid JSON in request body');
    }
  });

  it('validates query parameters with schema', () => {
    const schema = z.object({ page: z.coerce.number().int() });
    const result = RequestValidator.validateQuery(
      new URLSearchParams({ page: '2' }),
      schema
    );

    expect(result.isValid).toBe(true);
    if (result.isValid) {
      expect(result.data.page).toBe(2);
    }
  });

  it('formats Zod errors by field path', () => {
    const schema = z.object({ name: z.string().min(2) });
    const result = RequestValidator.validateQuery({ name: '' }, schema);

    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.errors.name[0]).toContain('at least 2');
    }
  });

  it('sanitizes values using provided rules', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const sanitized = RequestValidator.sanitize(
      { name: '  Test  ', bad: 'data' },
      {
        name: (val) => String(val).trim(),
        bad: () => {
          throw new Error('Nope');
        }
      }
    );

    expect(sanitized.name).toBe('Test');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('createValidator', () => {
  it('validates password requirements', () => {
    const schema = createValidator.password({ requireSpecialChars: true });
    const result = schema.safeParse('Password1!');

    expect(result.success).toBe(true);
  });

  it('rejects javascript URLs', () => {
    const schema = createValidator.url();
    const result = schema.safeParse('javascript:alert(1)');

    expect(result.success).toBe(false);
  });

  it('validates date ranges', () => {
    const schema = createValidator.dateRange();

    expect(schema.safeParse({ from: '2026-02-01', to: '2026-02-10' }).success).toBe(true);
    expect(schema.safeParse({ from: '2026-02-10', to: '2026-02-01' }).success).toBe(false);
  });
});

describe('validateRequest', () => {
  it('delegates to validateBody', async () => {
    const schema = z.object({ id: z.string() });
    const request = new Request('http://example.test', {
      method: 'POST',
      body: JSON.stringify({ id: 'abc' })
    }) as any;

    const result = await validateRequest(request, schema);

    expect(result.isValid).toBe(true);
  });
});
