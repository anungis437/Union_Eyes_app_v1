// CourtLens Multi-Tenant Framework Factory
// Utility for creating and configuring the complete multi-tenant framework

import { TenantService, TenantServiceConfig } from '../services/tenant.service';
import { TenantIsolationService, TenantIsolationConfig } from '../services/tenant-isolation.service';
import { TenantMiddleware, TenantMiddlewareConfig, TenantResolutionStrategy } from '../middleware/tenant-context.middleware';
import { TenantIsolationType } from '../types';
import { SimpleLogger } from './logger';

export interface MultiTenantFrameworkConfig {
  // Database configuration
  database: {
    supabaseUrl: string;
    supabaseServiceKey: string;
    masterConnectionString: string;
    defaultSchema: string;
    maxConnections: number;
  };
  
  // Default tenant settings
  tenantDefaults: {
    isolation: TenantIsolationType;
    resourceLimits: {
      storage: number; // GB
      users: number;
      apiRequests: number; // per month
    };
  };
  
  // Middleware configuration
  middleware: {
    strategies: TenantResolutionStrategy[];
    requireActiveTenant: boolean;
    enableCaching: boolean;
    cacheTimeout: number; // seconds
  };
  
  // Storage configuration
  storage: {
    defaultBucket: string;
    enableEncryption: boolean;
    encryptionAlgorithm: string;
    keyRotationDays: number;
  };
  
  // Feature flags
  features: {
    enableMetrics: boolean;
    enableAlerts: boolean;
    enableAuditLogging: boolean;
    enablePerformanceMonitoring: boolean;
  };
}

