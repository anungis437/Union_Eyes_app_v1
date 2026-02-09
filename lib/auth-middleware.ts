import { auth, currentUser } from '@/lib/api-auth-guard';
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { tenantUsers } from '@/db/schema/user-management-schema';
import { tenants } from '@/db/schema/tenant-management-schema';
import { eq, and } from 'drizzle-orm';
import { logger } from './logger';

/**
 * World-class authorization middleware
 * 
 * Features:
 * - Role-based access control (RBAC)
 * - Organization-level permissions
 * - Request context enrichment
 * - Audit logging
 */

export type UserRole = 'member' | 'steward' | 'officer' | 'admin';

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: UserRole;
  email?: string;
  correlationId: string;
}

export interface AuthOptions {
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  requireOrganization?: boolean;
}

/**
 * Role hierarchy for permission checking
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  member: 1,
  steward: 2,
  officer: 3,
  admin: 4,
};

/**
 * Check if user has required role or higher
 */
export function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user role is in allowed roles list
 */
export function isRoleAllowed(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Get user's role in organization
 * Accepts either organization slug or tenant UUID
 */
export async function getUserRole(
  userId: string,
  organizationId: string
): Promise<UserRole | null> {
  try {
    // Join with tenants table to support both slug and UUID lookup
    const [result] = await db
      .select({ role: tenantUsers.role })
      .from(tenantUsers)
      .innerJoin(
        tenants,
        eq(tenants.tenantId, tenantUsers.tenantId)
      )
      .where(and(
        eq(tenantUsers.userId, userId),
        // Check both tenant_slug and tenant_id to support both formats
        organizationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
          ? eq(tenants.tenantId, organizationId)
          : eq(tenants.tenantSlug, organizationId)
      ))
      .limit(1);

    return (result?.role as UserRole) || null;
  } catch (error) {
    logger.error('Failed to fetch user role', error, {
      userId,
      organizationId,
    });
    return null;
  }
}

/**
 * Get organization ID from request
 */
export function getOrganizationId(request: Request): string | null {
  const { searchParams } = new URL(request.url);
  
  // Try query parameter first
  let orgId = searchParams.get('organizationId');
  
  // Try request headers
  if (!orgId) {
    orgId = request.headers.get('x-organization-id');
  }
  
  return orgId;
}

/**
 * Core authorization check
 */
export async function authorize(
  request: Request,
  options: AuthOptions = {}
): Promise<AuthContext | NextResponse> {
  const {
    requiredRole,
    allowedRoles,
    requireOrganization = true,
  } = options;

  try {
    // Check authentication
    const { userId } = auth();
    const user = await currentUser();

    if (!userId || !user) {
      logger.warn('Unauthorized access attempt', {
        path: new URL(request.url).pathname,
      });
      
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to access this resource',
        },
        { status: 401 }
      );
    }

    // Get organization ID
    const organizationId = getOrganizationId(request);

    if (requireOrganization && !organizationId) {
      logger.warn('Missing organization ID', {
        userId,
        path: new URL(request.url).pathname,
      });
      
      return NextResponse.json(
        {
          error: 'Bad Request',
          code: 'ORG_REQUIRED',
          message: 'Organization ID is required',
        },
        { status: 400 }
      );
    }

    // Get user's role
    const role = organizationId 
      ? await getUserRole(userId, organizationId)
      : null;

    if (requireOrganization && !role) {
      logger.warn('User not a member of organization', {
        userId,
        organizationId,
      });
      
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: 'NOT_MEMBER',
          message: 'You are not a member of this organization',
        },
        { status: 403 }
      );
    }

    // Check role requirements
    if (requiredRole && role && !hasRequiredRole(role, requiredRole)) {
      logger.warn('Insufficient permissions', {
        userId,
        organizationId,
        userRole: role,
        requiredRole,
      });
      
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires ${requiredRole} role or higher`,
        },
        { status: 403 }
      );
    }

    if (allowedRoles && role && !isRoleAllowed(role, allowedRoles)) {
      logger.warn('Role not allowed', {
        userId,
        organizationId,
        userRole: role,
        allowedRoles,
      });
      
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: 'ROLE_NOT_ALLOWED',
          message: `This action is only available to: ${allowedRoles.join(', ')}`,
        },
        { status: 403 }
      );
    }

    // Return auth context
    const context: AuthContext = {
      userId,
      organizationId: organizationId!,
      role: role || 'member',
      email: user.primaryEmailAddress?.emailAddress,
      correlationId: logger.getCorrelationId(),
    };

    logger.debug('Authorization successful', {
      userId,
      organizationId,
      role,
    });

    return context;
  } catch (error) {
    logger.error('Authorization error', error, {
      path: new URL(request.url).pathname,
    });
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        code: 'AUTH_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * Higher-order function to wrap API routes with authorization
 */
export function withAuth<T extends (request: Request, context: AuthContext, ...args: any[]) => Promise<Response>>(
  handler: T,
  options: AuthOptions = {}
): (request: Request, ...args: any[]) => Promise<Response> {
  return async (request: Request, ...args: any[]): Promise<Response> => {
    const authResult = await authorize(request, options);

    // If authorization failed, return error response
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Call handler with auth context
    return handler(request, authResult, ...args);
  };
}

/**
 * Pre-configured authorization wrappers for common use cases
 */
export const authWrappers = {
  /**
   * Public endpoint (no auth required)
   */
  public: <T extends (request: Request, ...args: any[]) => Promise<Response>>(handler: T) => {
    return handler;
  },

  /**
   * Requires authentication only
   */
  authenticated: <T extends (request: Request, context: AuthContext, ...args: any[]) => Promise<Response>>(handler: T) => {
    return withAuth(handler, { requireOrganization: false });
  },

  /**
   * Requires member role or higher
   */
  member: <T extends (request: Request, context: AuthContext, ...args: any[]) => Promise<Response>>(handler: T) => {
    return withAuth(handler, { requiredRole: 'member' });
  },

  /**
   * Requires steward role or higher
   */
  steward: <T extends (request: Request, context: AuthContext, ...args: any[]) => Promise<Response>>(handler: T) => {
    return withAuth(handler, { requiredRole: 'steward' });
  },

  /**
   * Requires officer role or higher
   */
  officer: <T extends (request: Request, context: AuthContext, ...args: any[]) => Promise<Response>>(handler: T) => {
    return withAuth(handler, { requiredRole: 'officer' });
  },

  /**
   * Requires admin role
   */
  admin: <T extends (request: Request, context: AuthContext, ...args: any[]) => Promise<Response>>(handler: T) => {
    return withAuth(handler, { requiredRole: 'admin' });
  },
};

/**
 * Check resource ownership
 */
export async function checkResourceOwnership(
  resourceUserId: string,
  authContext: AuthContext
): Promise<boolean> {
  // User owns the resource
  if (resourceUserId === authContext.userId) {
    return true;
  }

  // Admins and officers can access any resource
  if (authContext.role === 'admin' || authContext.role === 'officer') {
    return true;
  }

  return false;
}

/**
 * Audit log for sensitive actions
 */
export function auditLog(
  action: string,
  resourceType: string,
  resourceId: string,
  context: AuthContext,
  metadata?: Record<string, unknown>
): void {
  logger.info(`Audit: ${action}`, {
    action,
    resourceType,
    resourceId,
    userId: context.userId,
    organizationId: context.organizationId,
    role: context.role,
    correlationId: context.correlationId,
    ...metadata,
  });

  // In production, also write to audit table in database
  // await db.insert(auditLogs).values({ ... });
}
