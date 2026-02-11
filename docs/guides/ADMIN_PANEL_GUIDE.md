# Admin Panel - Complete Guide

## Overview

The UnionEyes Admin Panel is a world-class administrative interface that provides complete control over the multi-tenant platform. Built with Next.js 14, TypeScript, and Tailwind CSS, it offers real-time monitoring, user management, and system administration capabilities.

## Features

### 🎯 Core Functionality

- **Real-time Statistics Dashboard** - Monitor system health, active users, storage usage
- **Multi-tenant Management** - Create, update, and manage organizations
- **User Administration** - Full CRUD operations for user management across tenants
- **Role-based Access Control** - Admin, Steward, Officer, and Member roles
- **System Settings** - Configure application-wide settings
- **Database Management** - Health monitoring and optimization tools
- **Activity Logging** - Track all administrative actions
- **Search & Filtering** - Advanced search across users and organizations

### 🔒 Security Features

- Clerk-based authentication
- Role verification middleware
- Audit logging for all administrative actions
- Soft-delete for data safety
- Rate limiting (ready for implementation)

### 📊 Analytics

- Total member count across all tenants
- Active user tracking (daily, weekly, monthly)
- Storage usage per tenant
- System-wide health metrics
- Connection pool monitoring

## Architecture

### Frontend (`/app/[locale]/dashboard/admin/page.tsx`)

- **State Management**: React hooks (useState, useEffect)
- **Data Fetching**: Native fetch API with error handling
- **UI Components**: Custom components + shadcn/ui
- **Animations**: Framer Motion for smooth transitions
- **Notifications**: Sonner for toast messages

### Backend API Routes

#### Statistics

- `GET /api/admin/stats/overview` - System-wide statistics
- `GET /api/admin/stats/activity` - Recent activity feed

#### User Management

- `GET /api/admin/users` - List all users with filtering
- `POST /api/admin/users` - Add user to tenant
- `GET /api/admin/users/[userId]` - Get user details
- `PUT /api/admin/users/[userId]` - Update user role/status
- `DELETE /api/admin/users/[userId]` - Remove user from tenant

#### Organization Management

- `GET /api/admin/organizations` - List organizations with stats
- `POST /api/admin/organizations` - Create new organization
- `GET /api/admin/organizations/[tenantId]` - Get org details
- `PUT /api/admin/organizations/[tenantId]` - Update organization
- `DELETE /api/admin/organizations/[tenantId]` - Archive organization

#### System Management

- `GET /api/admin/system/settings` - Get system configurations
- `PUT /api/admin/system/settings` - Update configuration
- `POST /api/admin/system/cache` - Clear application cache

#### Database Management

- `GET /api/admin/database/health` - Database health metrics
- `POST /api/admin/database/optimize` - Run database optimization

### Server Actions (`/actions/admin-actions.ts`)

Reusable server-side functions for:

- `getSystemStats()` - Aggregate system statistics
- `getAdminUsers()` - Query users with filtering
- `getAdminTenants()` - Query organizations with stats
- `createTenant()` - Create new organization
- `updateTenant()` - Update organization details
- `getRecentActivity()` - Fetch activity logs
- `getSystemConfigs()` - Retrieve system settings
- `updateSystemConfig()` - Update configuration values

## Getting Started

### Prerequisites

1. Admin role in Clerk
2. Database access (PostgreSQL)
3. Environment variables configured

### Setup Admin Access

#### Option 1: Via Database (Quick)

```powershell
# Connect to database
$env:PGPASSWORD='your-password'
psql -h your-host -U your-user -d your-db -f scripts/grant-super-admin.sql
```

#### Option 2: Via API (Recommended)

```typescript
// Use the user management API to assign admin role
POST /api/admin/users
{
  "userId": "user_xxx",
  "tenantId": "tenant_xxx",
  "role": "admin"
}
```

### Running the Admin Panel

1. **Start the development server**

   ```powershell
   pnpm dev
   ```

2. **Navigate to admin panel**

   ```
   http://localhost:3000/dashboard/admin
   ```

3. **Login with admin credentials**

## Testing

### Manual Testing

