// CourtLens Multi-Tenant Types
// Comprehensive type definitions for multi-tenant architecture

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  subdomain?: string;
  status: TenantStatus;
  plan: TenantPlan;
  settings: TenantSettings;
  isolation: TenantIsolation;
  resources: TenantResources;
  billing: TenantBilling;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  parentTenantId?: string; // For hierarchical tenancy
  childTenants?: string[]; // Child tenant IDs
}

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_SETUP = 'pending_setup',
  MIGRATING = 'migrating',
  ARCHIVED = 'archived'
}

export enum TenantPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom'
}

export interface TenantSettings {
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    customCss?: string;
  };
  features: {
    enabled: string[];
    disabled: string[];
    limits: Record<string, number>;
  };
  security: {
    enforceSSO: boolean;
    allowedDomains: string[];
    passwordPolicy: PasswordPolicy;
    sessionTimeout: number;
    enableAuditLogging: boolean;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
    webhooks: WebhookConfig[];
  };
  integrations: {
    enabled: string[];
    configurations: Record<string, any>;
  };
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  preventReuse: number; // number of previous passwords
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
}

export enum TenantIsolationType {
  SHARED_DATABASE = 'shared_database',
  SEPARATE_SCHEMA = 'separate_schema',
  SEPARATE_DATABASE = 'separate_database',
  HYBRID = 'hybrid'
}

export interface TenantIsolation {
  type: TenantIsolationType;
  databaseConfig: {
    connectionString?: string;
    schema?: string;
    tablePrefix?: string;
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
  networkConfig: {
    allowedIps?: string[];
    vpnRequired?: boolean;
    privateNetwork?: boolean;
  };
}

export interface TenantResources {
  storage: {
    allocated: number; // GB
    used: number; // GB
    limit: number; // GB
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
    cpuUsage: number; // percentage
    memoryUsage: number; // MB
    limit: ComputeLimit;
  };
}

export interface ComputeLimit {
  cpu: number; // percentage
  memory: number; // MB
  storage: number; // GB
}

export interface TenantBilling {
  plan: TenantPlan;
  billing: {
    frequency: 'monthly' | 'yearly';
    amount: number;
    currency: string;
    nextBillingDate: Date;
    paymentMethod: string;
  };
  usage: {
    period: {
      start: Date;
      end: Date;
    };
    metrics: Record<string, number>;
    overage: Record<string, number>;
  };
  credits: {
    available: number;
    used: number;
    expires?: Date;
  };
}

export interface TenantContext {
  tenantId: string;
  tenant: Tenant;
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
  permissions: string[];
  isolation: TenantIsolation;
  resourceLimits: TenantResources;
}

export interface TenantMigration {
  id: string;
  tenantId: string;
  type: MigrationType;
  source: MigrationSource;
  target: MigrationTarget;
  status: MigrationStatus;
  progress: {
    percentage: number;
    currentStep: string;
    totalSteps: number;
    completedSteps: number;
  };
  data: {
    estimatedSize: number; // bytes
    transferredSize: number; // bytes
    recordCount: number;
    failedRecords: number;
  };
  timeline: {
    startedAt: Date;
    estimatedCompletionAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
  };
  errors: MigrationError[];
  rollback?: {
    available: boolean;
    steps: string[];
    data: any;
  };
}

export enum MigrationType {
  TENANT_UPGRADE = 'tenant_upgrade',
  TENANT_DOWNGRADE = 'tenant_downgrade',
  ISOLATION_CHANGE = 'isolation_change',
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  TENANT_MERGE = 'tenant_merge',
  TENANT_SPLIT = 'tenant_split'
}

export interface MigrationSource {
  type: string;
  config: Record<string, any>;
  isolation: TenantIsolationType;
}

export interface MigrationTarget {
  type: string;
  config: Record<string, any>;
  isolation: TenantIsolationType;
}

export enum MigrationStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  ROLLING_BACK = 'rolling_back',
  ROLLED_BACK = 'rolled_back'
}

export interface MigrationError {
  timestamp: Date;
  step: string;
  error: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TenantTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  settings: Partial<TenantSettings>;
  resources: Partial<TenantResources>;
  isolation: Partial<TenantIsolation>;
  features: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantProvisioning {
  id: string;
  tenantId: string;
  templateId?: string;
  status: ProvisioningStatus;
  steps: ProvisioningStep[];
  currentStep: number;
  configuration: any;
  resources: {
    created: string[];
    failed: string[];
    pending: string[];
  };
  startedAt: Date;
  estimatedCompletionAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  errors: ProvisioningError[];
}

export enum ProvisioningStatus {
  PENDING = 'pending',
  INITIALIZING = 'initializing',
  CREATING_RESOURCES = 'creating_resources',
  CONFIGURING = 'configuring',
  TESTING = 'testing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CLEANUP = 'cleanup'
}

export interface ProvisioningStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // seconds
  result?: any;
  error?: string;
  dependencies: string[];
  retryCount: number;
  maxRetries: number;
}

export interface ProvisioningError {
  timestamp: Date;
  step: string;
  error: string;
  details: Record<string, any>;
  recoverable: boolean;
  suggestions: string[];
}

export interface TenantMetrics {
  tenantId: string;
  timestamp: Date;
  metrics: {
    users: {
      active: number;
      total: number;
      sessions: number;
    };
    resources: {
      storage: {
        used: number;
        percentage: number;
      };
      database: {
        connections: number;
        queries: number;
        responseTime: number;
      };
      api: {
        requests: number;
        errors: number;
        responseTime: number;
      };
      compute: {
        cpu: number;
        memory: number;
        uptime: number;
      };
    };
    business: {
      revenue: number;
      transactions: number;
      documents: number;
      cases: number;
    };
    performance: {
      availability: number;
      responseTime: number;
      errorRate: number;
    };
  };
}

export interface TenantAlert {
  id: string;
  tenantId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string;
  data: Record<string, any>;
  status: AlertStatus;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  notifications: {
    email: boolean;
    sms: boolean;
    webhook: boolean;
    dashboard: boolean;
  };
}

export enum AlertType {
  RESOURCE_LIMIT = 'resource_limit',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  BILLING = 'billing',
  MAINTENANCE = 'maintenance',
  SYSTEM = 'system',
  CUSTOM = 'custom'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

export interface TenantEvent {
  id: string;
  tenantId: string;
  type: string;
  category: EventCategory;
  data: Record<string, any>;
  source: {
    service: string;
    version: string;
    instanceId: string;
  };
  metadata: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    correlationId?: string;
  };
  timestamp: Date;
}

export enum EventCategory {
  USER_ACTION = 'user_action',
  SYSTEM_EVENT = 'system_event',
  SECURITY_EVENT = 'security_event',
  BILLING_EVENT = 'billing_event',
  RESOURCE_EVENT = 'resource_event',
  INTEGRATION_EVENT = 'integration_event'
}
