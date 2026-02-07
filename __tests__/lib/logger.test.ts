import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import { logger, setRequestCorrelationId, withLogging } from '@/lib/logger';

const originalEnv = { ...process.env };

describe('logger', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    logger.setCorrelationId('test-corr-id');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('redacts sensitive fields in context', () => {
    process.env.NODE_ENV = 'development';

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logger.info('User login', {
      email: 'user@example.com',
      token: 'secret-token',
      other: 'ok'
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const output = infoSpy.mock.calls[0][0] as string;

    expect(output).toContain('User login');
    expect(output).toContain('test-corr-id');
    expect(output).toContain('u***@example.com');
    expect(output).toContain('[REDACTED]');
    expect(output).toContain('"other": "ok"');
    expect(output).not.toContain('user@example.com');
    expect(output).not.toContain('secret-token');
  });

  it('skips debug output in production', () => {
    process.env.NODE_ENV = 'production';

    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    logger.debug('Debug message');

    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('warns when timed operation is slow', () => {
    process.env.NODE_ENV = 'development';

    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const timeSpy = vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2605);

    const stop = logger.time('slow-task');
    stop();

    expect(timeSpy).toHaveBeenCalledTimes(2);
    expect(infoSpy).toHaveBeenCalledWith('Performance: slow-task', { durationMs: 1605 });
    expect(warnSpy).toHaveBeenCalledWith('Slow operation detected: slow-task', { durationMs: 1605 });
  });

  it('sets correlation id from request headers', () => {
    const request = new Request('http://example.test', {
      headers: {
        'x-request-id': 'request-123'
      }
    });

    const correlationId = setRequestCorrelationId(request);

    expect(correlationId).toBe('request-123');
    expect(logger.getCorrelationId()).toBe('request-123');
  });

  it('wraps handler and logs response metadata', async () => {
    const nowSpy = vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1100);
    const httpSpy = vi.spyOn(logger, 'httpRequest').mockImplementation(() => {});

    const handler = vi.fn(async () => new Response('ok', { status: 200 }));
    const wrapped = withLogging(handler, '/api/test');

    const response = await wrapped(
      new Request('http://example.test', {
        method: 'POST',
        headers: {
          'x-correlation-id': 'corr-123'
        }
      })
    );

    expect(nowSpy).toHaveBeenCalledTimes(2);
    expect(response.headers.get('x-correlation-id')).toBe('corr-123');
    expect(httpSpy).toHaveBeenCalledWith(
      'POST',
      '/api/test',
      200,
      100,
      expect.objectContaining({ correlationId: 'corr-123' })
    );
  });

  it('logs error context when handler throws', async () => {
    const nowSpy = vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1300);
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    const handler = vi.fn(async () => {
      throw new Error('Boom');
    });
    const wrapped = withLogging(handler, '/api/fail');

    await expect(
      wrapped(new Request('http://example.test', { method: 'GET' }))
    ).rejects.toThrow('Boom');

    expect(nowSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled error in /api/fail',
      expect.any(Error),
      expect.objectContaining({ method: 'GET' })
    );
  });
});