Use the provided PowerShell script to test all admin endpoints:

```powershell
.\scripts\test-admin-api.ps1
```

This script tests:

- ✅ All GET endpoints
- ✅ Organization creation
- ✅ Cache clearing
- ✅ Database optimization
- ✅ Error handling

### Unit Testing

```powershell
# Run admin-specific tests
pnpm test __tests__/admin/*.test.ts
```

## API Documentation

See [ADMIN_API.md](./ADMIN_API.md) for complete API documentation including:

- Request/response formats
- Authentication requirements
- Error codes
- Example payloads

## Usage Guide

### Managing Users

#### View All Users

1. Navigate to "User Management" section
2. Use search bar to filter by name, email, or role
3. View user details in table format

#### Add User to Tenant

```typescript
// API call
POST /api/admin/users
{
  "userId": "user_xxx",
  "tenantId": "tenant_xxx",
  "role": "member"
}
```

#### Update User Role

1. Click edit icon next to user
2. Select new role from dropdown
3. Confirm changes

#### Remove User

1. Click delete icon next to user
2. Confirm removal action
3. User is soft-deleted from tenant

### Managing Organizations

#### Create New Organization

1. Navigate to "Local Sections" tab
2. Click "Add Local" button
3. Fill in required fields:
   - Tenant Slug (URL-safe, lowercase)
   - Organization Name
   - Contact Email
   - Phone (optional)
   - Subscription Tier
4. Submit form

#### Update Organization

1. Click edit icon on organization card
2. Modify fields as needed
3. Save changes

#### View Organization Details

- Total members
- Active members
- Storage usage
- Subscription status

### System Administration

#### Clear Cache

1. Navigate to "System Settings"
2. Click "Clear Cache" button
3. Confirm action
4. Cache is cleared across all tenants

#### Optimize Database

1. Navigate to "System Settings"
2. Click "Optimize" under Database section
3. Confirm action
4. ANALYZE command runs on database

#### View Database Health

- Connection pool status
- Database size
- Largest tables
- Active queries

## Performance Considerations

### Optimization Techniques

1. **Pagination**: All list endpoints support pagination
2. **Debounced Search**: 500ms debounce on search queries
3. **Lazy Loading**: Components load data on-demand
4. **Caching**: Server-side caching with revalidation
5. **Indexes**: Database indexes on frequently queried columns

### Best Practices

- Use search filters to reduce data transfer
- Schedule database optimization during off-peak hours
- Monitor activity logs regularly
- Review user access periodically

## Security Best Practices

### Access Control

The admin panel implements multiple layers of security to ensure only authorized personnel can access administrative functions:

- ✅ **Admin role required for all endpoints** - Every API route validates admin role using Clerk authentication
- ✅ **Tenant isolation enforced** - All queries filter by tenant ID to prevent cross-organization data access
- ✅ **User actions logged** - Comprehensive audit trail captures all administrative operations
- ✅ **Soft deletes prevent data loss** - Organizations and users are marked as deleted rather than removed
- ✅ **Session-based authentication** - Clerk provides secure session management with automatic token refresh
- ✅ **CSRF protection** - Next.js App Router provides built-in CSRF protection for mutations

#### Role Hierarchy

1. **Admin** - Full system access, user management, organization creation
2. **Steward** - Local section management, grievance oversight
3. **Officer** - Case management, member support
4. **Member** - Basic access to own claims and resources

### Audit & Security Logging

#### Audit Logs Schema (`audit_security.audit_logs`)

Comprehensive tracking of all system activities with the following fields:

```typescript
{
  auditId: uuid,              // Unique audit entry ID
  tenantId: uuid,             // Organization context
  userId: uuid,               // Actor who performed action
  action: string,             // Action type (create, update, delete, view)
  resourceType: string,       // Type of resource affected
  resourceId: uuid,           // Specific resource identifier
  oldValues: jsonb,           // Previous state (for updates)
  newValues: jsonb,           // New state after change
  ipAddress: string,          // IPv4/IPv6 address
  userAgent: string,          // Browser/client information
  sessionId: uuid,            // Session identifier
  correlationId: uuid,        // Request tracing ID
  severity: string,           // debug, info, warning, error, critical
  outcome: string,            // success, failure, error
  errorMessage: string,       // Error details if failed
  metadata: jsonb,            // Additional context
  createdAt: timestamp        // When action occurred
}
```

