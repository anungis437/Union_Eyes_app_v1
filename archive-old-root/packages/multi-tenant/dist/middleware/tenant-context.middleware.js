// CourtLens Tenant Context Middleware
// Injects tenant context into requests and ensures proper tenant isolation
import { SimpleLogger } from '../utils/logger';
import { TenantStatus } from '../types';
export var TenantResolutionStrategy;
(function (TenantResolutionStrategy) {
    TenantResolutionStrategy["SUBDOMAIN"] = "subdomain";
    TenantResolutionStrategy["DOMAIN"] = "domain";
    TenantResolutionStrategy["HEADER"] = "header";
    TenantResolutionStrategy["JWT_CLAIM"] = "jwt_claim";
    TenantResolutionStrategy["QUERY_PARAM"] = "query_param";
    TenantResolutionStrategy["PATH_PARAM"] = "path_param";
})(TenantResolutionStrategy || (TenantResolutionStrategy = {}));
export class TenantMiddleware {
    constructor(config) {
        this.contextCache = new Map();
        this.config = config;
        this.logger = new SimpleLogger('TenantMiddleware');
    }
    // Main middleware function
    middleware() {
        return async (req, res, next) => {
            try {
                // Resolve tenant from request
                const tenantInfo = await this.resolveTenant(req);
                if (!tenantInfo) {
                    if (this.config.requireActiveTenant) {
                        return res.status(400).json({
                            error: 'Tenant not found',
                            message: 'Unable to resolve tenant from request'
                        });
                    }
                    return next();
                }
                const { tenant, tenantId } = tenantInfo;
                // Validate tenant status
                if (tenant && tenant.status !== TenantStatus.ACTIVE) {
                    return res.status(403).json({
                        error: 'Tenant not active',
                        message: `Tenant status: ${tenant.status}`,
                        tenantId: tenant.id
                    });
                }
                // Create or get cached tenant context
                const context = await this.getTenantContext(tenantId, req);
                // Attach to request
                req.tenant = tenant;
                req.tenantContext = context;
                req.tenantId = tenantId;
                // Setup isolated connections
                await this.setupIsolatedConnections(req, context);
                // Log tenant access
                await this.logTenantAccess(req, tenant);
                next();
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                await this.logger.error('Tenant middleware error', {
                    url: req.url,
                    method: req.method,
                    error: errorMessage
                });
                res.status(500).json({
                    error: 'Tenant resolution failed',
                    message: 'Internal server error during tenant resolution'
                });
            }
        };
    }
    // Tenant resolution methods
    async resolveTenant(req) {
        for (const strategy of this.config.strategies) {
            try {
                const result = await this.resolveByStrategy(req, strategy);
                if (result) {
                    return result;
                }
            }
            catch (error) {
                // Continue to next strategy
                continue;
            }
        }
        return null;
    }
    async resolveByStrategy(req, strategy) {
        switch (strategy) {
            case TenantResolutionStrategy.SUBDOMAIN:
                return await this.resolveBySubdomain(req);
            case TenantResolutionStrategy.DOMAIN:
                return await this.resolveByDomain(req);
            case TenantResolutionStrategy.HEADER:
                return await this.resolveByHeader(req);
            case TenantResolutionStrategy.JWT_CLAIM:
                return await this.resolveByJwtClaim(req);
            case TenantResolutionStrategy.QUERY_PARAM:
                return await this.resolveByQueryParam(req);
            case TenantResolutionStrategy.PATH_PARAM:
                return await this.resolveByPathParam(req);
            default:
                return null;
        }
    }
    async resolveBySubdomain(req) {
        const host = req.get('Host');
        if (!host)
            return null;
        // Extract subdomain
        const parts = host.split('.');
        if (parts.length < 3)
            return null; // No subdomain
        const subdomain = parts[0];
        const domain = parts.slice(1).join('.');
        // Lookup tenant by subdomain and domain
        const tenant = await this.config.tenantService.getTenantByDomain(domain, subdomain);
        if (tenant) {
            return { tenant, tenantId: tenant.id };
        }
        return null;
    }
    async resolveByDomain(req) {
        const host = req.get('Host');
        if (!host)
            return null;
        // Remove port if present
        const domain = host.split(':')[0];
        // Lookup tenant by domain
        const tenant = await this.config.tenantService.getTenantByDomain(domain);
        if (tenant) {
            return { tenant, tenantId: tenant.id };
        }
        return null;
    }
    async resolveByHeader(req) {
        const tenantId = req.get('X-Tenant-ID') || req.get('Tenant-ID');
        if (!tenantId)
            return null;
        const tenant = await this.config.tenantService.getTenant(tenantId);
        if (tenant) {
            return { tenant, tenantId: tenant.id };
        }
        return { tenantId };
    }
    async resolveByJwtClaim(req) {
        // Extract JWT from Authorization header
        const authHeader = req.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer '))
            return null;
        try {
            const token = authHeader.substring(7);
            // Decode JWT without verification (should be verified earlier in the pipeline)
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            const tenantId = payload.tenant_id || payload.tid;
            if (!tenantId)
                return null;
            const tenant = await this.config.tenantService.getTenant(tenantId);
            if (tenant) {
                return { tenant, tenantId: tenant.id };
            }
            return { tenantId };
        }
        catch (error) {
            return null;
        }
    }
    async resolveByQueryParam(req) {
        const tenantId = req.query.tenant_id || req.query.tenantId;
        if (!tenantId || typeof tenantId !== 'string')
            return null;
        const tenant = await this.config.tenantService.getTenant(tenantId);
        if (tenant) {
            return { tenant, tenantId: tenant.id };
        }
        return { tenantId };
    }
    async resolveByPathParam(req) {
        // Extract tenant ID from path like /tenant/:tenantId/...
        const pathMatch = req.path.match(/^\/tenant\/([^\/]+)/);
        if (!pathMatch)
            return null;
        const tenantId = pathMatch[1];
        const tenant = await this.config.tenantService.getTenant(tenantId);
        if (tenant) {
            return { tenant, tenantId: tenant.id };
        }
        return { tenantId };
    }
    // Context management
    async getTenantContext(tenantId, req) {
        const cacheKey = `${tenantId}:${this.getUserId(req) || 'anonymous'}`;
        // Check cache if enabled
        if (this.config.enableCaching) {
            const cached = this.contextCache.get(cacheKey);
            if (cached && cached.expires > Date.now()) {
                return cached.context;
            }
        }
        // Create new context
        const userId = this.getUserId(req);
        const context = await this.config.tenantService.createTenantContext(tenantId, userId);
        // Cache if enabled
        if (this.config.enableCaching) {
            this.contextCache.set(cacheKey, {
                context,
                expires: Date.now() + (this.config.cacheTimeout * 1000)
            });
        }
        return context;
    }
    getUserId(req) {
        // Extract user ID from various sources
        // From JWT token
        const authHeader = req.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                return payload.sub || payload.user_id || payload.uid;
            }
            catch (error) {
                // Continue to next method
            }
        }
        // From custom header
        const userId = req.get('X-User-ID') || req.get('User-ID');
        if (userId) {
            return userId;
        }
        // From request object (if set by previous middleware)
        if (req.user?.id) {
            return req.user.id;
        }
        return undefined;
    }
    // Connection setup
    async setupIsolatedConnections(req, context) {
        try {
            // Setup isolated database connection
            const dbConnection = await this.config.isolationService.getIsolatedConnection(context);
            req.dbConnection = dbConnection;
            // Additional connection setups can be added here
            // - Cache connections
            // - Storage connections
            // - External service connections
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.logger.error('Failed to setup isolated connections', {
                tenantId: context.tenantId,
                error: errorMessage
            });
            throw error;
        }
    }
    // Logging
    async logTenantAccess(req, tenant) {
        try {
            await this.logger.info('Tenant access', {
                tenantId: tenant?.id || req.tenantId,
                tenantName: tenant?.name,
                method: req.method,
                url: req.url,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                userId: this.getUserId(req)
            });
        }
        catch (error) {
            // Don't throw on logging errors
        }
    }
    // Cache management
    clearCache(tenantId) {
        if (tenantId) {
            // Clear specific tenant cache
            for (const [key] of this.contextCache) {
                if (key.startsWith(`${tenantId}:`)) {
                    this.contextCache.delete(key);
                }
            }
        }
        else {
            // Clear all cache
            this.contextCache.clear();
        }
    }
    // Cache cleanup for expired entries
    cleanupExpiredCache() {
        const now = Date.now();
        for (const [key, cached] of this.contextCache) {
            if (cached.expires <= now) {
                this.contextCache.delete(key);
            }
        }
    }
}
// Utility functions for creating middleware instances
export function createTenantMiddleware(config) {
    return new TenantMiddleware(config);
}
export function createBasicTenantMiddleware(tenantService, isolationService, options = {}) {
    const defaultConfig = {
        tenantService,
        isolationService,
        strategies: options.strategies || [
            TenantResolutionStrategy.SUBDOMAIN,
            TenantResolutionStrategy.HEADER,
            TenantResolutionStrategy.JWT_CLAIM
        ],
        requireActiveTenant: options.requireActiveTenant ?? true,
        enableCaching: options.enableCaching ?? true,
        cacheTimeout: options.cacheTimeout ?? 300 // 5 minutes
    };
    return new TenantMiddleware(defaultConfig);
}
// Express middleware factory
export function tenantMiddleware(config) {
    const middleware = new TenantMiddleware(config);
    return middleware.middleware();
}
// Helper middleware for development/testing
export function createDevTenantMiddleware(tenantService, isolationService, defaultTenantId) {
    return async (req, res, next) => {
        // In development, use a default tenant if no tenant is resolved
        if (!req.tenantId && defaultTenantId) {
            const tenant = await tenantService.getTenant(defaultTenantId);
            if (tenant) {
                const context = await tenantService.createTenantContext(defaultTenantId);
                req.tenant = tenant;
                req.tenantContext = context;
                req.tenantId = defaultTenantId;
            }
        }
        next();
    };
}
//# sourceMappingURL=tenant-context.middleware.js.map