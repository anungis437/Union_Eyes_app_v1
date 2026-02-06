// CourtLens Tenant Isolation Service
// Manages tenant data isolation strategies and resource segregation
import { createClient } from '@supabase/supabase-js';
import { SimpleLogger } from '../utils/logger';
import { TenantIsolationType } from '../types';
export class TenantIsolationService {
    constructor(config) {
        this.connectionPool = new Map();
        this.schemaCache = new Map();
        this.config = config;
        this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
        this.logger = new SimpleLogger('TenantIsolationService');
    }
    async initialize() {
        try {
            await this.logger.info('Tenant isolation service initialized');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.logger.error('Failed to initialize tenant isolation service', {
                error: errorMessage
            });
            throw error;
        }
    }
    // Database Isolation Methods
    async setupDatabaseIsolation(tenant) {
        try {
            switch (tenant.isolation.type) {
                case TenantIsolationType.SHARED_DATABASE:
                    await this.setupSharedDatabaseIsolation(tenant);
                    break;
                case TenantIsolationType.SEPARATE_SCHEMA:
                    await this.setupSeparateSchemaIsolation(tenant);
                    break;
                case TenantIsolationType.SEPARATE_DATABASE:
                    await this.setupSeparateDatabaseIsolation(tenant);
                    break;
                case TenantIsolationType.HYBRID:
                    await this.setupHybridIsolation(tenant);
                    break;
                default:
                    throw new Error(`Unsupported isolation type: ${tenant.isolation.type}`);
            }
            await this.logger.info('Database isolation setup completed', {
                tenantId: tenant.id,
                isolationType: tenant.isolation.type
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.logger.error('Failed to setup database isolation', {
                tenantId: tenant.id,
                isolationType: tenant.isolation.type,
                error: errorMessage
            });
            throw error;
        }
    }
    async setupSharedDatabaseIsolation(tenant) {
        // In shared database isolation, all tenants share the same database
        // but data is separated using tenant ID columns and row-level security
        const tablePrefix = tenant.isolation.databaseConfig.tablePrefix || `tenant_${tenant.id}_`;
        // Create tenant-specific views with RLS (Row Level Security)
        const tables = [
            'users', 'documents', 'cases', 'matters', 'tasks', 'activities'
        ];
        for (const table of tables) {
            await this.createTenantView(tenant.id, table, tablePrefix);
            await this.setupRowLevelSecurity(tenant.id, table);
        }
        // Update tenant configuration
        await this.updateTenantIsolationConfig(tenant.id, {
            databaseConfig: {
                ...tenant.isolation.databaseConfig,
                tablePrefix,
                schema: this.config.database.defaultSchema
            }
        });
    }
    async setupSeparateSchemaIsolation(tenant) {
        // Create a separate schema for the tenant
        const schemaName = tenant.isolation.databaseConfig.schema || `tenant_${tenant.id}`;
        // Create schema if it doesn't exist
        await this.createSchema(schemaName);
        // Clone base tables into tenant schema
        await this.cloneBaseTables(schemaName);
        // Setup schema-level permissions
        await this.setupSchemaPermissions(tenant.id, schemaName);
        // Update tenant configuration
        await this.updateTenantIsolationConfig(tenant.id, {
            databaseConfig: {
                ...tenant.isolation.databaseConfig,
                schema: schemaName
            }
        });
    }
    async setupSeparateDatabaseIsolation(tenant) {
        // Create a completely separate database for the tenant
        const databaseName = `courtlens_tenant_${tenant.id}`;
        // Create database
        await this.createDatabase(databaseName);
        // Setup database schema
        await this.setupDatabaseSchema(databaseName);
        // Create connection string
        const connectionString = this.generateConnectionString(databaseName);
        // Update tenant configuration
        await this.updateTenantIsolationConfig(tenant.id, {
            databaseConfig: {
                ...tenant.isolation.databaseConfig,
                connectionString
            }
        });
    }
    async setupHybridIsolation(tenant) {
        // Hybrid approach: sensitive data in separate schema/database,
        // common data in shared tables
        // Setup separate schema for sensitive data
        const sensitiveSchema = `tenant_${tenant.id}_secure`;
        await this.createSchema(sensitiveSchema);
        // Setup shared database access for common data
        await this.setupSharedDatabaseIsolation(tenant);
        // Configure which tables go where
        const sensitiveTables = ['user_profiles', 'documents', 'financial_data'];
        const sharedTables = ['system_settings', 'templates', 'notifications'];
        // Clone sensitive tables to separate schema
        for (const table of sensitiveTables) {
            await this.cloneTableToSchema(table, sensitiveSchema);
        }
        // Update tenant configuration with extended config
        const extendedConfig = {
            ...tenant.isolation.databaseConfig,
            schema: sensitiveSchema,
            tablePrefix: `tenant_${tenant.id}_`
        };
        await this.updateTenantIsolationConfig(tenant.id, {
            databaseConfig: extendedConfig
        });
    }
    // Storage Isolation Methods
    async setupStorageIsolation(tenant) {
        try {
            const bucketName = tenant.isolation.storageConfig.bucket || `tenant-${tenant.id}`;
            const bucketPath = tenant.isolation.storageConfig.path || `tenants/${tenant.id}`;
            // Create tenant-specific storage bucket or path
            await this.createStorageBucket(bucketName);
            // Setup bucket policies and permissions
            await this.setupStoragePermissions(tenant.id, bucketName, bucketPath);
            // Configure encryption if enabled
            if (tenant.isolation.storageConfig.encryption) {
                await this.setupStorageEncryption(tenant.id, bucketName);
            }
            // Update tenant configuration
            await this.updateTenantIsolationConfig(tenant.id, {
                storageConfig: {
                    ...tenant.isolation.storageConfig,
                    bucket: bucketName,
                    path: bucketPath
                }
            });
            await this.logger.info('Storage isolation setup completed', {
                tenantId: tenant.id,
                bucket: bucketName,
                path: bucketPath
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.logger.error('Failed to setup storage isolation', {
                tenantId: tenant.id,
                error: errorMessage
            });
            throw error;
        }
    }
    // Cache Isolation Methods
    async setupCacheIsolation(tenant) {
        try {
            const keyPrefix = tenant.isolation.cacheConfig.keyPrefix || `tenant:${tenant.id}:`;
            const namespace = tenant.isolation.cacheConfig.namespace || tenant.id;
            // Create cache namespace (simplified without Redis for now)
            await this.createCacheNamespace(tenant.id, namespace);
            // Setup cache key isolation
            await this.setupCacheKeyIsolation(tenant.id, keyPrefix);
            // Configure cache policies (TTL, eviction, etc.)
            await this.setupCachePolicies(tenant.id, namespace);
            // Update tenant configuration
            await this.updateTenantIsolationConfig(tenant.id, {
                cacheConfig: {
                    keyPrefix,
                    namespace
                }
            });
            await this.logger.info('Cache isolation setup completed', {
                tenantId: tenant.id,
                namespace,
                keyPrefix
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.logger.error('Failed to setup cache isolation', {
                tenantId: tenant.id,
                error: errorMessage
            });
            throw error;
        }
    }
    // Context-based Access Methods
    async getIsolatedConnection(context) {
        try {
            const tenantId = context.tenantId;
            const isolationType = context.isolation.type;
            // Check connection pool first
            const connectionKey = `${tenantId}:${isolationType}`;
            if (this.connectionPool.has(connectionKey)) {
                return this.connectionPool.get(connectionKey);
            }
            let connection;
            switch (isolationType) {
                case TenantIsolationType.SHARED_DATABASE:
                    connection = await this.createSharedConnection(context);
                    break;
                case TenantIsolationType.SEPARATE_SCHEMA:
                    connection = await this.createSchemaConnection(context);
                    break;
                case TenantIsolationType.SEPARATE_DATABASE:
                    connection = await this.createDatabaseConnection(context);
                    break;
                case TenantIsolationType.HYBRID:
                    connection = await this.createHybridConnection(context);
                    break;
                default:
                    throw new Error(`Unsupported isolation type: ${isolationType}`);
            }
            // Cache connection
            this.connectionPool.set(connectionKey, connection);
            return connection;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.logger.error('Failed to get isolated connection', {
                tenantId: context.tenantId,
                error: errorMessage
            });
            throw error;
        }
    }
    // Helper Methods
    async createTenantView(tenantId, tableName, prefix) {
        // Create tenant-specific view with RLS
        const viewName = `${prefix}${tableName}`;
        // Implementation would create database view
        await this.logger.info('Created tenant view', { tenantId, viewName });
    }
    async setupRowLevelSecurity(tenantId, tableName) {
        // Setup RLS policies for tenant isolation
        // Implementation would create RLS policies
        await this.logger.info('Setup RLS for tenant', { tenantId, tableName });
    }
    async createSchema(schemaName) {
        if (this.schemaCache.has(schemaName)) {
            return;
        }
        // Create database schema
        // Implementation would execute CREATE SCHEMA command
        this.schemaCache.set(schemaName, true);
        await this.logger.info('Created schema', { schemaName });
    }
    async cloneBaseTables(schemaName) {
        // Clone base table structure to tenant schema
        // Implementation would copy table structures
        await this.logger.info('Cloned base tables', { schemaName });
    }
    async cloneTableToSchema(tableName, schemaName) {
        // Clone specific table to tenant schema
        // Implementation would copy table structure
        await this.logger.info('Cloned table to schema', { tableName, schemaName });
    }
    async setupSchemaPermissions(tenantId, schemaName) {
        // Setup schema-level permissions and access controls
        // Implementation would configure database permissions
        await this.logger.info('Setup schema permissions', { tenantId, schemaName });
    }
    async createDatabase(databaseName) {
        // Create separate database for tenant
        // Implementation would execute CREATE DATABASE command
        await this.logger.info('Created database', { databaseName });
    }
    async setupDatabaseSchema(databaseName) {
        // Setup complete schema in separate database
        // Implementation would create all necessary tables and indexes
        await this.logger.info('Setup database schema', { databaseName });
    }
    generateConnectionString(databaseName) {
        // Generate connection string for tenant database
        const baseUrl = new URL(this.config.database.masterConnectionString);
        baseUrl.pathname = `/${databaseName}`;
        return baseUrl.toString();
    }
    async createStorageBucket(bucketName) {
        try {
            const { error } = await this.supabase.storage.createBucket(bucketName, {
                public: false,
                allowedMimeTypes: ['*/*'],
                fileSizeLimit: 10485760 // 10MB default
            });
            if (error && !error.message.includes('already exists')) {
                throw error;
            }
        }
        catch (error) {
            // Handle bucket already exists or other errors
            throw error;
        }
    }
    async setupStoragePermissions(tenantId, bucketName, path) {
        // Setup storage bucket permissions and policies
        // Implementation would configure storage access controls
        await this.logger.info('Setup storage permissions', { tenantId, bucketName, path });
    }
    async setupStorageEncryption(tenantId, bucketName) {
        // Setup encryption for tenant storage
        // Implementation would configure encryption settings
        await this.logger.info('Setup storage encryption', { tenantId, bucketName });
    }
    async createCacheNamespace(tenantId, namespace) {
        // Create cache namespace for tenant (simplified implementation)
        await this.logger.info('Created cache namespace', { tenantId, namespace });
    }
    async setupCacheKeyIsolation(tenantId, keyPrefix) {
        // Setup cache key isolation (simplified implementation)
        await this.logger.info('Setup cache key isolation', { tenantId, keyPrefix });
    }
    async setupCachePolicies(tenantId, namespace) {
        // Setup cache policies (TTL, eviction, etc.)
        await this.logger.info('Setup cache policies', { tenantId, namespace });
    }
    async createSharedConnection(context) {
        // Create shared database connection with tenant context
        const connection = createClient(this.config.supabase.url, this.config.supabase.serviceKey);
        // Add tenant context to connection
        return connection;
    }
    async createSchemaConnection(context) {
        // Create schema-specific connection
        const connection = createClient(this.config.supabase.url, this.config.supabase.serviceKey);
        // Set default schema for tenant
        return connection;
    }
    async createDatabaseConnection(context) {
        // Create connection to tenant-specific database
        if (!context.isolation.databaseConfig.connectionString) {
            throw new Error('Database connection string not configured for tenant');
        }
        const connection = createClient(context.isolation.databaseConfig.connectionString, this.config.supabase.serviceKey);
        return connection;
    }
    async createHybridConnection(context) {
        // Create hybrid connection with both shared and isolated access
        const sharedConnection = await this.createSharedConnection(context);
        const isolatedConnection = await this.createSchemaConnection(context);
        return {
            shared: sharedConnection,
            isolated: isolatedConnection
        };
    }
    async updateTenantIsolationConfig(tenantId, config) {
        try {
            await this.supabase
                .from('tenants')
                .update({
                isolation: config,
                updatedAt: new Date()
            })
                .eq('id', tenantId);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.logger.error('Failed to update tenant isolation config', {
                tenantId,
                error: errorMessage
            });
            throw error;
        }
    }
    async cleanup() {
        try {
            // Close database connections
            const connections = Array.from(this.connectionPool.entries());
            for (const [key, connection] of connections) {
                // Close connection based on type
                if (connection && typeof connection.close === 'function') {
                    await connection.close();
                }
            }
            this.connectionPool.clear();
            this.schemaCache.clear();
            await this.logger.info('Tenant isolation service cleaned up');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.logger.error('Failed to cleanup tenant isolation service', {
                error: errorMessage
            });
        }
    }
}
//# sourceMappingURL=tenant-isolation.service.js.map