#### Security Events Schema (`audit_security.security_events`)

Tracks security-specific events for threat detection:

```typescript
{
  eventId: uuid,              // Unique event ID
  tenantId: uuid,             // Organization context
  userId: uuid,               // User involved (may be attacker)
  eventType: string,          // Type of security event
  eventCategory: string,      // authentication, authorization, data_access, configuration, suspicious
  severity: string,           // low, medium, high, critical
  description: string,        // Human-readable description
  sourceIp: string,           // Source IP address
  userAgent: string,          // Client information
  additionalData: jsonb,      // Event-specific data
  riskScore: integer,         // 0-100 risk assessment
  isResolved: boolean,        // Whether event has been reviewed
  resolvedAt: timestamp,      // When resolved
  resolvedBy: uuid,           // Admin who resolved
  resolutionNotes: string,    // Notes on resolution
  createdAt: timestamp        // Event time
}
```

#### Failed Login Tracking (`audit_security.failed_login_attempts`)

Brute force detection and suspicious login monitoring:

- Tracks failed login attempts by email and IP address
- Automatic cleanup of attempts older than 30 days
- Can trigger account lockouts or rate limiting
- Helps identify credential stuffing attacks

```sql
-- Example: Check failed login attempts for suspicious activity
SELECT email, ip_address, COUNT(*) as attempts, 
       MAX(attempted_at) as last_attempt
FROM audit_security.failed_login_attempts
WHERE attempted_at > NOW() - INTERVAL '1 hour'
GROUP BY email, ip_address
HAVING COUNT(*) > 5;
```

#### Rate Limiting Events (`audit_security.rate_limit_events`)

API rate limiting enforcement and monitoring:

- Tracks API usage by IP, user ID, or API key
- Monitors request counts within time windows
- Identifies abuse patterns and DDoS attempts
- Supports per-endpoint rate limits

### Logging Infrastructure

#### Structured Logging with Correlation IDs

The application uses a production-grade structured logger (`lib/logger.ts`) with:

- **Correlation ID tracking** - Traces requests across microservices and async operations
- **Sensitive data redaction** - Automatically redacts passwords, tokens, emails, credit cards
- **Sentry integration** - Error-level logs automatically sent to Sentry for alerting
- **Performance monitoring** - Built-in timing utilities to track slow operations
- **Environment-aware output** - JSON in production, human-readable in development

```typescript
// Example usage
logger.info("Admin action performed", {
  adminId: userId,
  action: "create_tenant",
  tenantId: newTenantId
});

logger.error("Failed to update user", error, {
  userId: targetUserId,
  attemptedRole: newRole
});

// Performance timing
const endTimer = logger.time("Database query");
await db.select()...
endTimer(); // Automatically logs duration
```

#### Log Levels

- **DEBUG** - Detailed diagnostic information (development only)
- **INFO** - Informational messages about normal operations
- **WARN** - Warning messages for potentially harmful situations
- **ERROR** - Error messages for failures requiring attention

### Data Protection

#### At Rest

- **Database encryption** - Azure PostgreSQL provides encryption at rest
- **Soft deletes** - Deleted records retained for audit and recovery purposes
- **Sensitive field encryption** - Configurations marked `isEncrypted: true` are stored encrypted
- **Backup retention** - Automated daily backups with 30-day retention

#### In Transit

- **HTTPS everywhere** - All traffic encrypted with TLS 1.3
- **Secure headers** - Next.js middleware adds security headers (HSTS, CSP, X-Frame-Options)
- **API authentication** - Clerk tokens validated on every request
- **Cookie security** - HttpOnly, Secure, SameSite=Strict flags on session cookies

#### Access Controls

- **Role-based access control (RBAC)** - Permissions enforced at database and API levels
- **Tenant isolation** - RLS (Row Level Security) policies prevent cross-tenant access
- **API authorization** - Every endpoint validates user role and tenant membership
- **Session expiration** - Clerk sessions expire after 7 days of inactivity

