export * from './types';
export { TenantService, type TenantServiceConfig } from './services/tenant.service';
export { TenantIsolationService, type TenantIsolationConfig } from './services/tenant-isolation.service';
export * from './services/organizationService';
export * from './services/billingService';
export * from './hooks/useOrganization';
export * from './hooks/useOrganizationMembers';
export * from './hooks/useBilling';
export * from './components';
export * from './api/stripeWebhook';
export { TenantMiddleware, TenantResolutionStrategy, createTenantMiddleware, createBasicTenantMiddleware, tenantMiddleware, createDevTenantMiddleware, type TenantMiddlewareConfig, type TenantRequest } from './middleware/tenant-context.middleware';
export { createMultiTenantFramework, type MultiTenantFrameworkConfig } from './utils';
export declare const DEFAULT_TENANT_CONFIG: {
    isolation: {
        type: string;
        databaseConfig: {
            tablePrefix: string;
        };
        storageConfig: {
            bucket: string;
            path: string;
            encryption: boolean;
        };
        cacheConfig: {
            keyPrefix: string;
            namespace: string;
        };
        networkConfig: {};
    };
    resources: {
        storage: {
            allocated: number;
            used: number;
            limit: number;
        };
        database: {
            connections: {
                allocated: number;
                used: number;
                limit: number;
            };
            queries: {
                daily: number;
                monthly: number;
                limit: number;
            };
        };
        api: {
            requests: {
                daily: number;
                monthly: number;
                limit: number;
            };
            rateLimit: {
                perMinute: number;
                perHour: number;
            };
        };
        users: {
            count: number;
            limit: number;
        };
        compute: {
            cpuUsage: number;
            memoryUsage: number;
            limit: {
                cpu: number;
                memory: number;
                storage: number;
            };
        };
    };
};
//# sourceMappingURL=index.d.ts.map