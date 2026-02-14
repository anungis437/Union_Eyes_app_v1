// CourtLens Tenant Service
// Core service for managing tenant lifecycle, provisioning, and configuration

import { v4 as uuidv4 } from 'uuid';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ILogger, SimpleLogger } from '../utils/logger';
import { logger } from '@/lib/logger';
import {
  Tenant,
  TenantStatus,
  TenantPlan,
  TenantSettings,
  TenantIsolation,
  TenantIsolationType,
  TenantResources,
  TenantBilling,
  TenantTemplate,
  TenantProvisioning,
  ProvisioningStatus,
  ProvisioningStep,
  TenantContext,
  TenantMetrics,
  TenantAlert,
  AlertType,
  AlertSeverity,
  AlertStatus
} from '../types';

export interface TenantServiceConfig {
  supabase: {
    url: string;
    serviceKey: string;
  };
  defaultIsolation: TenantIsolationType;
  resourceDefaults: Partial<TenantResources>;
  provisioningTimeout: number; // seconds
  enableMetrics: boolean;
  enableAlerts: boolean;
}

export class TenantService {
  private supabase: SupabaseClient;
  private logger: ILogger;
  private config: TenantServiceConfig;
  private tenantCache: Map<string, Tenant> = new Map();
  private contextCache: Map<string, TenantContext> = new Map();

  constructor(config: TenantServiceConfig) {
    this.config = config;
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.logger = new SimpleLogger('TenantService');
  }