### Security Best Practices for Admins

#### Regular Security Audits

1. **Review security events weekly**

   ```sql
   SELECT event_type, severity, COUNT(*) as count
   FROM audit_security.security_events
   WHERE created_at > NOW() - INTERVAL '7 days'
     AND is_resolved = false
   GROUP BY event_type, severity
   ORDER BY count DESC;
   ```

2. **Monitor failed login attempts**
   - Set up alerts for > 10 failed attempts from same IP in 1 hour
   - Review patterns for credential stuffing or brute force attacks

3. **Check for unusual admin actions**
   - Bulk deletions or role changes
   - Off-hours administrative access
   - Actions from unexpected IP addresses

#### Incident Response

If suspicious activity is detected:

1. **Immediately revoke compromised sessions** via Clerk dashboard
2. **Document the incident** in security_events with high severity
3. **Review audit logs** for timeline and scope of breach
4. **Notify affected tenants** if data exposure occurred
5. **Update security measures** to prevent recurrence

#### Compliance Considerations

- **GDPR** - Audit logs contain PII, ensure proper data retention policies
- **SOC 2** - Audit trail provides evidence of access controls
- **PIPEDA** (Canada) - Personal information access logged and monitored
- **Data residency** - Azure PostgreSQL region can be configured for compliance

## Troubleshooting

### Common Issues

#### "Admin access required" error

**Solution**: Verify admin role in database

```sql
SELECT role FROM organization_users WHERE user_id = 'your_user_id';
```

#### Stats not loading

**Solution**: Check database connection and query permissions

```powershell
# Test database connection
$env:PGPASSWORD='password'
psql -h host -U user -d database -c "SELECT 1;"
```

#### Cache clear not working

**Solution**: Verify Next.js cache directory permissions

```powershell
# Clear .next cache manually
Remove-Item -Path ".next\cache" -Recurse -Force
```

## Reports & Analytics

The UnionEyes platform includes a comprehensive reporting system that allows users to create, execute, and share custom reports across various data sources.

### Report Types

#### Available Report Categories

1. **Claims Reports** - Analyze grievance patterns, resolution times, success rates
2. **Member Reports** - Track membership statistics, demographics, engagement
3. **Financial Reports** - Monitor subscription revenue, credit usage, storage costs
4. **Activity Reports** - User activity, system usage, peak times
5. **Compliance Reports** - Audit trails, security events, data access logs
6. **Custom Reports** - Build reports using SQL query builder

### Report API Endpoints

#### List Reports

```
GET /api/reports
Headers: x-tenant-id, x-user-id
Response: { reports: Report[] }
```

#### Create Report

```
POST /api/reports
Headers: x-tenant-id, x-user-id
Body: {
  name: string,
  description: string,
  reportType: string,
  category: string,
  config: object,
  isPublic: boolean,
  isTemplate: boolean,
  templateId?: uuid
}
```

#### Execute Report

```
POST /api/reports/execute
Body: { reportId: uuid, parameters: object }
```

#### Get Report Templates

```
GET /api/reports/templates
Response: { templates: ReportTemplate[] }
```

### Report Builder

The report builder provides a visual interface for constructing reports without writing SQL:

#### Features

- **Drag-and-drop interface** - Select tables, columns, and relationships visually
- **Filter builder** - Add WHERE clauses with dropdown operators
- **Aggregation functions** - COUNT, SUM, AVG, MIN, MAX, GROUP BY
- **Sorting & pagination** - Order results and limit row counts
- **Export options** - CSV, PDF, Excel formats
- **Scheduled reports** - Automatic generation and email delivery

#### Data Sources

Available data sources for reporting:

- `tenants` - Organization details and settings
- `organization_users` - User membership and roles
- `tenant_usage` - Storage and resource consumption
- `claims` - Grievance and claim data
- `audit_logs` - System activity logs
- `security_events` - Security-related events
- `notifications` - Communication history

### Report Configuration Schema

