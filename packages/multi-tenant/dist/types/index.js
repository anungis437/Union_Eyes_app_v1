// CourtLens Multi-Tenant Types
// Comprehensive type definitions for multi-tenant architecture
export var TenantStatus;
(function (TenantStatus) {
    TenantStatus["ACTIVE"] = "active";
    TenantStatus["INACTIVE"] = "inactive";
    TenantStatus["SUSPENDED"] = "suspended";
    TenantStatus["PENDING_SETUP"] = "pending_setup";
    TenantStatus["MIGRATING"] = "migrating";
    TenantStatus["ARCHIVED"] = "archived";
})(TenantStatus || (TenantStatus = {}));
export var TenantPlan;
(function (TenantPlan) {
    TenantPlan["STARTER"] = "starter";
    TenantPlan["PROFESSIONAL"] = "professional";
    TenantPlan["ENTERPRISE"] = "enterprise";
    TenantPlan["CUSTOM"] = "custom";
})(TenantPlan || (TenantPlan = {}));
export var TenantIsolationType;
(function (TenantIsolationType) {
    TenantIsolationType["SHARED_DATABASE"] = "shared_database";
    TenantIsolationType["SEPARATE_SCHEMA"] = "separate_schema";
    TenantIsolationType["SEPARATE_DATABASE"] = "separate_database";
    TenantIsolationType["HYBRID"] = "hybrid";
})(TenantIsolationType || (TenantIsolationType = {}));
export var MigrationType;
(function (MigrationType) {
    MigrationType["TENANT_UPGRADE"] = "tenant_upgrade";
    MigrationType["TENANT_DOWNGRADE"] = "tenant_downgrade";
    MigrationType["ISOLATION_CHANGE"] = "isolation_change";
    MigrationType["DATA_EXPORT"] = "data_export";
    MigrationType["DATA_IMPORT"] = "data_import";
    MigrationType["TENANT_MERGE"] = "tenant_merge";
    MigrationType["TENANT_SPLIT"] = "tenant_split";
})(MigrationType || (MigrationType = {}));
export var MigrationStatus;
(function (MigrationStatus) {
    MigrationStatus["PENDING"] = "pending";
    MigrationStatus["PREPARING"] = "preparing";
    MigrationStatus["IN_PROGRESS"] = "in_progress";
    MigrationStatus["COMPLETED"] = "completed";
    MigrationStatus["FAILED"] = "failed";
    MigrationStatus["CANCELLED"] = "cancelled";
    MigrationStatus["ROLLING_BACK"] = "rolling_back";
    MigrationStatus["ROLLED_BACK"] = "rolled_back";
})(MigrationStatus || (MigrationStatus = {}));
export var ProvisioningStatus;
(function (ProvisioningStatus) {
    ProvisioningStatus["PENDING"] = "pending";
    ProvisioningStatus["INITIALIZING"] = "initializing";
    ProvisioningStatus["CREATING_RESOURCES"] = "creating_resources";
    ProvisioningStatus["CONFIGURING"] = "configuring";
    ProvisioningStatus["TESTING"] = "testing";
    ProvisioningStatus["COMPLETED"] = "completed";
    ProvisioningStatus["FAILED"] = "failed";
    ProvisioningStatus["CLEANUP"] = "cleanup";
})(ProvisioningStatus || (ProvisioningStatus = {}));
export var AlertType;
(function (AlertType) {
    AlertType["RESOURCE_LIMIT"] = "resource_limit";
    AlertType["PERFORMANCE"] = "performance";
    AlertType["SECURITY"] = "security";
    AlertType["BILLING"] = "billing";
    AlertType["MAINTENANCE"] = "maintenance";
    AlertType["SYSTEM"] = "system";
    AlertType["CUSTOM"] = "custom";
})(AlertType || (AlertType = {}));
export var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["INFO"] = "info";
    AlertSeverity["WARNING"] = "warning";
    AlertSeverity["ERROR"] = "error";
    AlertSeverity["CRITICAL"] = "critical";
})(AlertSeverity || (AlertSeverity = {}));
export var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "active";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["DISMISSED"] = "dismissed";
})(AlertStatus || (AlertStatus = {}));
export var EventCategory;
(function (EventCategory) {
    EventCategory["USER_ACTION"] = "user_action";
    EventCategory["SYSTEM_EVENT"] = "system_event";
    EventCategory["SECURITY_EVENT"] = "security_event";
    EventCategory["BILLING_EVENT"] = "billing_event";
    EventCategory["RESOURCE_EVENT"] = "resource_event";
    EventCategory["INTEGRATION_EVENT"] = "integration_event";
})(EventCategory || (EventCategory = {}));
//# sourceMappingURL=index.js.map