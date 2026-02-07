import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import {
  requireAuth,
  requireRole,
  requirePermission,
  requireOrganizationAccess,
  withAuth,
  withRole,
  withPermission,
  extractBearerToken,
  SUPPORTED_ROLES
} from '@/lib/middleware/auth-middleware';

type MockAuth = ReturnType<typeof vi.fn>;

const mockAuth = auth as unknown as MockAuth;

const createSession = (roles: string[], organizationId = 'org-1') => ({
  userId: 'user-1',
  publicMetadata: {
    roles,
    organizationId
  },
  emailAddresses: [{ emailAddress: 'user@example.com' }],
  firstName: 'Test',
  lastName: 'User'
});

describe('auth-middleware helpers', () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it('returns user for authenticated session', async () => {
    mockAuth.mockResolvedValue(createSession(['admin']));

    const result = await requireAuth();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('user-1');
      expect(result.data.roles).toContain('admin');
    }
  });

  it('returns 401 when no session is present', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await requireAuth();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.status).toBe(401);
    }
  });

  it('denies access when role is missing', async () => {
    mockAuth.mockResolvedValue(createSession(['member']));

    const result = await requireRole(SUPPORTED_ROLES.ADMIN);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.status).toBe(403);
    }
  });

  it('allows access when permission is present', async () => {
    mockAuth.mockResolvedValue(createSession(['admin']));

    const result = await requirePermission('manage:roles');

    expect(result.success).toBe(true);
  });

  it('checks organization access for members', async () => {
    mockAuth.mockResolvedValue(createSession(['member'], 'org-1'));

    const allowed = await requireOrganizationAccess('org-1');
    expect(allowed.success).toBe(true);

    const denied = await requireOrganizationAccess('org-2');
    expect(denied.success).toBe(false);
    if (!denied.success) {
      expect(denied.error.status).toBe(403);
    }
  });

  it('allows organization access for admins', async () => {
    mockAuth.mockResolvedValue(createSession(['admin'], 'org-1'));

    const result = await requireOrganizationAccess('org-2');
    expect(result.success).toBe(true);
  });

  it('wraps handler with auth requirement', async () => {
    mockAuth.mockResolvedValue(createSession(['admin']));

    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);

    const response = await wrapped(new Request('http://example.test'));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });

  it('wraps handler with role requirement', async () => {
    mockAuth.mockResolvedValue(createSession(['admin']));

    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withRole(SUPPORTED_ROLES.ADMIN, handler);

    const response = await wrapped(new Request('http://example.test'));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });

  it('wraps handler with permission requirement', async () => {
    mockAuth.mockResolvedValue(createSession(['admin']));

    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withPermission('manage:roles', handler);

    const response = await wrapped(new Request('http://example.test'));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });

  it('extracts bearer tokens from request headers', () => {
    const request = new Request('http://example.test', {
      headers: {
        authorization: 'Bearer token-value'
      }
    });

    expect(extractBearerToken(request)).toBe('token-value');

    const missing = new Request('http://example.test');
    expect(extractBearerToken(missing)).toBeNull();
  });
});
