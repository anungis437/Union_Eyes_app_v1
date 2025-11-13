import { Tenant, TenantContext } from '../types';
export interface TenantIsolationConfig {
    supabase: {
        url: string;
        serviceKey: string;
    };
    database: {
        masterConnectionString: string;
        defaultSchema: string;
        maxConnections: number;
    };
    storage: {
        defaultBucket: string;
        encryption: {
            enabled: boolean;
            algorithm: string;
            keyRotationDays: number;
        };
    };
}
export declare class TenantIsolationService {
    private supabase;
    private logger;
    private config;
    private connectionPool;
    private schemaCache;
    constructor(config: TenantIsolationConfig);
    initialize(): Promise<void>;
    setupDatabaseIsolation(tenant: Tenant): Promise<void>;
    private setupSharedDatabaseIsolation;
    private setupSeparateSchemaIsolation;
    private setupSeparateDatabaseIsolation;
    private setupHybridIsolation;
    setupStorageIsolation(tenant: Tenant): Promise<void>;
    setupCacheIsolation(tenant: Tenant): Promise<void>;
    getIsolatedConnection(context: TenantContext): Promise<any>;
    private createTenantView;
    private setupRowLevelSecurity;
    private createSchema;
    private cloneBaseTables;
    private cloneTableToSchema;
    private setupSchemaPermissions;
    private createDatabase;
    private setupDatabaseSchema;
    private generateConnectionString;
    private createStorageBucket;
    private setupStoragePermissions;
    private setupStorageEncryption;
    private createCacheNamespace;
    private setupCacheKeyIsolation;
    private setupCachePolicies;
    private createSharedConnection;
    private createSchemaConnection;
    private createDatabaseConnection;
    private createHybridConnection;
    private updateTenantIsolationConfig;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=tenant-isolation.service.d.ts.map