  // Tenant CRUD Operations
  async createTenant(data: {
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
  }): Promise<Tenant> {
    try {
      // Validate domain uniqueness
      await this.validateDomainUniqueness(data.domain, data.subdomain);

      // Generate tenant ID
      const tenantId = uuidv4();

      // Apply template if specified
      const template = data.templateId ? await this.getTenantTemplate(data.templateId) : null;

      // Merge settings with template and defaults
      const settings = this.mergeSettings(data.settings, template?.settings);
      const isolation = this.mergeIsolation(data.isolation, template?.isolation);
      const resources = this.mergeResources(data.resources, template?.resources);

      // Create tenant record
      const tenant: Tenant = {
        id: tenantId,
        name: data.name,
        domain: data.domain,
        subdomain: data.subdomain,
        status: TenantStatus.PENDING_SETUP,
        plan: data.plan,
        settings,
        isolation,
        resources,
        billing: this.createDefaultBilling(data.plan),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: data.createdBy,
        parentTenantId: data.parentTenantId,
        childTenants: []
      };

      // Store tenant in database
      const { error } = await this.supabase
        .from('tenants')
        .insert(tenant);

      if (error) {
        throw new Error(`Failed to create tenant: ${error.message}`);
      }

      // Clear cache
      this.tenantCache.delete(tenantId);

      // Log tenant creation
      await this.logger.info('Tenant created', {
        tenantId,
        name: data.name,
        domain: data.domain,
        plan: data.plan,
        createdBy: data.createdBy
      });

      // Start provisioning process
      await this.startProvisioning(tenant, template);

      return tenant;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error('Failed to create tenant', {
        error: errorMessage,
        data
      });
      throw error;
    }
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      // Check cache first
      if (this.tenantCache.has(tenantId)) {
        return this.tenantCache.get(tenantId)!;
      }

      // Fetch from database
      const { data, error } = await this.supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch tenant: ${error.message}`);
      }

      // Cache and return
      const tenant = data as Tenant;
      this.tenantCache.set(tenantId, tenant);
      return tenant;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error('Failed to get tenant', {
        tenantId,
        error: errorMessage
      });
      throw error;
    }
  }

  async getTenantByDomain(domain: string, subdomain?: string): Promise<Tenant | null> {
    try {
      let query = this.supabase
        .from('tenants')
        .select('*')
        .eq('domain', domain);

      if (subdomain) {
        query = query.eq('subdomain', subdomain);
      } else {
        query = query.is('subdomain', null);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch tenant by domain: ${error.message}`);
      }

      const tenant = data as Tenant;
      this.tenantCache.set(tenant.id, tenant);
      return tenant;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error('Failed to get tenant by domain', {
        domain,
        subdomain,
        error: errorMessage
      });
      throw error;
    }
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    try {
      // Validate tenant exists
      const existingTenant = await this.getTenant(tenantId);
      if (!existingTenant) {
        throw new Error('Tenant not found');
      }

      // Prepare update object
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      // Update in database
      const { data, error } = await this.supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenantId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update tenant: ${error.message}`);
      }

      // Clear cache
      this.tenantCache.delete(tenantId);
      this.contextCache.clear(); // Clear all contexts as tenant data changed

      const updatedTenant = data as Tenant;

      await this.logger.info('Tenant updated', {
        tenantId,
        updates: Object.keys(updates)
      });

      return updatedTenant;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error('Failed to update tenant', {
        tenantId,
        error: errorMessage
      });
      throw error;
    }
  }

  async deleteTenant(tenantId: string, deleteData: boolean = false): Promise<void> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Check for child tenants
      if (tenant.childTenants && tenant.childTenants.length > 0) {
        throw new Error('Cannot delete tenant with child tenants');
      }

      // Archive tenant instead of hard delete
      if (!deleteData) {
        await this.updateTenant(tenantId, {
          status: TenantStatus.ARCHIVED
        });
        return;
      }

      // Hard delete - cleanup all tenant data
      await this.cleanupTenantData(tenant);

      // Delete tenant record
      const { error } = await this.supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);

      if (error) {
        throw new Error(`Failed to delete tenant: ${error.message}`);
      }

      // Clear caches
      this.tenantCache.delete(tenantId);
      this.contextCache.clear();

      await this.logger.info('Tenant deleted', {
        tenantId,
        hardDelete: deleteData
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error('Failed to delete tenant', {
        tenantId,
        error: errorMessage
      });
      throw error;
    }
  }

  // Tenant Context Management
  async createTenantContext(tenantId: string, userId?: string): Promise<TenantContext> {
    try {
      const contextKey = `${tenantId}:${userId || 'system'}`;

      // Check cache
      if (this.contextCache.has(contextKey)) {
        return this.contextCache.get(contextKey)!;
      }

      // Get tenant
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get user permissions if userId provided
      let user = undefined;
      let permissions: string[] = [];

      if (userId) {
        // Fetch user and permissions from RBAC service
        // This would integrate with the enterprise RBAC service
        user = await this.getUserInfo(userId, tenantId);
        permissions = await this.getUserPermissions(userId, tenantId);
      }

      const context: TenantContext = {
        tenantId,
        tenant,
        user,
        permissions,
        isolation: tenant.isolation,
        resourceLimits: tenant.resources
      };

      // Cache context
      this.contextCache.set(contextKey, context);

      return context;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error('Failed to create tenant context', {
        tenantId,
        userId,
        error: errorMessage
      });
      throw error;
    }
  }

  // Tenant Provisioning
  async startProvisioning(tenant: Tenant, template?: TenantTemplate | null): Promise<TenantProvisioning> {
    try {
      const provisioningId = uuidv4();
      
      // Define provisioning steps
      const steps = this.createProvisioningSteps(tenant, template);

      const provisioning: TenantProvisioning = {
        id: provisioningId,
        tenantId: tenant.id,
        templateId: template?.id,
        status: ProvisioningStatus.PENDING,
        steps,
        currentStep: 0,
        configuration: {
          tenant,
          template
        },
        resources: {
          created: [],
          failed: [],
          pending: steps.map(s => s.id)
        },
        startedAt: new Date(),
        estimatedCompletionAt: new Date(Date.now() + (this.config.provisioningTimeout * 1000)),
        errors: []
      };

      // Store provisioning record
      const { error } = await this.supabase
        .from('tenant_provisioning')
        .insert(provisioning);

      if (error) {
        throw new Error(`Failed to create provisioning record: ${error.message}`);
      }

      // Start provisioning process asynchronously
      this.executeProvisioning(provisioning).catch(error => {
        this.logger.error('Provisioning failed', {
          provisioningId,
          tenantId: tenant.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });

      return provisioning;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error('Failed to start provisioning', {
        tenantId: tenant.id,
        error: errorMessage
      });
      throw error;
    }
  }

  private async executeProvisioning(provisioning: TenantProvisioning): Promise<void> {
    try {
      // Update status to initializing
      await this.updateProvisioningStatus(provisioning.id, ProvisioningStatus.INITIALIZING);

      for (let i = 0; i < provisioning.steps.length; i++) {
        const step = provisioning.steps[i];
        
        try {
          // Update current step
          await this.updateProvisioningCurrentStep(provisioning.id, i);

          // Execute step
          await this.executeProvisioningStep(provisioning, step);

          // Mark step as completed
          await this.updateProvisioningStep(provisioning.id, step.id, {
            status: 'completed',
            completedAt: new Date()
          });

        } catch (error) {
          // Mark step as failed
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await this.updateProvisioningStep(provisioning.id, step.id, {
            status: 'failed',
            error: errorMessage
          });

          // Determine if we should continue or fail
          if (step.retryCount < step.maxRetries) {
            step.retryCount++;
            i--; // Retry the same step
            continue;
          }

          // Fail the entire provisioning
          await this.updateProvisioningStatus(provisioning.id, ProvisioningStatus.FAILED);
          throw error;
        }
      }

      // Update tenant status to active
      await this.updateTenant(provisioning.tenantId, {
        status: TenantStatus.ACTIVE
      });

      // Complete provisioning
      await this.updateProvisioningStatus(provisioning.id, ProvisioningStatus.COMPLETED);

    } catch (error) {
      await this.updateProvisioningStatus(provisioning.id, ProvisioningStatus.FAILED);
      throw error;
    }
  }

  // Helper Methods
  private async validateDomainUniqueness(domain: string, subdomain?: string): Promise<void> {
    const existing = await this.getTenantByDomain(domain, subdomain);
    if (existing) {
      throw new Error('Domain already exists');
    }
  }

  private mergeSettings(
    userSettings?: Partial<TenantSettings>,
    templateSettings?: Partial<TenantSettings>
  ): TenantSettings {
    const defaultSettings: TenantSettings = {
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#64748B'
      },
      features: {
        enabled: ['dashboard', 'documents', 'users'],
        disabled: [],
        limits: {
          users: 10,
          storage: 1024, // MB
          apiRequests: 1000
        }
      },
      security: {
        enforceSSO: false,
        allowedDomains: [],
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
          maxAge: 90,
          preventReuse: 5
        },
        sessionTimeout: 3600, // seconds
        enableAuditLogging: true
      },
      notifications: {
        email: true,
        sms: false,
        inApp: true,
        webhooks: []
      },
      integrations: {
        enabled: [],
        configurations: {}
      }
    };

    // Merge template settings first, then user settings
    return {
      ...defaultSettings,
      ...templateSettings,
      ...userSettings,
      branding: {
        ...defaultSettings.branding,
        ...templateSettings?.branding,
        ...userSettings?.branding
      },
      features: {
        ...defaultSettings.features,
        ...templateSettings?.features,
        ...userSettings?.features
      },
      security: {
        ...defaultSettings.security,
        ...templateSettings?.security,
        ...userSettings?.security,
        passwordPolicy: {
          ...defaultSettings.security.passwordPolicy,
          ...templateSettings?.security?.passwordPolicy,
          ...userSettings?.security?.passwordPolicy
        }
      },
      notifications: {
        ...defaultSettings.notifications,
        ...templateSettings?.notifications,
        ...userSettings?.notifications
      },
      integrations: {
        ...defaultSettings.integrations,
        ...templateSettings?.integrations,
        ...userSettings?.integrations
      }
    };
  }

  private mergeIsolation(
    userIsolation?: Partial<TenantIsolation>,
    templateIsolation?: Partial<TenantIsolation>
  ): TenantIsolation {
    const defaultIsolation: TenantIsolation = {
      type: this.config.defaultIsolation,
      databaseConfig: {
        tablePrefix: `tenant_${Date.now()}_`
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
    };

    return {
      ...defaultIsolation,
      ...templateIsolation,
      ...userIsolation
    };
  }

  private mergeResources(
    userResources?: Partial<TenantResources>,
    templateResources?: Partial<TenantResources>
  ): TenantResources {
    const defaultResources: TenantResources = {
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
    };

    return {
      ...defaultResources,
      ...this.config.resourceDefaults,
      ...templateResources,
      ...userResources
    };
  }

  private createDefaultBilling(plan: TenantPlan): TenantBilling {
    const planPricing = {
      [TenantPlan.STARTER]: 29,
      [TenantPlan.PROFESSIONAL]: 99,
      [TenantPlan.ENTERPRISE]: 299,
      [TenantPlan.CUSTOM]: 0
    };

    return {
      plan,
      billing: {
        frequency: 'monthly',
        amount: planPricing[plan],
        currency: 'USD',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentMethod: 'pending'
      },
      usage: {
        period: {
          start: new Date(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        metrics: {},
        overage: {}
      },
      credits: {
        available: 0,
        used: 0
      }
    };
  }

  private createProvisioningSteps(tenant: Tenant, template?: TenantTemplate | null): ProvisioningStep[] {
    return [
      {
        id: 'validate_config',
        name: 'Validate Configuration',
        description: 'Validate tenant configuration and settings',
        status: 'pending',
        dependencies: [],
        retryCount: 0,
        maxRetries: 3
      },
      {
        id: 'setup_database',
        name: 'Setup Database',
        description: 'Create database schema and tables',
        status: 'pending',
        dependencies: ['validate_config'],
        retryCount: 0,
        maxRetries: 3
      },
      {
        id: 'setup_storage',
        name: 'Setup Storage',
        description: 'Create storage buckets and configure access',
        status: 'pending',
        dependencies: ['validate_config'],
        retryCount: 0,
        maxRetries: 3
      },
      {
        id: 'setup_cache',
        name: 'Setup Cache',
        description: 'Configure cache namespaces and keys',
        status: 'pending',
        dependencies: ['validate_config'],
        retryCount: 0,
        maxRetries: 2
      },
      {
        id: 'apply_settings',
        name: 'Apply Settings',
        description: 'Apply tenant-specific settings and configurations',
        status: 'pending',
        dependencies: ['setup_database', 'setup_storage'],
        retryCount: 0,
        maxRetries: 3
      },
      {
        id: 'setup_monitoring',
        name: 'Setup Monitoring',
        description: 'Configure monitoring and alerting',
        status: 'pending',
        dependencies: ['apply_settings'],
        retryCount: 0,
        maxRetries: 2
      },
      {
        id: 'validate_deployment',
        name: 'Validate Deployment',
        description: 'Run validation tests and health checks',
        status: 'pending',
        dependencies: ['setup_monitoring'],
        retryCount: 0,
        maxRetries: 2
      }
    ];
  }

  private async executeProvisioningStep(provisioning: TenantProvisioning, step: ProvisioningStep): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.updateProvisioningStep(provisioning.id, step.id, {
        status: 'running',
        startedAt: new Date()
      });

      switch (step.id) {
        case 'validate_config':
          await this.validateTenantConfiguration(provisioning.configuration.tenant);
          break;
        case 'setup_database':
          await this.setupTenantDatabase(provisioning.configuration.tenant);
          break;
        case 'setup_storage':
          await this.setupTenantStorage(provisioning.configuration.tenant);
          break;
        case 'setup_cache':
          await this.setupTenantCache(provisioning.configuration.tenant);
          break;
        case 'apply_settings':
          await this.applyTenantSettings(provisioning.configuration.tenant);
          break;
        case 'setup_monitoring':
          await this.setupTenantMonitoring(provisioning.configuration.tenant);
          break;
        case 'validate_deployment':
          await this.validateTenantDeployment(provisioning.configuration.tenant);
          break;
        default:
          throw new Error(`Unknown provisioning step: ${step.id}`);
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      await this.updateProvisioningStep(provisioning.id, step.id, {
        duration
      });

    } catch (error) {
      throw error;
    }
  }

  // Provisioning step implementations (simplified)
  private async validateTenantConfiguration(tenant: Tenant): Promise<void> {
    // Validate tenant configuration
    if (!tenant.name || !tenant.domain) {
      throw new Error('Invalid tenant configuration');
    }
  }

  private async setupTenantDatabase(tenant: Tenant): Promise<void> {
    // Setup database based on isolation type
    // This would be implemented based on the specific database setup
  }

  private async setupTenantStorage(tenant: Tenant): Promise<void> {
    // Setup storage buckets and paths
    // This would integrate with your storage provider
  }

  private async setupTenantCache(tenant: Tenant): Promise<void> {
    // Setup cache configuration
    // This would integrate with Redis or other caching solution
  }

  private async applyTenantSettings(tenant: Tenant): Promise<void> {
    // Apply tenant-specific settings
    // This would configure various services based on tenant settings
  }

  private async setupTenantMonitoring(tenant: Tenant): Promise<void> {
    // Setup monitoring and alerting
    // This would configure monitoring dashboards and alerts
  }

  private async validateTenantDeployment(tenant: Tenant): Promise<void> {
    // Run validation tests
    // This would perform health checks and validation tests
  }

  // Helper methods for database operations
  private async updateProvisioningStatus(provisioningId: string, status: ProvisioningStatus): Promise<void> {
    await this.supabase
      .from('tenant_provisioning')
      .update({ 
        status,
        updatedAt: new Date()
      })
      .eq('id', provisioningId);
  }

  private async updateProvisioningCurrentStep(provisioningId: string, currentStep: number): Promise<void> {
    await this.supabase
      .from('tenant_provisioning')
      .update({ 
        currentStep,
        updatedAt: new Date()
      })
      .eq('id', provisioningId);
  }

  private async updateProvisioningStep(
    provisioningId: string, 
    stepId: string, 
    updates: Partial<ProvisioningStep>
  ): Promise<void> {
    // This would update the specific step in the steps array
    // Implementation depends on how you store the steps data
  }

  private async getTenantTemplate(templateId: string): Promise<TenantTemplate | null> {
    const { data, error } = await this.supabase
      .from('tenant_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      return null;
    }

    return data as TenantTemplate;
  }

  private async getUserInfo(userId: string, tenantId: string): Promise<any> {
    // This would integrate with your user management system
    // Return user information for the tenant context
    return {
      id: userId,
      email: 'user@example.com',
      roles: ['user']
    };
  }

  private async getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
    // This would integrate with the enterprise RBAC service
    // Return user permissions for the tenant context
    return ['read', 'write'];
  }

  private async cleanupTenantData(tenant: Tenant): Promise<void> {
    // Cleanup all tenant-specific data
    // This would remove data from various services and storage
  }
}
