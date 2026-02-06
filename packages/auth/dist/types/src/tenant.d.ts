export interface TenantContext {
    tenantId: string;
    userId: string;
    roles: string[];
    firmId?: string;
}
export declare function getTenantContextFromToken(token: string): TenantContext | null;
//# sourceMappingURL=tenant.d.ts.map