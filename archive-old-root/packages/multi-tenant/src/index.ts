// CourtLens Multi-Tenant Package
// Main exports for multi-tenant architecture

// Types
export * from './types';

// Services
export { TenantService, type TenantServiceConfig } from './services/tenant.service';
export { TenantIsolationService, type TenantIsolationConfig } from './services/tenant-isolation.service';

// New Multi-Tenant Services (Phase 2A)
export * from './services/organizationService';
export * from './services/billingService';

// Hooks (Phase 3)
export * from './hooks/useOrganization';
export * from './hooks/useOrganizationMembers';
export * from './hooks/useBilling';

// Components (Phase 4)
export * from './components';

// API (Phase 5)
export * from './api/stripeWebhook';

// Middleware
export {
  TenantMiddleware,
  TenantResolutionStrategy,
  createTenantMiddleware,
  createBasicTenantMiddleware,
  tenantMiddleware,
  createDevTenantMiddleware,
  type TenantMiddlewareConfig,
  type TenantRequest
} from './middleware/tenant-context.middleware';

// Utility functions
export { createMultiTenantFramework, type MultiTenantFrameworkConfig } from './utils';

// Default configurations
export const DEFAULT_TENANT_CONFIG = {
  isolation: {
    type: 'shared_database',
    databaseConfig: {
      tablePrefix: 'tenant_'
    },
    storageConfig: {
      bucket: 'tenant-storage',
      path: '',
      encryption: true
    },
    cacheConfig: {
      keyPrefix: 'tenant:',
      namespace: 'default'
    },
    networkConfig: {}
  },
  resources: {
    storage: { allocated: 1, used: 0, limit: 1 },
    database: {
      connections: { allocated: 10, used: 0, limit: 10 },
      queries: { daily: 0, monthly: 0, limit: 10000 }
    },
    api: {
      requests: { daily: 0, monthly: 0, limit: 1000 },
      rateLimit: { perMinute: 60, perHour: 1000 }
    },
    users: { count: 0, limit: 10 },
    compute: {
      cpuUsage: 0,
      memoryUsage: 0,
      limit: { cpu: 50, memory: 512, storage: 1024 }
    }
  }
};
