import { TenantService } from '../services/tenant.service';
import { TenantIsolationService } from '../services/tenant-isolation.service';
import { TenantMiddleware, TenantResolutionStrategy } from '../middleware/tenant-context.middleware';
import { TenantIsolationType } from '../types';
export interface MultiTenantFrameworkConfig {
    database: {
        supabaseUrl: string;
        supabaseServiceKey: string;
        masterConnectionString: string;
        defaultSchema: string;
        maxConnections: number;
    };
    tenantDefaults: {
        isolation: TenantIsolationType;
        resourceLimits: {
            storage: number;
            users: number;
            apiRequests: number;
        };
    };
    middleware: {
        strategies: TenantResolutionStrategy[];
        requireActiveTenant: boolean;
        enableCaching: boolean;
        cacheTimeout: number;
    };
    storage: {
        defaultBucket: string;
        enableEncryption: boolean;
        encryptionAlgorithm: string;
        keyRotationDays: number;
    };
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
export declare function createMultiTenantFramework(config: MultiTenantFrameworkConfig): MultiTenantFramework;
export declare const STARTER_FRAMEWORK_CONFIG: Partial<MultiTenantFrameworkConfig>;
export declare const ENTERPRISE_FRAMEWORK_CONFIG: Partial<MultiTenantFrameworkConfig>;
export declare const DEVELOPMENT_FRAMEWORK_CONFIG: Partial<MultiTenantFrameworkConfig>;
export declare function mergeFrameworkConfig(base: Partial<MultiTenantFrameworkConfig>, override: Partial<MultiTenantFrameworkConfig>): MultiTenantFrameworkConfig;
export declare function createStarterFramework(databaseConfig: MultiTenantFrameworkConfig['database'], overrides?: Partial<MultiTenantFrameworkConfig>): MultiTenantFramework;
export declare function createEnterpriseFramework(databaseConfig: MultiTenantFrameworkConfig['database'], overrides?: Partial<MultiTenantFrameworkConfig>): MultiTenantFramework;
export declare function createDevelopmentFramework(databaseConfig: MultiTenantFrameworkConfig['database'], overrides?: Partial<MultiTenantFrameworkConfig>): MultiTenantFramework;
//# sourceMappingURL=framework-factory.d.ts.map