import { Tenant, TenantPlan, TenantSettings, TenantIsolation, TenantIsolationType, TenantResources, TenantTemplate, TenantProvisioning, TenantContext } from '../types';
export interface TenantServiceConfig {
    supabase: {
        url: string;
        serviceKey: string;
    };
    defaultIsolation: TenantIsolationType;
    resourceDefaults: Partial<TenantResources>;
    provisioningTimeout: number;
    enableMetrics: boolean;
    enableAlerts: boolean;
}
export declare class TenantService {
    private supabase;
    private logger;
    private config;
    private tenantCache;
    private contextCache;
    constructor(config: TenantServiceConfig);
    createTenant(data: {
        name: string;
        domain: string;
        subdomain?: string;
        plan: TenantPlan;
        settings?: Partial<TenantSettings>;
        isolation?: Partial<TenantIsolation>;
        resources?: Partial<TenantResources>;
        createdBy: string;
        templateId?: string;
        parentTenantId?: string;
    }): Promise<Tenant>;
    getTenant(tenantId: string): Promise<Tenant | null>;
    getTenantByDomain(domain: string, subdomain?: string): Promise<Tenant | null>;
    updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant>;
    deleteTenant(tenantId: string, deleteData?: boolean): Promise<void>;
    createTenantContext(tenantId: string, userId?: string): Promise<TenantContext>;
    startProvisioning(tenant: Tenant, template?: TenantTemplate | null): Promise<TenantProvisioning>;
    private executeProvisioning;
    private validateDomainUniqueness;
    private mergeSettings;
    private mergeIsolation;
    private mergeResources;
    private createDefaultBilling;
    private createProvisioningSteps;
    private executeProvisioningStep;
    private validateTenantConfiguration;
    private setupTenantDatabase;
    private setupTenantStorage;
    private setupTenantCache;
    private applyTenantSettings;
    private setupTenantMonitoring;
    private validateTenantDeployment;
    private updateProvisioningStatus;
    private updateProvisioningCurrentStep;
    private updateProvisioningStep;
    private getTenantTemplate;
    private getUserInfo;
    private getUserPermissions;
    private cleanupTenantData;
}
//# sourceMappingURL=tenant.service.d.ts.map