```typescript
interface ReportConfig {
  dataSource: string;           // Primary table or view
  columns: string[];            // Columns to include
  joins?: {
    table: string;
    on: string;                 // Join condition
    type: 'inner' | 'left';
  }[];
  filters?: {
    column: string;
    operator: string;           // =, !=, >, <, LIKE, IN, etc.
    value: any;
  }[];
  groupBy?: string[];
  orderBy?: {
    column: string;
    direction: 'asc' | 'desc';
  }[];
  limit?: number;
  parameters?: {
    name: string;
    type: string;               // text, number, date, boolean
    defaultValue?: any;
  }[];
}
```

### Example Reports

#### Active Users by Tenant (Last 30 Days)

```json
{
  "name": "Active Users Report",
  "reportType": "user_activity",
  "category": "activity",
  "config": {
    "dataSource": "organization_users",
    "columns": ["tenantId", "COUNT(*) as activeUsers"],
    "joins": [{
      "table": "tenants",
      "on": "tenants.tenantId = organization_users.tenantId",
      "type": "inner"
    }],
    "filters": [{
      "column": "lastAccessAt",
      "operator": ">",
      "value": "NOW() - INTERVAL '30 days'"
    }],
    "groupBy": ["tenantId"],
    "orderBy": [{ "column": "activeUsers", "direction": "desc" }]
  }
}
```

#### Storage Usage Trend

```json
{
  "name": "Storage Growth Trend",
  "reportType": "storage_usage",
  "category": "financial",
  "config": {
    "dataSource": "tenant_usage",
    "columns": [
      "DATE_TRUNC('month', periodEnd) as month",
      "SUM(storageUsedGb) as totalStorage"
    ],
    "filters": [{
      "column": "periodEnd",
      "operator": ">",
      "value": "NOW() - INTERVAL '12 months'"
    }],
    "groupBy": ["month"],
    "orderBy": [{ "column": "month", "direction": "asc" }]
  }
}
```

### Report Sharing & Permissions

#### Visibility Levels

- **Private** - Only report creator can view/edit
- **Public** - All users in tenant can view
- **Shared** - Specific users/roles can access
- **Template** - Available as starting point for new reports

#### Permission Matrix

| Role | Create | View Own | View Public | View All | Edit | Delete |
|------|--------|----------|-------------|----------|------|--------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Steward | ✅ | ✅ | ✅ | ❌ | Own only | Own only |
| Officer | ✅ | ✅ | ✅ | ❌ | Own only | Own only |
| Member | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Scheduled Reports

Configure automatic report generation and delivery:

```typescript
interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number;        // 0-6 for weekly
  dayOfMonth?: number;       // 1-31 for monthly
  time: string;              // HH:MM format
  timezone: string;          // IANA timezone
  recipients: string[];      // Email addresses
  format: 'pdf' | 'csv' | 'excel';
}
```

**Implementation Note**: Scheduled reports require background job processing (planned feature).

## Database Management

The admin panel provides comprehensive database monitoring and maintenance tools to ensure optimal performance and health.

### Database Health Monitoring

#### Health Check Endpoint

```
GET /api/admin/database/health
```

Returns:

```json
{
  "success": true,
  "data": {
    "database": {
      "size": "1.2 GB",
      "size_bytes": 1288490188
    },
    "connections": {
      "total_connections": 15,
      "active_connections": 3,
      "idle_connections": 12
    },
    "largestTables": [
      { "schemaname": "public", "tablename": "audit_logs", "size": "450 MB" },
      { "schemaname": "public", "tablename": "claims", "size": "320 MB" },
      { "schemaname": "public", "tablename": "organization_users", "size": "85 MB" }
    ]
  }
}
```

### Key Metrics Monitored

#### Connection Pool Statistics

- **Total connections** - Current number of open database connections
- **Active connections** - Connections currently executing queries
- **Idle connections** - Connections in the pool but not in use
- **Max connections** - Configured maximum (typically 100 for Azure PostgreSQL)

**Warning Thresholds**:

- Alert if active connections > 80% of max for > 5 minutes
- Alert if idle connections < 5 (pool starvation)
- Alert if total connections approaches max (connection leak detection)

#### Database Size Tracking

