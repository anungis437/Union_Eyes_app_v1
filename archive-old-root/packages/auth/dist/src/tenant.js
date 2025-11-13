// Multi-tenant context and firm/user management
// This is a placeholder for tenant isolation logic
export function getTenantContextFromToken(token) {
    // Stub: parse token for tenant/user/roles
    // Replace with real JWT or provider logic
    return {
        tenantId: 'default-tenant',
        userId: token,
        roles: ['user'],
        firmId: undefined,
    };
}
//# sourceMappingURL=tenant.js.map