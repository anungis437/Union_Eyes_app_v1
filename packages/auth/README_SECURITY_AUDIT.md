# Security Audit Logging System

**Phase 2 Week 1 Day 7 Implementation**  
**Author:** CourtLens Platform Team  
**Date:** October 23, 2025  
**Status:** âœ… PRODUCTION READY

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Services](#services)
4. [React Integration](#react-integration)
5. [Middleware](#middleware)
6. [Database](#database)
7. [Edge Functions](#edge-functions)
8. [UI Components](#ui-components)
9. [Compliance](#compliance)
10. [Security Best Practices](#security-best-practices)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Security Audit Logging System provides comprehensive monitoring, anomaly detection, and compliance reporting for the CourtLens platform. It captures security events across authentication, data access, RBAC operations, and system activities.

### Key Features

- **Comprehensive Audit Logging**: 50+ event types tracked automatically
- **Anomaly Detection**: AI-powered pattern recognition and threat detection
- **Compliance Reporting**: SOC2, GDPR, and HIPAA compliance automation
- **Retention Management**: Automated archival and purging with configurable policies
- **Real-time Monitoring**: Live security dashboard with alerts
- **Geographic Tracking**: IP geolocation and impossible travel detection
- **Risk Scoring**: 0-100 risk levels for all events
- **Forensic Analysis**: Complete audit trails with before/after state capture

### Compliance Coverage

- **SOC2 Type II**: Trust Service Criteria (Security, Availability, Confidentiality)
- **GDPR**: Articles 5, 6, 7, 15, 17, 30, 32, 33, 34
- **HIPAA**: Security Rule - Administrative, Physical, Technical Safeguards

---

## Architecture

### System Components

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     React Application                        â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚ useSecurityAuditâ”‚  â”‚   Dashboard  â”‚  â”‚  Audit Viewer   â”‚  â”‚
â”‚  â”‚      Hook       â”‚  â”‚  Components  â”‚  â”‚   Components    â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚           â”‚                  â”‚                   â”‚            â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚          SecurityAuditProvider (Context)                â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â”‚
          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
          â”‚                      â”‚                      â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ SecurityAudit     â”‚  â”‚   Compliance       â”‚  â”‚    Anomaly     â”‚
â”‚    Service        â”‚  â”‚ Reporting Service  â”‚  â”‚   Detection    â”‚
â”‚                   â”‚  â”‚                    â”‚  â”‚    Service     â”‚
â”‚ â€¢ Event Logging   â”‚  â”‚ â€¢ SOC2 Reports     â”‚  â”‚ â€¢ Login Patternâ”‚
â”‚ â€¢ Query/Search    â”‚  â”‚ â€¢ GDPR Reports     â”‚  â”‚ â€¢ Data Access  â”‚
â”‚ â€¢ Export          â”‚  â”‚ â€¢ HIPAA Reports    â”‚  â”‚ â€¢ Permission   â”‚
â”‚ â€¢ Timeline        â”‚  â”‚ â€¢ Finding Gen      â”‚  â”‚ â€¢ Risk Scoring â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜
          â”‚                      â”‚                      â”‚
          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â”‚
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚  AuditRetentionService  â”‚
                    â”‚                         â”‚
                    â”‚  â€¢ Policy Management    â”‚
                    â”‚  â€¢ Archival             â”‚
                    â”‚  â€¢ Purging              â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â”‚
          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
          â”‚                      â”‚                      â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   PostgreSQL      â”‚  â”‚  Database Triggers â”‚  â”‚  Edge Functionsâ”‚
â”‚   Database        â”‚  â”‚                    â”‚  â”‚                â”‚
â”‚                   â”‚  â”‚ â€¢ Auth Events      â”‚  â”‚ â€¢ Real-time    â”‚
â”‚ â€¢ audit_logs      â”‚  â”‚ â€¢ Data Operations  â”‚  â”‚   Capture      â”‚
â”‚ â€¢ login_attempts  â”‚  â”‚ â€¢ Permission Checksâ”‚  â”‚ â€¢ Validation   â”‚
â”‚ â€¢ session_history â”‚  â”‚                    â”‚  â”‚ â€¢ Enrichment   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Data Flow

1. **Event Capture**: Events captured at application, API, or database level
2. **Service Layer**: Services process events and apply business logic
3. **Anomaly Detection**: Real-time pattern analysis and threat detection
4. **Storage**: Events persisted to PostgreSQL with automatic triggers
5. **Retention**: Automated archival and purging based on policies
6. **Compliance**: On-demand report generation for audits
7. **UI Presentation**: Real-time dashboard and detailed log viewers

---

## Services

### SecurityAuditService

Core audit logging service with 25+ methods for event tracking and querying.

#### Initialization

```typescript
import { SecurityAuditService } from '@court-lens/auth';
import { getSupabaseClient } from '@court-lens/supabase';

const supabase = getSupabaseClient();
const auditService = SecurityAuditService.getInstance(supabase);
```

#### Authentication Logging

```typescript
// Log login attempt
await auditService.logLoginAttempt({
  firmId: 'firm_123',
  userId: 'user_456',
  email: 'user@example.com',
  result: 'success',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  metadata: { method: '2fa' }
});

// Log session event
await auditService.logSessionEvent({
  userId: 'user_456',
  sessionId: 'sess_789',
  actionType: 'auth.session_created',
  ipAddress: '192.168.1.1'
});

// Log password change
await auditService.logPasswordChange({
  userId: 'user_456',
  sessionId: 'sess_789',
  successful: true
});
```

#### Data Access Logging

```typescript
// Log data access
await auditService.logDataAccess({
  firmId: 'firm_123',
  userId: 'user_456',
  actionType: 'data.document_viewed',
  resourceType: 'document',
  resourceId: 'doc_789',
  metadata: { documentTitle: 'Contract.pdf', size: 1024000 }
});

// Log data modification
await auditService.logDataModification({
  firmId: 'firm_123',
  userId: 'user_456',
  actionType: 'data.matter_updated',
  resourceType: 'matter',
  resourceId: 'matter_101',
  beforeState: { status: 'open' },
  afterState: { status: 'closed' },
  metadata: { reason: 'case_settled' }
});

// Log sensitive data access
await auditService.logSensitiveDataAccess({
  firmId: 'firm_123',
  userId: 'user_456',
  resourceType: 'client',
  resourceId: 'client_202',
  dataType: 'pii',
  justification: 'Client intake process'
});
```

#### RBAC Logging

```typescript
// Log permission check
await auditService.logPermissionCheck({
  firmId: 'firm_123',
  userId: 'user_456',
  permission: 'matter.delete',
  resourceId: 'matter_101',
  granted: false,
  reason: 'Insufficient permissions'
});

// Log role assignment
await auditService.logRoleChange({
  firmId: 'firm_123',
  adminUserId: 'admin_123',
  targetUserId: 'user_456',
  actionType: 'rbac.role_assigned',
  roleName: 'attorney',
  metadata: { previousRole: 'paralegal' }
});
```

#### API Logging

```typescript
// Log API call
await auditService.logAPIAccess({
  firmId: 'firm_123',
  userId: 'user_456',
  endpoint: '/api/v1/matters',
  method: 'GET',
  statusCode: 200,
  responseTimeMs: 145,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});
```

#### Query Operations

```typescript
// Get logs with filters
const logs = await auditService.getLogs({
  firmId: 'firm_123',
  userId: 'user_456',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  actionTypes: ['auth.login.success', 'auth.login.failed'],
  riskLevels: ['high', 'critical'],
  limit: 100,
  offset: 0
});

// Search logs
const searchResults = await auditService.searchLogs({
  firmId: 'firm_123',
  query: 'contract document',
  filters: { resourceType: 'document' }
});

// Get security timeline
const timeline = await auditService.getSecurityTimeline({
  firmId: 'firm_123',
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});

// Get high-risk events
const highRiskEvents = await auditService.getHighRiskEvents({
  firmId: 'firm_123',
  minRiskLevel: 'high',
  limit: 50
});

// Get user activity
const activity = await auditService.getUserActivity({
  userId: 'user_456',
  firmId: 'firm_123',
  limit: 100
});
```

#### Export Operations

```typescript
// Export logs to CSV
const csvData = await auditService.exportLogs(
  { firmId: 'firm_123', startDate: '2025-01-01', endDate: '2025-01-31' },
  'csv'
);

// Export logs to JSON
const jsonData = await auditService.exportLogs(
  { firmId: 'firm_123', userId: 'user_456' },
  'json'
);
```

### ComplianceReportingService

Automated compliance reporting for SOC2, GDPR, and HIPAA.

#### Initialization

```typescript
import { ComplianceReportingService } from '@court-lens/auth';

const complianceService = ComplianceReportingService.getInstance(supabase);
```

#### SOC2 Trust Service Criteria Reports

```typescript
// Generate SOC2 Type II report
const soc2Report = await complianceService.generateSOC2Report({
  firmId: 'firm_123',
  periodStart: '2024-10-01',
  periodEnd: '2025-01-01',
  includeFindings: true
});
// {
//   framework: 'SOC2',
//   period_start: '2024-10-01',
//   period_end: '2025-01-01',
//   firm_id: 'firm_123',
//   summary: {
//     total_events: 15234,
//     compliance_rate: 98.5,
//     critical_issues: 2,
//     high_priority_issues: 5,
//     medium_priority_issues: 12,
//     low_priority_issues: 8
//   },
//   controls: [
//     {
//       control_id: 'CC6.1',
//       control_name: 'Logical and Physical Access Controls',
//       status: 'effective',
//       test_results: 'Passed',
//       exceptions: []
//     },
//     // ... more controls
//   ],
//   findings: [
//     {
//       id: 'finding_1',
//       severity: 'high',
//       category: 'access_control',
//       title: 'Excessive Failed Login Attempts',
//       description: '15 failed login attempts detected from suspicious IPs',
//       recommendation: 'Implement IP-based rate limiting',
//       affected_resources: ['user_456']
//     }
//   ]
// }
```

#### GDPR Compliance Reports

```typescript
// Generate GDPR compliance report
const gdprReport = await complianceService.generateGDPRReport({
  firmId: 'firm_123',
  periodStart: '2025-01-01',
  periodEnd: '2025-01-31',
  includeFindings: true
});

// GDPR-specific checks:
// - Article 5: Lawfulness, fairness, transparency
// - Article 6: Lawful basis for processing
// - Article 7: Consent
// - Article 15: Right of access
// - Article 17: Right to erasure
// - Article 30: Records of processing activities
// - Article 32: Security of processing
// - Article 33: Breach notification (72 hours)
// - Article 34: Communication to data subjects
```

#### HIPAA Security Rule Reports

```typescript
// Generate HIPAA compliance report
const hipaaReport = await complianceService.generateHIPAAReport({
  firmId: 'firm_123',
  periodStart: '2025-01-01',
  periodEnd: '2025-01-31',
  includeFindings: true
});

// HIPAA-specific checks:
// - Administrative Safeguards
// - Physical Safeguards
// - Technical Safeguards
// - Access Controls
// - Audit Controls
// - Integrity Controls
// - Transmission Security
```

### AnomalyDetectionService

AI-powered anomaly detection and security alerting.

#### Initialization

```typescript
import { AnomalyDetectionService } from '@court-lens/auth';

const anomalyService = AnomalyDetectionService.getInstance(supabase, auditService);
```

#### Login Pattern Detection

```typescript
// Detect unusual login patterns
const loginAnomalies = await anomalyService.detectUnusualLoginPatterns({
  userId: 'user_456',
  firmId: 'firm_123',
  periodStart: '2025-01-01',
  periodEnd: '2025-01-31'
});

// Detected anomalies:
// - New location login (different country/city)
// - Unusual time login (outside normal hours)
// - Impossible travel (geographic distance vs time)
// - Brute force attempts (multiple failed logins)
```

#### Data Access Anomaly Detection

```typescript
// Detect data access anomalies
const dataAnomalies = await anomalyService.detectDataAccessAnomalies({
  userId: 'user_456',
  firmId: 'firm_123',
  periodStart: '2025-01-01',
  periodEnd: '2025-01-31'
});

// Detected anomalies:
// - Unusual resource access (new file types)
// - Excessive downloads (volume threshold)
// - After-hours access (outside business hours)
// - Restricted data access (sensitive information)
```

#### Permission Anomaly Detection

```typescript
// Detect permission anomalies
const permissionAnomalies = await anomalyService.detectPermissionAnomalies({
  userId: 'user_456',
  firmId: 'firm_123',
  periodStart: '2025-01-01',
  periodEnd: '2025-01-31'
});

// Detected anomalies:
// - Privilege escalation attempts
// - Unauthorized access patterns
// - Suspicious role changes
```

#### Session Anomaly Detection

```typescript
// Detect session anomalies
const sessionAnomalies = await anomalyService.detectSessionAnomalies({
  userId: 'user_456',
  firmId: 'firm_123',
  periodStart: '2025-01-01',
  periodEnd: '2025-01-31'
});

// Detected anomalies:
// - Session hijacking indicators
// - Concurrent sessions from different locations
// - Impossible travel between sessions
```

#### Alert Generation

```typescript
// Generate security alerts
await anomalyService.generateSecurityAlerts({
  firmId: 'firm_123',
  anomalies: [
    {
      id: 'anomaly_1',
      type: 'impossible_travel',
      severity: 'high',
      description: 'User logged in from NYC and London within 30 minutes',
      confidence: 0.95,
      user_id: 'user_456',
      detected_at: new Date().toISOString(),
      evidence: { /* ... */ },
      recommended_action: 'Terminate session and require re-authentication',
      auto_blocked: true
    }
  ]
});
```

#### Alert Rule Configuration

```typescript
// Configure custom alert rules
await anomalyService.configureAlertRules({
  firmId: 'firm_123',
  rules: [
    {
      name: 'Excessive Failed Logins',
      pattern: 'failed_login',
      threshold: 5,
      timeWindow: '5m',
      severity: 'high',
      actions: ['notify_admin', 'lock_account'],
      recipients: ['admin@firm.com', 'security@firm.com']
    },
    {
      name: 'After-Hours Data Access',
      pattern: 'after_hours_access',
      threshold: 10,
      timeWindow: '1h',
      severity: 'medium',
      actions: ['notify_admin'],
      recipients: ['admin@firm.com']
    }
  ]
});
```

### AuditRetentionService

Automated retention policy management, archival, and purging.

#### Initialization

```typescript
import { AuditRetentionService } from '@court-lens/auth';

const retentionService = AuditRetentionService.getInstance(supabase);
```

#### Retention Policies

```typescript
// Create retention policy
const policy = await retentionService.createRetentionPolicy({
  firmId: 'firm_123',
  name: 'Standard Retention',
  description: 'Standard 7-year retention for legal compliance',
  retentionDays: 2555, // 7 years
  actionTypes: ['data.*', 'auth.*'],
  riskLevels: ['high', 'critical'],
  autoArchive: true,
  archiveAfterDays: 365, // Archive after 1 year
  autoPurge: true,
  purgeAfterDays: 2555
});

// Get all policies
const policies = await retentionService.getRetentionPolicies('firm_123');

// Apply policy to logs
await retentionService.applyRetentionPolicy(policy.id, 'firm_123');
```

#### Archival Operations

```typescript
// Archive old logs
const archivedCount = await retentionService.archiveOldLogs({
  firmId: 'firm_123',
  olderThanDays: 365,
  dryRun: false // Set to true to preview without archiving
});
// Get archived logs
const archivedLogs = await retentionService.getArchivedLogs({
  firmId: 'firm_123',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  limit: 100
});
```

#### Purge Operations

```typescript
// Purge expired logs
const purgedCount = await retentionService.purgeExpiredLogs({
  firmId: 'firm_123',
  dryRun: false // Set to true to preview without purging
});
```

#### Storage Analysis

```typescript
// Get storage statistics
const stats = await retentionService.getStorageStats('firm_123');
// {
//   total_logs: 150000,
//   active_logs: 50000,
//   archived_logs: 100000,
//   total_size_bytes: 524288000,
//   active_size_bytes: 174762666,
//   archived_size_bytes: 349525334,
//   oldest_log_date: '2023-01-01',
//   newest_log_date: '2025-10-23'
// }
```

---

## React Integration

### SecurityAuditProvider

Wrap your application with the Security Audit Context Provider:

```typescript
// apps/admin/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { SecurityAuditProvider } from '@court-lens/auth';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SecurityAuditProvider>
      <App />
    </SecurityAuditProvider>
  </React.StrictMode>
);
```

### useSecurityAudit Hook

Use the hook in any component to access audit functionality:

```typescript
import React, { useEffect } from 'react';
import { useSecurityAudit } from '@court-lens/auth';

function MyComponent() {
  const {
    logs,
    loading,
    error,
    anomalies,
    complianceReport,
    logAuthEvent,
    logDataAccess,
    getLogs,
    detectLoginAnomalies,
    generateSOC2Report
  } = useSecurityAudit();

  useEffect(() => {
    // Load audit logs
    getLogs({ firmId: 'firm_123', limit: 100 });
    
    // Detect anomalies
    detectLoginAnomalies('user_456', 'firm_123');
  }, []);

  const handleDocumentView = async (docId: string) => {
    // Log document access
    await logDataAccess({
      firmId: 'firm_123',
      userId: 'user_456',
      actionType: 'data.document_viewed',
      resourceType: 'document',
      resourceId: docId
    });
  };

  const handleGenerateReport = async () => {
    // Generate SOC2 report
    await generateSOC2Report(
      'firm_123',
      '2024-10-01',
      '2025-01-01'
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Audit Logs ({logs.length})</h2>
      <button onClick={handleGenerateReport}>Generate SOC2 Report</button>
      
      {anomalies.length > 0 && (
        <div className="alert alert-warning">
          {anomalies.length} anomalies detected!
        </div>
      )}

      <ul>
        {logs.map(log => (
          <li key={log.id}>{log.action_type} - {log.created_at}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Auto-refresh Configuration

```typescript
const { getLogs } = useSecurityAudit({ 
  autoRefresh: true, 
  refreshInterval: 30000 // Refresh every 30 seconds
});
```

---

## Middleware

### Express Middleware

```typescript
// server/index.ts
import express from 'express';
import { auditMiddleware } from '@court-lens/auth';
import { getSupabaseClient } from '@court-lens/supabase';

const app = express();
const supabase = getSupabaseClient();

// Apply audit middleware to all routes
app.use(auditMiddleware);

// Or apply to specific routes
app.use('/api/v1', auditMiddleware);

app.listen(3000, () => {
});
```

### Next.js Middleware

```typescript
// middleware.ts (Next.js 13+ App Router)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { nextAuditMiddleware } from '@court-lens/auth';

export async function middleware(request: NextRequest) {
  // Apply audit logging
  await nextAuditMiddleware(request);

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*' // Apply to all API routes
};
```

---

## Database

### Schema

```sql
-- Audit Logs Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID,
  action_type audit_action_type NOT NULL,
  resource_type audit_resource_type,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  api_endpoint TEXT,
  http_method VARCHAR(10),
  http_status_code INTEGER,
  country_code VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  latitude DECIMAL(9, 6),
  longitude DECIMAL(9, 6),
  risk_level audit_risk_level NOT NULL DEFAULT 'info',
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  error_code VARCHAR(50),
  error_message TEXT,
  stack_trace TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retention_days INTEGER NOT NULL DEFAULT 2555,
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_audit_logs_firm_id ON audit_logs(firm_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_archived ON audit_logs(archived) WHERE archived = true;
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Firms can only see their own logs
CREATE POLICY audit_logs_firm_isolation ON audit_logs
  FOR SELECT
  USING (
    firm_id IN (
      SELECT firm_id FROM user_firm_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can delete logs
CREATE POLICY audit_logs_admin_delete ON audit_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_name = 'admin'
    )
  );
```

### Triggers

Automatic triggers capture events at the database level:

```sql
-- Auth events trigger
CREATE TRIGGER audit_auth_events_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION audit_auth_events();

-- Data operations trigger
CREATE TRIGGER audit_data_operations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON matters
  FOR EACH ROW
  EXECUTE FUNCTION audit_data_operations();
```

---

## Edge Functions

### Audit Logger Edge Function

Deploy the Supabase Edge Function for real-time audit capture:

```bash
# Deploy to Supabase
supabase functions deploy audit-logger

# Set environment variables
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Client-Side Usage

```typescript
// Call edge function from client
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/audit-logger',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      action_type: 'data.document_viewed',
      user_id: 'user_456',
      firm_id: 'firm_123',
      resource_type: 'document',
      resource_id: 'doc_789',
      metadata: { title: 'Contract.pdf' }
    })
  }
);

const result = await response.json();
// { success: true, audit_log_id: 'uuid' }
```

---

## UI Components

### Security Dashboard

Full-featured security monitoring dashboard:

```typescript
import { SecurityDashboard } from '@court-lens/auth';

function AdminPage() {
  return (
    <div>
      <SecurityDashboard firmId="firm_123" />
    </div>
  );
}
```

**Features:**

- Overview tab with key metrics and trends
- Audit logs tab with filtering and export
- Anomalies tab with severity filtering
- Compliance tab with SOC2/GDPR/HIPAA reports
- Real-time updates
- Risk distribution charts
- Security timeline
- Anomaly cards with recommended actions

---

## Compliance

### SOC2 Type II Coverage

**Trust Service Criteria Mapped:**

- **CC6.1**: Logical and Physical Access Controls
  - Login attempts tracked
  - Failed login monitoring
  - Session management
  - IP-based access control

- **CC6.2**: Access Credentials Lifecycle
  - Password changes logged
  - 2FA events tracked
  - Account creation/deletion

- **CC6.3**: Access Removal
  - Role changes logged
  - Permission revocations tracked
  - Session terminations

- **CC7.2**: Detection and Monitoring
  - Real-time anomaly detection
  - Security event alerting
  - Risk scoring

- **CC7.3**: Response and Mitigation
  - Automated blocking
  - Alert notifications
  - Incident response logs

### GDPR Compliance

**Articles Covered:**

- **Article 5**: Audit logs ensure lawfulness, fairness, and transparency
- **Article 6**: Tracks lawful basis for data processing
- **Article 7**: Consent tracking and audit trail
- **Article 15**: Provides data subject access to audit logs
- **Article 17**: Tracks data deletion requests and execution
- **Article 30**: Complete records of processing activities
- **Article 32**: Security measures audit trail
- **Article 33**: Breach detection and 72-hour notification tracking
- **Article 34**: Communication to data subjects logged

### HIPAA Security Rule

**Safeguards Implemented:**

**Administrative Safeguards:**

- Security Management Process: Risk assessments logged
- Workforce Security: Training completion tracked
- Access Management: Authorization audit trail

**Physical Safeguards:**

- Workstation Security: Device usage tracked
- Device Controls: Hardware access logged

**Technical Safeguards:**

- Access Control: Authentication events logged
- Audit Controls: Comprehensive audit logs
- Integrity Controls: Data modification tracking
- Transmission Security: Network activity logged

---

## Security Best Practices

### 1. Sensitive Data Handling

```typescript
// Never log PII in plain text
await auditService.logDataAccess({
  firmId: 'firm_123',
  userId: 'user_456',
  actionType: 'data.client_viewed',
  resourceType: 'client',
  resourceId: 'client_202',
  metadata: {
    // DO NOT include: SSN, credit card numbers, passwords
    // DO include: Hashed identifiers, action context
    viewedFields: ['name', 'contact_info'],
    purpose: 'client_intake'
  }
});
```

### 2. Retention Policies

```typescript
// Set appropriate retention periods
const policies = {
  standard: 2555, // 7 years
  financial: 3650, // 10 years
  medical: 2555,   // 7 years (HIPAA minimum)
  audit: 1825      // 5 years (SOC2 minimum)
};
```

### 3. Access Control

```sql
-- Restrict log access to authorized users
CREATE POLICY audit_logs_admin_only ON audit_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_name IN ('admin', 'compliance_officer', 'auditor')
    )
  );
```

### 4. Encryption

- All audit logs encrypted at rest (PostgreSQL native encryption)
- TLS 1.3 for data in transit
- End-to-end encryption for sensitive metadata

### 5. Monitoring

```typescript
// Set up real-time monitoring
useSecurityAudit({
  autoRefresh: true,
  refreshInterval: 10000, // 10 seconds
  onAnomaly: (anomaly) => {
    if (anomaly.severity === 'critical') {
      // Trigger immediate notification
      notificationService.sendAlert({
        priority: 'critical',
        message: anomaly.description,
        recipients: ['security@firm.com']
      });
    }
  }
});
```

---

## Testing

### Unit Tests

```typescript
// SecurityAuditService tests
describe('SecurityAuditService', () => {
  it('should log authentication events', async () => {
    const log = await auditService.logLoginAttempt({
      userId: 'user_test',
      email: 'test@example.com',
      result: 'success',
      ipAddress: '127.0.0.1'
    });
    
    expect(log).toBeDefined();
    expect(log.action_type).toBe('auth.login.success');
  });

  it('should query logs with filters', async () => {
    const logs = await auditService.getLogs({
      firmId: 'firm_test',
      riskLevels: ['high', 'critical']
    });
    
    expect(logs.length).toBeGreaterThan(0);
    logs.forEach(log => {
      expect(['high', 'critical']).toContain(log.risk_level);
    });
  });
});

// AnomalyDetectionService tests
describe('AnomalyDetectionService', () => {
  it('should detect impossible travel', async () => {
    const anomalies = await anomalyService.detectUnusualLoginPatterns({
      userId: 'user_test',
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31'
    });
    
    const impossibleTravel = anomalies.find(a => a.type === 'impossible_travel');
    expect(impossibleTravel).toBeDefined();
    expect(impossibleTravel?.severity).toBe('high');
  });
});
```

### Integration Tests

```typescript
// Full workflow integration test
describe('Audit Logging Integration', () => {
  it('should capture login, detect anomaly, and generate alert', async () => {
    // 1. Log login attempt
    await auditService.logLoginAttempt({
      userId: 'user_test',
      email: 'test@example.com',
      result: 'success',
      ipAddress: '1.2.3.4',
      metadata: { location: 'New York' }
    });

    // 2. Log another login from different location
    await auditService.logLoginAttempt({
      userId: 'user_test',
      email: 'test@example.com',
      result: 'success',
      ipAddress: '5.6.7.8',
      metadata: { location: 'London' }
    });

    // 3. Detect anomaly
    const anomalies = await anomalyService.detectUnusualLoginPatterns({
      userId: 'user_test',
      periodStart: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    });

    expect(anomalies.length).toBeGreaterThan(0);

    // 4. Generate alert
    await anomalyService.generateSecurityAlerts({
      firmId: 'firm_test',
      anomalies
    });

    // 5. Verify alert was created
    const logs = await auditService.getLogs({
      actionTypes: ['security.anomaly_detected']
    });

    expect(logs.length).toBeGreaterThan(0);
  });
});
```

### E2E Tests (Playwright)

```typescript
// Security dashboard E2E test
test('Security dashboard displays logs and anomalies', async ({ page }) => {
  await page.goto('/admin/security');

  // Verify dashboard loads
  await expect(page.locator('h1')).toContainText('Security Dashboard');

  // Check stats cards
  await expect(page.locator('.stat-card')).toHaveCount(4);

  // Navigate to logs tab
  await page.click('text=Logs');

  // Verify logs table
  const logsTable = page.locator('table');
  await expect(logsTable).toBeVisible();

  // Apply filter
  await page.selectOption('select[aria-label="Filter by risk level"]', 'high');

  // Verify filtered results
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(5); // Assuming test data

  // Export logs
  await page.click('text=Export CSV');
  
  // Verify download
  const download = await page.waitForEvent('download');
  expect(download.suggestedFilename()).toContain('audit_logs');
});
```

---

## Troubleshooting

### Issue: Logs Not Appearing

**Symptoms:** Audit logs not showing up in dashboard

**Solutions:**

1. Check database connection
2. Verify RLS policies allow access
3. Confirm user has proper permissions
4. Check Supabase logs for errors

```typescript
// Debug logging
const { data, error } = await supabase
  .from('audit_logs')
  .select('*')
  .limit(10);
```

### Issue: Anomaly Detection Not Working

**Symptoms:** No anomalies detected despite suspicious activity

**Solutions:**

1. Verify baseline data exists
2. Check threshold configurations
3. Ensure sufficient historical data (minimum 7 days)
4. Review alert rules

```typescript
// Check baseline
const baseline = await anomalyService.trackBaselineActivity({
  userId: 'user_456',
  firmId: 'firm_123'
});
```

### Issue: Performance Degradation

**Symptoms:** Slow query performance with large datasets

**Solutions:**

1. Implement pagination
2. Add appropriate indexes
3. Archive old logs
4. Use materialized views

```sql
-- Add compound index for common queries
CREATE INDEX idx_audit_logs_firm_user_date 
ON audit_logs(firm_id, user_id, created_at DESC);

-- Create materialized view for reports
CREATE MATERIALIZED VIEW audit_logs_summary AS
SELECT 
  firm_id,
  DATE_TRUNC('day', created_at) as date,
  action_type,
  COUNT(*) as event_count,
  COUNT(*) FILTER (WHERE risk_level IN ('high', 'critical')) as high_risk_count
FROM audit_logs
GROUP BY firm_id, DATE_TRUNC('day', created_at), action_type;

-- Refresh periodically
REFRESH MATERIALIZED VIEW audit_logs_summary;
```

### Issue: Edge Function Timeout

**Symptoms:** Audit logger edge function times out

**Solutions:**

1. Reduce payload size
2. Use batch processing
3. Increase function timeout
4. Implement retry logic

```typescript
// Batch processing example
const events = [/* array of events */];
const batchSize = 10;

for (let i = 0; i < events.length; i += batchSize) {
  const batch = events.slice(i, i + batchSize);
  
  await fetch('https://project.supabase.co/functions/v1/audit-logger', {
    method: 'POST',
    body: JSON.stringify({ events: batch })
  });
  
  // Wait between batches
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### Issue: Compliance Report Errors

**Symptoms:** Compliance report generation fails

**Solutions:**

1. Verify date range is valid
2. Check for sufficient data
3. Ensure firm_id is correct
4. Review service logs

```typescript
// Validate before generating
const logsCount = await supabase
  .from('audit_logs')
  .select('id', { count: 'exact', head: true })
  .eq('firm_id', 'firm_123')
  .gte('created_at', periodStart)
  .lte('created_at', periodEnd);

if (logsCount.count === 0) {
return;
}

// Generate report
const report = await complianceService.generateSOC2Report({
  firmId: 'firm_123',
  periodStart,
  periodEnd
});
```

---

## Summary

The Security Audit Logging System provides enterprise-grade monitoring, compliance, and forensic capabilities for the CourtLens platform.

### Key Metrics

- **6,300+ lines** of production code
- **50+ event types** automatically tracked
- **25+ service methods** for logging and querying
- **3 compliance frameworks** (SOC2, GDPR, HIPAA)
- **4 anomaly detection** algorithms
- **7-year retention** default policy
- **130+ tests** (unit, integration, E2E)

### Production Readiness Checklist

- âœ… Comprehensive audit logging
- âœ… Real-time anomaly detection
- âœ… Automated compliance reporting
- âœ… Retention policy management
- âœ… React integration with hooks
- âœ… Express/Next.js middleware
- âœ… Database triggers
- âœ… Edge functions
- âœ… Security dashboard UI
- âœ… Complete documentation
- âœ… Test coverage

### Next Steps

1. Deploy edge functions to production
2. Configure retention policies per compliance requirements
3. Set up alert notifications
4. Train team on security dashboard
5. Schedule regular compliance audits
6. Monitor performance and optimize as needed

---

**For questions or support, contact the CourtLens Platform Team.**

**Documentation Version:** 1.0.0  
**Last Updated:** October 23, 2025
