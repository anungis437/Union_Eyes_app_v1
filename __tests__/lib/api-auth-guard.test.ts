/**
 * PR #3: Auth Guard Test Suite
 * Comprehensive tests for canonical authentication guards in lib/api-auth-guard.ts
 * 
 * Coverage Areas:
 * - withRoleAuth: Role enforcement and hierarchy
 * - withEnhancedRoleAuth: Enhanced role checks with multi-role support
 * - withApiAuth: Basic authentication
 * - Tenant mismatch scenarios
 * - Allowlist behavior for public/cron routes
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  withRoleAuth,
  withEnhancedRoleAuth,
  withApiAuth,
  requireUser,
  requireUserForOrganization,
  PUBLIC_API_ROUTES,
  ROLE_HIERARCHY,
  type UserRole,
  type EnhancedRoleContext,
} from '@/lib/api-auth-guard';

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

// Mock database
vi.mock('@/db/db', () => ({
  db: {
    query: {
      organizationMembers: {
        findFirst: vi.fn(),
      },
    },
  },
}));

// Mock enhanced RBAC queries
vi.mock('@/db/queries/enhanced-rbac-queries', () => ({
  getMemberRoles: vi.fn(),
  getMemberHighestRoleLevel: vi.fn(),
  getMemberEffectivePermissions: vi.fn(),
  logPermissionCheck: vi.fn(),
}));

import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import {
  getMemberRoles,
  getMemberHighestRoleLevel,
  getMemberEffectivePermissions,
} from '@/db/queries/enhanced-rbac-queries';

describe('PR #3: Auth Guard Test Suite', () => {
  const mockRequest = (headers: Record<string, string> = {}) => {
    return new NextRequest('http://localhost:3000/api/test', {
      headers: new Headers(headers),
    });
  };

  const mockAuthContext = {
    userId: 'user_123',
    orgId: 'org_456',
    sessionId: 'sess_789',
  };

  const mockMemberRoles = [
    {
      roleId: 'role_1',
      role: 'admin' as const,
      roleLevel: 100,
      permissions: ['claims:read', 'claims:write', 'claims:delete'],
      isActive: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // withRoleAuth Tests
  // =========================================================================

  describe('withRoleAuth', () => {
    it('should allow access when user has required role', async () => {
      // Mock authenticated user with admin role
      (auth as Mock).mockResolvedValue(mockAuthContext);
      (db.query.organizationMembers.findFirst as Mock).mockResolvedValue({
        userId: 'user_123',
        organizationId: 'org_456',
        role: 'admin',
        status: 'active',
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const guardedHandler = withRoleAuth('admin', handler);

      const request = mockRequest();
      const response = await guardedHandler(request, {});

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should block access when user lacks required role', async () => {
      // Mock authenticated user with member role
      (auth as Mock).mockResolvedValue(mockAuthContext);
      (db.query.organizationMembers.findFirst as Mock).mockResolvedValue({
        userId: 'user_123',
        organizationId: 'org_456',
        role: 'member',
        status: 'active',
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const guardedHandler = withRoleAuth('admin', handler);

      const request = mockRequest();
      const response = await guardedHandler(request, {});

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('Insufficient permissions');
    });

    it('should block unauthenticated users', async () => {
      // Mock no authentication
      (auth as Mock).mockResolvedValue({ userId: null });

      const handler = vi.fn();
      const guardedHandler = withRoleAuth('admin', handler);

      const request = mockRequest();
      const response = await guardedHandler(request, {});

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('should enforce role hierarchy (admin > officer > steward > member)', async () => {
      // Mock user with officer role trying to access steward-only route
      (auth as Mock).mockResolvedValue(mockAuthContext);
      (db.query.organizationMembers.findFirst as Mock).mockResolvedValue({
        userId: 'user_123',
        organizationId: 'org_456',
        role: 'officer',
        status: 'active',
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const guardedHandler = withRoleAuth('steward', handler);

      const request = mockRequest();
      const response = await guardedHandler(request, {});

      // Officer (level 80) should have access to steward-only (level 60) route
      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should block role hierarchy violations (member cannot access admin route)', async () => {
      // Mock user with member role trying to access admin route
      (auth as Mock).mockResolvedValue(mockAuthContext);
      (db.query.organizationMembers.findFirst as Mock).mockResolvedValue({
        userId: 'user_123',
        organizationId: 'org_456',
        role: 'member',
        status: 'active',
      });

      const handler = vi.fn();
      const guardedHandler = withRoleAuth('admin', handler);

      const request = mockRequest();
      const response = await guardedHandler(request, {});

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  // =========================================================================
  // withEnhancedRoleAuth Tests
  // =========================================================================

  describe('withEnhancedRoleAuth', () => {
    const mockEnhancedContext: EnhancedRoleContext = {
      organizationId: 'org_456',
      userId: 'user_123',
      memberId: 'member_789',
      roles: mockMemberRoles,
      highestRoleLevel: 100,
      permissions: ['claims:read', 'claims:write', 'claims:delete'],
      hasPermission: (permission: string) =>
        ['claims:read', 'claims:write', 'claims:delete'].includes(permission),
      checkScope: () => true,
    };

    it('should provide enhanced context with all roles and permissions', async () => {
      (auth as Mock).mockResolvedValue(mockAuthContext);
      (getMemberRoles as Mock).mockResolvedValue(mockMemberRoles);
      (getMemberHighestRoleLevel as Mock).mockResolvedValue(100);
      (getMemberEffectivePermissions as Mock).mockResolvedValue([
        'claims:read',
        'claims:write',
        'claims:delete',
      ]);

      const handler = vi.fn(async (req, context: EnhancedRoleContext) => {
        // Verify context structure
        expect(context.userId).toBe('user_123');
        expect(context.organizationId).toBe('org_456');
        expect(context.roles).toHaveLength(1);
        expect(context.roles[0].role).toBe('admin');
        expect(context.highestRoleLevel).toBe(100);
        expect(context.permissions).toContain('claims:write');
        expect(context.hasPermission('claims:read')).toBe(true);

        return NextResponse.json({ success: true });
      });

      const guardedHandler = withEnhancedRoleAuth(handler);
      const request = mockRequest();
      await guardedHandler(request, {});

      expect(handler).toHaveBeenCalled();
    });

    it('should block users without required minimal role level', async () => {
      (auth as Mock).mockResolvedValue(mockAuthContext);
      (getMemberRoles as Mock).mockResolvedValue([
        {
          roleId: 'role_2',
          role: 'member',
          roleLevel: 40,
          permissions: ['claims:read'],
          isActive: true,
        },
      ]);
      (getMemberHighestRoleLevel as Mock).mockResolvedValue(40);
      (getMemberEffectivePermissions as Mock).mockResolvedValue(['claims:read']);

      const handler = vi.fn();
      const guardedHandler = withEnhancedRoleAuth(handler, {
        minRoleLevel: 80, // Require officer level
      });

      const request = mockRequest();
      const response = await guardedHandler(request, {});

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });

    it('should validate required permissions', async () => {
      (auth as Mock).mockResolvedValue(mockAuthContext);
      (getMemberRoles as Mock).mockResolvedValue(mockMemberRoles);
      (getMemberHighestRoleLevel as Mock).mockResolvedValue(100);
      (getMemberEffectivePermissions as Mock).mockResolvedValue([
        'claims:read', // Missing 'claims:delete'
      ]);

      const handler = vi.fn();
      const guardedHandler = withEnhancedRoleAuth(handler, {
        requiredPermissions: ['claims:delete'], // Not granted
      });

      const request = mockRequest();
      const response = await guardedHandler(request, {});

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  // =========================================================================
  // withApiAuth Tests
  // =========================================================================

  describe('withApiAuth', () => {
    it('should allow authenticated requests', async () => {
      (auth as Mock).mockResolvedValue(mockAuthContext);

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const guardedHandler = withApiAuth(handler);

      const request = mockRequest();
      const response = await guardedHandler(request, {});

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should block unauthenticated requests by default', async () => {
      (auth as Mock).mockResolvedValue({ userId: null });

      const handler = vi.fn();
      const guardedHandler = withApiAuth(handler);

      const request = mockRequest();
      const response = await guardedHandler(request, {});

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('should allow unauthenticated requests when requireAuth=false', async () => {
      (auth as Mock).mockResolvedValue({ userId: null });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const guardedHandler = withApiAuth(handler, { requireAuth: false });

      const request = mockRequest();
      const response = await guardedHandler(request, {});

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should validate cron secret when cronAuth=true', async () => {
      process.env.CRON_SECRET = 'test-secret';

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const guardedHandler = withApiAuth(handler, { cronAuth: true });

      // Valid cron secret
      const validRequest = mockRequest({
        authorization: 'Bearer test-secret',
      });
      const validResponse = await guardedHandler(validRequest, {});
      expect(validResponse.status).toBe(200);

      // Invalid cron secret
      const invalidRequest = mockRequest({
        authorization: 'Bearer wrong-secret',
      });
      const invalidResponse = await guardedHandler(invalidRequest, {});
      expect(invalidResponse.status).toBe(401);
    });
  });

  // =========================================================================
  // Tenant Mismatch Tests
  // =========================================================================

  describe('Tenant Isolation', () => {
    it('should block access when user organization does not match resource organization', async () => {
      (auth as Mock).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_ATTACKER', // Different org!
      });
      (db.query.organizationMembers.findFirst as Mock).mockResolvedValue({
        userId: 'user_123',
        organizationId: 'org_ATTACKER',
        role: 'admin',
        status: 'active',
      });

      const handler = vi.fn(async (req, context: any) => {
        // Handler expects org_456 but user belongs to org_ATTACKER
        const resourceOrg = 'org_456';
        if (context.organizationId !== resourceOrg) {
          return NextResponse.json(
            { error: 'Tenant mismatch' },
            { status: 403 }
          );
        }
        return NextResponse.json({ success: true });
      });

      const guardedHandler = withRoleAuth('admin', handler);
      const request = mockRequest();
      const response = await guardedHandler(request, {});

      const body = await response.json();
      expect(body.error).toContain('Tenant mismatch');
      expect(response.status).toBe(403);
    });

    it('should allow access when user organization matches resource organization', async () => {
      (auth as Mock).mockResolvedValue(mockAuthContext);
      (db.query.organizationMembers.findFirst as Mock).mockResolvedValue({
        userId: 'user_123',
        organizationId: 'org_456',
        role: 'admin',
        status: 'active',
      });

      const handler = vi.fn(async (req, context: any) => {
        const resourceOrg = 'org_456';
        if (context.organizationId !== resourceOrg) {
          return NextResponse.json(
            { error: 'Tenant mismatch' },
            { status: 403 }
          );
        }
        return NextResponse.json({ success: true });
      });

      const guardedHandler = withRoleAuth('admin', handler);
      const request = mockRequest();
      const response = await guardedHandler(request, {});

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  // =========================================================================
  // Allowlist Behavior Tests
  // =========================================================================

  describe('Public Routes Allowlist', () => {
    it('should contain standard public routes', () => {
      expect(PUBLIC_API_ROUTES.has('/api/health')).toBe(true);
      expect(PUBLIC_API_ROUTES.has('/api/webhooks/stripe')).toBe(true);
      expect(PUBLIC_API_ROUTES.has('/api/signatures/webhooks/docusign')).toBe(true);
    });

    it('should NOT contain protected routes in allowlist', () => {
      expect(PUBLIC_API_ROUTES.has('/api/claims')).toBe(false);
      expect(PUBLIC_API_ROUTES.has('/api/members')).toBe(false);
      expect(PUBLIC_API_ROUTES.has('/api/organizations')).toBe(false);
    });

    it('should have explicit justification for each public route (documented)', () => {
      // This test documents the expected public routes
      // Any addition should be carefully reviewed (security impact)
      const allowedPublicCategories = [
        'health', // Healthchecks
        'webhooks', // External service callbacks (signature-verified)
        'signatures', // Document signing callbacks
        'auth', // Clerk auth endpoints
      ];

      const publicRoutes = Array.from(PUBLIC_API_ROUTES);
      publicRoutes.forEach((route) => {
        const hasValidCategory = allowedPublicCategories.some((category) =>
          route.includes(category)
        );
        expect(hasValidCategory).toBe(true);
      });
    });
  });

  // =========================================================================
  // Role Elevation Attack Prevention Tests
  // =========================================================================

  describe('Role Elevation Attack Prevention', () => {
    it('should prevent member from escalating to admin via request manipulation', async () => {
      // Simulate attack: user sends role=admin in request body
      (auth as Mock).mockResolvedValue(mockAuthContext);
      (db.query.organizationMembers.findFirst as Mock).mockResolvedValue({
        userId: 'user_123',
        organizationId: 'org_456',
        role: 'member', // Real role from DB
        status: 'active',
      });

      const handler = vi.fn();
      const guardedHandler = withRoleAuth('admin', handler);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ role: 'admin' }), // Attack payload
      });
      const response = await guardedHandler(request, {});

      // Guard should use DB role, not request payload
      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });

    it('should use database role as source of truth (not request headers)', async () => {
      (auth as Mock).mockResolvedValue(mockAuthContext);
      (db.query.organizationMembers.findFirst as Mock).mockResolvedValue({
        userId: 'user_123',
        organizationId: 'org_456',
        role: 'steward', // Real role from DB
        status: 'active',
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const guardedHandler = withRoleAuth('steward', handler);

      const request = mockRequest({
        'x-user-role': 'admin', // Fake header injection
      });
      const response = await guardedHandler(request, {});

      // Should use DB role (steward), allow access to steward route
      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // Error Handling Tests
  // =========================================================================

  describe('Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue(mockAuthContext);
      (db.query.organizationMembers.findFirst as Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const handler = vi.fn();
      const guardedHandler = withRoleAuth('admin', handler);

      const request = mockRequest();
      const response = await guardedHandler(request, {});

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(500);
    });

    it('should return 401 when Clerk auth throws error', async () => {
      (auth as Mock).mockRejectedValue(new Error('Clerk auth failed'));

      const handler = vi.fn();
      const guardedHandler = withRoleAuth('admin', handler);

      const request = mockRequest();
      const response = await guardedHandler(request, {});

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });
});
