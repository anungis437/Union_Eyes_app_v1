// Multi-tenant context and firm/user management
// This is a placeholder for tenant isolation logic

export interface TenantContext {
  tenantId: string;
  userId: string;
  roles: string[];
  firmId?: string;
}

export function getTenantContextFromToken(token: string): TenantContext | null {
  // Stub: parse token for tenant/user/roles
  // Replace with real JWT or provider logic
  return {
    tenantId: 'default-tenant',
    userId: token,
    roles: ['user'],
    firmId: undefined,
  };
}
