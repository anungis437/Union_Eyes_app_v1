import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenant.service';
import { TenantIsolationService } from '../services/tenant-isolation.service';
import { Tenant, TenantContext } from '../types';
export interface TenantMiddlewareConfig {
    tenantService: TenantService;
    isolationService: TenantIsolationService;
    strategies: TenantResolutionStrategy[];
    requireActiveTenant: boolean;
    enableCaching: boolean;
    cacheTimeout: number;
}
export declare enum TenantResolutionStrategy {
    SUBDOMAIN = "subdomain",
    DOMAIN = "domain",
    HEADER = "header",
    JWT_CLAIM = "jwt_claim",
    QUERY_PARAM = "query_param",
    PATH_PARAM = "path_param"
}
export interface TenantRequest extends Request {
    tenant?: Tenant;
    tenantContext?: TenantContext;
    tenantId?: string;
}
export declare class TenantMiddleware {
    private logger;
    private config;
    private contextCache;
    constructor(config: TenantMiddlewareConfig);
    middleware(): (req: TenantRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    private resolveTenant;
    private resolveByStrategy;
    private resolveBySubdomain;
    private resolveByDomain;
    private resolveByHeader;
    private resolveByJwtClaim;
    private resolveByQueryParam;
    private resolveByPathParam;
    private getTenantContext;
    private getUserId;
    private setupIsolatedConnections;
    private logTenantAccess;
    clearCache(tenantId?: string): void;
    cleanupExpiredCache(): void;
}
export declare function createTenantMiddleware(config: TenantMiddlewareConfig): TenantMiddleware;
export declare function createBasicTenantMiddleware(tenantService: TenantService, isolationService: TenantIsolationService, options?: {
    strategies?: TenantResolutionStrategy[];
    requireActiveTenant?: boolean;
    enableCaching?: boolean;
    cacheTimeout?: number;
}): TenantMiddleware;
export declare function tenantMiddleware(config: TenantMiddlewareConfig): (req: TenantRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare function createDevTenantMiddleware(tenantService: TenantService, isolationService: TenantIsolationService, defaultTenantId?: string): (req: TenantRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=tenant-context.middleware.d.ts.map