- **Current size** - Total database size including indexes
- **Growth rate** - Daily/weekly/monthly growth trends
- **Largest tables** - Top 10 tables by size for optimization targets
- **Index efficiency** - Index usage statistics and bloat detection

#### Query Performance

PostgreSQL provides built-in statistics via `pg_stat_statements`:

```sql
-- Top 10 slowest queries by average execution time
SELECT 
  substring(query, 1, 100) as query_preview,
  calls,
  total_exec_time / 1000 as total_sec,
  mean_exec_time / 1000 as mean_sec,
  max_exec_time / 1000 as max_sec
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Database Optimization

#### Optimization Endpoint

```
POST /api/admin/database/optimize
```

Executes:

```sql
ANALYZE;  -- Updates query planner statistics
```

**Note**: Full `VACUUM` requires database administrator privileges and is run automatically by Azure PostgreSQL during maintenance windows.

#### Manual Optimization Tasks

##### 1. Update Table Statistics

Run `ANALYZE` after bulk data changes:

```sql
ANALYZE organization_users;
ANALYZE claims;
ANALYZE audit_logs;
```

##### 2. Reindex Heavy-Use Tables

```sql
REINDEX TABLE organization_users;
REINDEX TABLE claims;
```

**When to reindex**:

- After bulk deletions
- If index bloat > 30%
- Query performance degradation

##### 3. Vacuum Dead Tuples

```sql
-- Check dead tuple counts
SELECT schemaname, relname, n_dead_tup, n_live_tup,
       ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 1) as dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- Manual vacuum (requires elevated privileges)
VACUUM ANALYZE organization_users;
```

##### 4. Index Maintenance

```sql
-- Find unused indexes (candidates for removal)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey';

-- Find missing indexes (high seq scans)
SELECT schemaname, tablename, seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch,
       ROUND(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 1) as idx_scan_pct
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_scan DESC;
```

### Database Schema Information

The application uses a multi-schema architecture for organization:

#### Schema Organization

- **public** - Core application tables (tenants, users, claims, notifications)
- **audit_security** - Audit logs, security events, failed logins, rate limits
- **analytics** - Report definitions, data sources, scheduled reports (planned)

#### Key Tables by Schema

**public schema**:

- `tenants` - Organization master table
- `organization_users` - User membership and roles
- `tenant_configurations` - Per-tenant settings
- `tenant_usage` - Resource consumption tracking
- `claims` - Grievance and claim records
- `notifications` - User notification queue

**audit_security schema**:

- `audit_logs` - Comprehensive activity audit trail
- `security_events` - Security-specific event tracking
- `failed_login_attempts` - Brute force detection
- `rate_limit_events` - API rate limiting logs

### Backup & Recovery

#### Automated Backups

Azure PostgreSQL Flexible Server provides:

- **Daily full backups** - Automatic at configured time
- **Continuous transaction log archiving** - Point-in-time recovery (PITR)
- **Retention period** - Configurable 7-35 days
- **Geo-redundant storage** - Backups replicated to paired region

#### Point-in-Time Recovery

Restore database to any point within retention window:

```bash
# Via Azure CLI
az postgres flexible-server restore \
  --resource-group unioneyes-rg \
  --name unioneyes-restored \
  --source-server unioneyes-staging-db \
  --restore-time "2025-12-03T10:30:00Z"
```

#### Manual Backup (pg_dump)

For development/testing:

```powershell
# Full database dump
pg_dump -h your-host -U your-user -d unioneyes_db -F c -b -v -f backup.dump

# Schema-only dump
pg_dump -h your-host -U your-user -d unioneyes_db --schema-only -f schema.sql

# Data-only dump
pg_dump -h your-host -U your-user -d unioneyes_db --data-only -f data.sql