export interface MultiTenantFramework {
  tenantService: TenantService;
  isolationService: TenantIsolationService;
  middleware: TenantMiddleware;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

export function createMultiTenantFramework(config: MultiTenantFrameworkConfig): MultiTenantFramework {
  const logger = new SimpleLogger('MultiTenantFramework');

  // Create tenant service configuration
  const tenantServiceConfig: TenantServiceConfig = {
    supabase: {
      url: config.database.supabaseUrl,
      serviceKey: config.database.supabaseServiceKey
    },
    defaultIsolation: config.tenantDefaults.isolation,
    resourceDefaults: {
      storage: {
        allocated: config.tenantDefaults.resourceLimits.storage,
        used: 0,
        limit: config.tenantDefaults.resourceLimits.storage
      },
      database: {
        connections: { allocated: 10, used: 0, limit: 10 },
        queries: { daily: 0, monthly: 0, limit: 10000 }
      },
      api: {
        requests: { daily: 0, monthly: 0, limit: config.tenantDefaults.resourceLimits.apiRequests },
        rateLimit: { perMinute: 60, perHour: 1000 }
      },
      users: { count: 0, limit: config.tenantDefaults.resourceLimits.users },
      compute: {
        cpuUsage: 0,
        memoryUsage: 0,
        limit: { cpu: 50, memory: 512, storage: config.tenantDefaults.resourceLimits.storage * 1024 }
      }
    },
    provisioningTimeout: 600, // 10 minutes
    enableMetrics: config.features.enableMetrics,
    enableAlerts: config.features.enableAlerts
  };

  // Create isolation service configuration
  const isolationServiceConfig: TenantIsolationConfig = {
    supabase: {
      url: config.database.supabaseUrl,
      serviceKey: config.database.supabaseServiceKey
    },
    database: {
      masterConnectionString: config.database.masterConnectionString,
      defaultSchema: config.database.defaultSchema,
      maxConnections: config.database.maxConnections
    },
    storage: {
      defaultBucket: config.storage.defaultBucket,
      encryption: {
        enabled: config.storage.enableEncryption,
        algorithm: config.storage.encryptionAlgorithm,
        keyRotationDays: config.storage.keyRotationDays
      }
    }
  };

  // Create services
  const tenantService = new TenantService(tenantServiceConfig);
  const isolationService = new TenantIsolationService(isolationServiceConfig);

  // Create middleware configuration
  const middlewareConfig: TenantMiddlewareConfig = {
    tenantService,
    isolationService,
    strategies: config.middleware.strategies,
    requireActiveTenant: config.middleware.requireActiveTenant,
    enableCaching: config.middleware.enableCaching,
    cacheTimeout: config.middleware.cacheTimeout
  };

  // Create middleware
  const middleware = new TenantMiddleware(middlewareConfig);

  return {
    tenantService,
    isolationService,
    middleware,
    
    async initialize(): Promise<void> {
      // Initialize isolation service
      await isolationService.initialize();
      
      // Additional initialization can be added here
      logger.info('Multi-tenant framework initialized successfully');
    },
    
    async cleanup(): Promise<void> {
      // Cleanup isolation service
      await isolationService.cleanup();
      
      // Clear middleware cache
      middleware.clearCache();
      
      logger.info('Multi-tenant framework cleaned up successfully');
    }
  };
}

// Predefined configurations for common use cases
export const STARTER_FRAMEWORK_CONFIG: Partial<MultiTenantFrameworkConfig> = {
  tenantDefaults: {
    isolation: TenantIsolationType.SHARED_DATABASE,
    resourceLimits: {
      storage: 1, // 1GB
      users: 10,
      apiRequests: 10000
    }
  },
  middleware: {
    strategies: [
      TenantResolutionStrategy.SUBDOMAIN,
      TenantResolutionStrategy.HEADER
    ],
    requireActiveTenant: true,
    enableCaching: true,
    cacheTimeout: 300 // 5 minutes
  },
  storage: {
    defaultBucket: 'tenant-storage',
    enableEncryption: false,
    encryptionAlgorithm: 'AES-256-GCM',
    keyRotationDays: 90
  },
  features: {
    enableMetrics: true,
    enableAlerts: true,
    enableAuditLogging: true,
    enablePerformanceMonitoring: false
  }
};

export const ENTERPRISE_FRAMEWORK_CONFIG: Partial<MultiTenantFrameworkConfig> = {
  tenantDefaults: {
    isolation: TenantIsolationType.SEPARATE_SCHEMA,
    resourceLimits: {
      storage: 100, // 100GB
      users: 1000,
      apiRequests: 1000000
    }
  },
  middleware: {
    strategies: [
      TenantResolutionStrategy.DOMAIN,
      TenantResolutionStrategy.SUBDOMAIN,
      TenantResolutionStrategy.JWT_CLAIM,
      TenantResolutionStrategy.HEADER
    ],
    requireActiveTenant: true,
    enableCaching: true,
    cacheTimeout: 600 // 10 minutes
  },
  storage: {
    defaultBucket: 'enterprise-tenant-storage',
    enableEncryption: true,
    encryptionAlgorithm: 'AES-256-GCM',
    keyRotationDays: 30
  },
  features: {
    enableMetrics: true,
    enableAlerts: true,
    enableAuditLogging: true,
    enablePerformanceMonitoring: true
  }
};

export const DEVELOPMENT_FRAMEWORK_CONFIG: Partial<MultiTenantFrameworkConfig> = {
  tenantDefaults: {
    isolation: TenantIsolationType.SHARED_DATABASE,
    resourceLimits: {
      storage: 0.1, // 100MB
      users: 5,
      apiRequests: 1000
    }
  },
  middleware: {
    strategies: [
      TenantResolutionStrategy.HEADER,
      TenantResolutionStrategy.QUERY_PARAM
    ],
    requireActiveTenant: false,
    enableCaching: false,
    cacheTimeout: 60 // 1 minute
  },
  storage: {
    defaultBucket: 'dev-tenant-storage',
    enableEncryption: false,
    encryptionAlgorithm: 'AES-256-GCM',
    keyRotationDays: 365
  },
  features: {
    enableMetrics: false,
    enableAlerts: false,
    enableAuditLogging: true,
    enablePerformanceMonitoring: false
  }
};

// Utility function to merge configurations
export function mergeFrameworkConfig(
  base: Partial<MultiTenantFrameworkConfig>,
  override: Partial<MultiTenantFrameworkConfig>
): MultiTenantFrameworkConfig {
  return {
    database: {
      ...base.database,
      ...override.database
    },
    tenantDefaults: {
      ...base.tenantDefaults,
      ...override.tenantDefaults,
      resourceLimits: {
        ...base.tenantDefaults?.resourceLimits,
        ...override.tenantDefaults?.resourceLimits
      }
    },
    middleware: {
      ...base.middleware,
      ...override.middleware
    },
    storage: {
      ...base.storage,
      ...override.storage
    },
    features: {
      ...base.features,
      ...override.features
    }
  } as MultiTenantFrameworkConfig;
}

// Quick setup functions
export function createStarterFramework(
  databaseConfig: MultiTenantFrameworkConfig['database'],
  overrides?: Partial<MultiTenantFrameworkConfig>
): MultiTenantFramework {
  const config = mergeFrameworkConfig(
    { ...STARTER_FRAMEWORK_CONFIG, database: databaseConfig },
    overrides || {}
  );
  return createMultiTenantFramework(config);
}

export function createEnterpriseFramework(
  databaseConfig: MultiTenantFrameworkConfig['database'],
  overrides?: Partial<MultiTenantFrameworkConfig>
): MultiTenantFramework {
  const config = mergeFrameworkConfig(
    { ...ENTERPRISE_FRAMEWORK_CONFIG, database: databaseConfig },
    overrides || {}
  );
  return createMultiTenantFramework(config);
}

export function createDevelopmentFramework(
  databaseConfig: MultiTenantFrameworkConfig['database'],
  overrides?: Partial<MultiTenantFrameworkConfig>
): MultiTenantFramework {
  const config = mergeFrameworkConfig(
    { ...DEVELOPMENT_FRAMEWORK_CONFIG, database: databaseConfig },
    overrides || {}
  );
  return createMultiTenantFramework(config);
}
