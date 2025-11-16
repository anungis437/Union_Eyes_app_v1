/**
 * Tenant Middleware
 * 
 * Middleware to enforce tenant context in API routes.
 * Validates tenant access and injects tenant ID into request context.
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getTenantIdForUser, validateTenantExists } from "@/lib/tenant-utils";
import { cookies } from "next/headers";

export interface TenantContext {
  tenantId: string;
  userId: string;
}

/**
 * Middleware to extract and validate tenant context
 * 
 * Usage in API routes:
 * ```typescript
 * import { withTenantAuth } from "@/lib/tenant-middleware";
 * 
 * export const GET = withTenantAuth(async (request, context) => {
 *   const { tenantId, userId } = context;
 *   // Your tenant-aware logic here
 * });
 * ```
 */
export function withTenantAuth<T = any>(
  handler: (
    request: NextRequest,
    context: TenantContext,
    params?: T
  ) => Promise<NextResponse> | NextResponse
) {
  return async (
    request: NextRequest,
    routeContext?: { params: Promise<T> | T }
  ): Promise<NextResponse> => {
    try {
      // Authenticate user
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: "Unauthorized - Authentication required" },
          { status: 401 }
        );
      }

      // Get tenant ID - getTenantIdForUser handles cookie checking and access verification
      const tenantId = await getTenantIdForUser(userId);

      // Create tenant context
      const context: TenantContext = {
        tenantId,
        userId,
      };

      // Resolve params if they're a Promise
      const params = routeContext?.params 
        ? await Promise.resolve(routeContext.params)
        : undefined;

      // Call the handler with context
      return await handler(request, context, params);
    } catch (error) {
      console.error("Tenant middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Validate tenant access for a specific tenant ID
 * 
 * Use this when the tenant ID comes from the request (e.g., URL parameter)
 * to ensure the user has access to that specific tenant.
 */
export async function validateTenantAccess(
  userId: string,
  requestedTenantId: string
): Promise<boolean> {
  try {
    // Phase 1: Allow access to any tenant (single-tenant mode)
    // Phase 2+: Check tenant_users table for user's tenant memberships
    const userTenantId = await getTenantIdForUser(userId);
    
    // For now, ensure tenant exists
    const exists = await validateTenantExists(requestedTenantId);
    
    return exists;
  } catch (error) {
    console.error("Error validating tenant access:", error);
    return false;
  }
}

/**
 * Extract tenant ID from request headers or cookies
 * 
 * Checks in order:
 * 1. X-Tenant-ID header
 * 2. selected_tenant_id cookie
 * 3. User's default tenant
 */
export async function getTenantIdFromRequest(
  request: NextRequest,
  userId: string
): Promise<string> {
  // Check header first
  const headerTenantId = request.headers.get("X-Tenant-ID");
  if (headerTenantId) {
    const isValid = await validateTenantExists(headerTenantId);
    if (isValid) {
      return headerTenantId;
    }
  }

  // Check cookie
  const cookieStore = await cookies();
  const cookieTenantId = cookieStore.get("selected_tenant_id")?.value;
  if (cookieTenantId) {
    const isValid = await validateTenantExists(cookieTenantId);
    if (isValid) {
      return cookieTenantId;
    }
  }

  // Fall back to user's default tenant
  return getTenantIdForUser(userId);
}