# Restore from dump
pg_restore -h your-host -U your-user -d unioneyes_db -v backup.dump
```

### Performance Tuning

#### Connection Pooling

The application uses Drizzle ORM with connection pooling:

- **Min connections**: 2
- **Max connections**: 10 per app instance
- **Idle timeout**: 30 seconds
- **Connection timeout**: 5 seconds

#### Query Optimization Tips

1. **Use indexes on foreign keys** - Automatically created by Drizzle
2. **Add indexes on filter columns** - Especially `status`, `createdAt`, `tenantId`
3. **Avoid SELECT *** - Explicitly list required columns
4. **Use query limits** - Always paginate large result sets
5. **Leverage prepared statements** - Drizzle does this automatically
6. **Monitor N+1 queries** - Use joins instead of multiple queries

#### Slow Query Logging

Enable in Azure PostgreSQL:

- `log_min_duration_statement = 1000` (log queries > 1 second)
- `log_statement = 'all'` (log all statements - development only)
- `pg_stat_statements` extension enabled for query analytics

### Database Migrations

#### Migration Management

Drizzle Kit handles schema migrations:

```powershell
# Generate migration from schema changes
pnpm drizzle-kit generate:pg

# Apply migrations to database
pnpm drizzle-kit push:pg

# View migration status
pnpm drizzle-kit check:pg
```

#### Migration Best Practices

1. **Always test in staging** - Never run migrations directly in production
2. **Backup before migrating** - Create manual backup before major changes
3. **Use transactions** - Drizzle wraps migrations in transactions by default
4. **Avoid data migrations in schema migrations** - Separate data fixes into scripts
5. **Version control migrations** - Commit generated SQL to repository

### Monitoring Tools Integration

#### Recommended Tools

- **Azure Monitor** - Built-in metrics, alerts, and log analytics
- **pgAdmin** - Visual database administration tool
- **DataGrip** - JetBrains database IDE with query profiling
- **Sentry** - Application error tracking (already integrated)
- **Datadog** (optional) - Advanced APM and infrastructure monitoring

#### Key Alerts to Configure

1. **High CPU usage** - > 80% for > 5 minutes
2. **High memory usage** - > 90% for > 3 minutes
3. **Connection pool exhaustion** - Active connections > 90% max
4. **Slow queries** - Queries taking > 5 seconds
5. **Database size growth** - > 10% daily increase
6. **Failed connections** - > 10 failed connections in 1 minute
7. **Replication lag** (if using read replicas) - > 30 seconds

## Monitoring & Logging

### Application Logs

- **Location**: Console output (dev), Sentry (production)
- **Format**: JSON structured logging with correlation IDs
- **Levels**: DEBUG, INFO, WARN, ERROR
- **Correlation ID**: Traces requests across services and async operations
- **Automatic redaction**: Sensitive fields (passwords, tokens, emails) automatically redacted

### Database Logs

- **Connection pool metrics** - Tracked via pg_stat_activity
- **Slow query logs** - Queries > 1 second logged to Azure Monitor
- **Error logs** - Connection errors, constraint violations, deadlocks
- **Audit logs** - Stored in audit_security.audit_logs table

### Access Logs

- **Admin API calls** - All endpoints logged via `withLogging` wrapper
- **User actions** - Logged to audit_logs with correlation IDs
- **Security events** - Failed logins, suspicious activity tracked separately
- **Performance metrics** - Response times, slow operations (> 1 second) logged as warnings

## Future Enhancements

### Planned Features

- 📊 Advanced analytics dashboard with charts
- 📧 Email notification system
- 🔔 Real-time alerts for critical events
- 📤 Data export (CSV, PDF)
- 🔄 Bulk operations (mass user import/update)
- 🎨 Customizable dashboard themes
- 📱 Mobile-responsive improvements
- 🌍 Multi-language support
- 🔐 Two-factor authentication for admins
- 📈 Trend analysis and predictions

### Technical Improvements

- GraphQL API option
- WebSocket for real-time updates
- Advanced caching with Redis
- Rate limiting implementation
- API versioning
- Comprehensive test coverage (90%+)

## Contributing

### Code Style

- TypeScript strict mode
- ESLint + Prettier configured
- Conventional commits
- Pull request required

### Testing Requirements

- Unit tests for all new features
- Integration tests for API routes
- E2E tests for critical flows

## License

Proprietary - UnionEyes Platform

## Support

For issues or questions:

- Email: <dev@unioneyes.com>
- Docs: <https://docs.unioneyes.com>
- Slack: #admin-panel

---

**Last Updated**: December 3, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
