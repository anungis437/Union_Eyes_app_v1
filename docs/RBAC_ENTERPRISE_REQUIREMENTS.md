# Enterprise-Grade RBAC Requirements for Large Unions

**Date:** November 14, 2025  
**Status:** Requirements Analysis  
**Target:** Support unions with 100K+ members, multi-local structures

---

## Current Implementation Assessment

### ✅ What Works Well (Keep)

1. **Clean Middleware Pattern**
   - `withRoleAuth()` is elegant and maintainable
   - TypeScript type safety
   - Easy to test and extend

2. **Tenant Isolation**
   - Strong multi-tenant separation
   - Role scoping per tenant
   - Cookie-based tenant switching

3. **Simple Role Hierarchy**
   - Good for small to medium unions
   - Clear permission inheritance
   - Low performance overhead

### ❌ Critical Gaps for Enterprise Unions

#### 1. **Insufficient Role Granularity**

**Current Problem:**
```typescript
type MemberRole = "member" | "steward" | "officer" | "admin";
```

**Real Union Requirements:**
```
International Union
├── International President (elected)
├── International Secretary-Treasurer (elected)
├── International Vice Presidents (elected, sector-specific)
├── General Counsel (appointed)
├── Organizing Director (appointed)
└── Regional Directors (appointed)

Local Union (per region)
├── Local President (elected)
├── Local Secretary-Treasurer (elected)
├── Recording Secretary (elected)
├── Chief Steward (elected)
├── Department Stewards (elected, department-scoped)
│   ├── Manufacturing Steward
│   ├── Maintenance Steward
│   └── Administrative Steward
├── Trustees (elected, audit powers)
└── Executive Board Members (elected)

Committee Roles (temporary assignments)
├── Bargaining Committee Chair
├── Health & Safety Committee
├── Grievance Committee
└── Political Action Committee
```

**Required Enhancements:**
- Hierarchical role trees (not flat list)
- Role scoping (department, local, region, international)
- Elected vs. appointed role tracking
- Term limits and expiration dates
- Multiple simultaneous roles per member

#### 2. **No Multi-Level Jurisdiction Support**

**Current Problem:**
- Single tenant = entire union
- No concept of locals, regions, districts

**Real Union Structure:**
```
International Union (AFT, UAW, SEIU, etc.)
├── Region 1 (Northeast)
│   ├── Local 101 (New York City)
│   │   ├── Chapter A (Hospital Workers)
│   │   └── Chapter B (School Workers)
│   ├── Local 102 (Boston)
│   └── Local 103 (Philadelphia)
├── Region 2 (Midwest)
│   ├── Local 201 (Chicago)
│   └── Local 202 (Detroit)
└── Region 3 (West Coast)
    └── Local 301 (Los Angeles)
```

**Required Enhancements:**
- Hierarchical tenant structure (international → region → local → chapter)
- Role inheritance up/down hierarchy
- Cross-jurisdiction visibility rules
- Consolidation reporting across locals

#### 3. **Missing Department/Sector Scoping**

**Current Problem:**
- Steward has access to ALL members
- No department boundaries

**Real Scenario:**
- Manufacturing steward should only see manufacturing workers
- Healthcare steward only sees healthcare members
- Chief steward sees all departments

**Schema Needed:**
```typescript
interface Member {
  department: string; // "Manufacturing", "Healthcare", "Admin"
  workLocation: string; // "Plant A", "Hospital B"
  shift: string; // "Day", "Night", "Swing"
}

interface RoleAssignment {
  role: string;
  scope: {
    type: "department" | "location" | "shift" | "global";
    value: string | null; // null = global
  };
}
```

**Access Rules:**
```typescript
// Department steward can only access their department
if (role === "steward" && scope.type === "department") {
  return member.department === scope.value;
}

// Chief steward can access all departments
if (role === "chief_steward") {
  return true; // Global access
}
```

#### 4. **No Temporal/Conditional Permissions**

**Current Problem:**
- Roles are permanent until manually changed
- No automatic term expirations
- No election cycle management

**Real Requirements:**
```typescript
interface RoleAssignment {
  role: string;
  memberId: string;
  tenantId: string;
  
  // Temporal fields
  startDate: Date;
  endDate: Date | null; // null = indefinite
  termLength: number | null; // e.g., 3 years for elected officers
  
  // Election tracking
  electionType: "elected" | "appointed" | "acting";
  electionDate: Date | null;
  nextElectionDue: Date | null;
  
  // Status
  status: "active" | "suspended" | "expired" | "pending";
  
  // Succession
  actingFor: string | null; // Member ID if acting role
  delegatedBy: string | null; // Member ID if delegated
}
```

**Business Logic:**
- Auto-expire roles when term ends
- Send notifications 90/60/30 days before election
- Flag expired officers (still seated but term ended)
- Handle "acting" roles during absences

#### 5. **No Delegation/Acting Roles**

**Current Problem:**
- President goes on medical leave → no one has authority
- No temporary authority transfer

**Required Features:**
```typescript
interface Delegation {
  fromMemberId: string;
  toMemberId: string;
  role: string;
  reason: string; // "Medical leave", "Vacation", "Emergency"
  startDate: Date;
  endDate: Date | null;
  status: "active" | "ended" | "revoked";
  approvedBy: string | null; // Executive board approval
}

// Acting role pattern
interface ActingRole {
  memberId: string;
  actingAs: string; // "president", "treasurer"
  reason: string;
  startDate: Date;
  endDate: Date | null;
  automaticSuccession: boolean; // VP auto-becomes acting president
}
```

#### 6. **Weak Audit Requirements**

**Current Problem:**
- No logging of permission usage
- Can't answer: "Who approved this grievance settlement?"
- Union governance requires detailed audit trails

**Required Audit System:**
```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  
  // Who
  actorId: string; // Member who performed action
  actorRole: string; // Role they had at the time
  onBehalfOf: string | null; // If acting/delegated
  
  // What
  action: string; // "approve_grievance", "change_role", "view_financial"
  resourceType: string; // "claim", "member", "contract"
  resourceId: string;
  
  // Context
  tenantId: string;
  requiredPermission: string;
  granted: boolean;
  denialReason: string | null;
  
  // Metadata
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  
  // Immutability
  hash: string; // Cryptographic hash for tamper detection
  previousHash: string | null; // Blockchain-style linking
}
```

**Compliance Queries:**
```sql
-- Who approved settlements over $10K in last year?
SELECT actor, COUNT(*) 
FROM audit_logs 
WHERE action = 'approve_grievance' 
  AND metadata->>'settlement_amount' > '10000'
  AND timestamp > NOW() - INTERVAL '1 year'
GROUP BY actor;

-- What did President Smith access before election?
SELECT action, resource_type, timestamp
FROM audit_logs
WHERE actor_id = 'smith_id'
  AND timestamp BETWEEN '2024-01-01' AND '2024-06-30'
ORDER BY timestamp;
```

#### 7. **No Permission Exceptions**

**Current Problem:**
- Rigid hierarchy: steward OR not steward
- No case-by-case exceptions

**Real Scenarios:**
```
1. Member Jones needs to see Claim #123 even though not their steward
   → Grievance involves their department, they're key witness

2. Treasurer Smith can view all financial data
   → But should NOT approve their own expense reimbursements

3. Former President Wilson
   → No longer has admin access
   → But should retain read-only access to matters from their term

4. External Lawyer Martinez
   → Not a union member
   → Needs access to specific grievances assigned to them
```

**Required: Exception System:**
```typescript
interface PermissionException {
  id: string;
  memberId: string;
  
  // What access
  permission: string; // "view_claim", "approve_settlement"
  resourceType: string;
  resourceId: string | null; // null = all of type
  
  // Why
  reason: string;
  approvedBy: string; // Officer who granted
  approvalDate: Date;
  
  // When
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  
  // Audit
  usageCount: number;
  lastUsed: Date | null;
}

// Check permission with exceptions
async function hasPermission(
  memberId: string, 
  permission: string, 
  resourceId: string
): Promise<boolean> {
  // 1. Check role-based permission
  const rolePermission = await checkRolePermission(memberId, permission);
  if (rolePermission) return true;
  
  // 2. Check exceptions
  const exception = await findActiveException(
    memberId, 
    permission, 
    resourceId
  );
  if (exception && !isExpired(exception)) {
    await incrementUsageCount(exception.id);
    return true;
  }
  
  return false;
}
```

---

## Recommended Architecture for Enterprise RBAC

### Phase 1: Enhanced Role Model (Immediate - 1 week)

**Database Schema:**
```sql
-- Role definitions (organizational structure)
CREATE TABLE role_definitions (
  id UUID PRIMARY KEY,
  role_code VARCHAR(50) UNIQUE, -- "local_president", "dept_steward"
  role_name VARCHAR(200), -- "Local President"
  role_level INT, -- Hierarchy level
  is_elected BOOLEAN,
  requires_election_approval BOOLEAN,
  default_term_years INT,
  can_delegate BOOLEAN,
  parent_role_id UUID REFERENCES role_definitions(id),
  
  -- Permissions
  permissions JSONB, -- Array of permission strings
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Member role assignments
CREATE TABLE member_roles (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES organization_members(id),
  tenant_id UUID REFERENCES tenants(id),
  role_id UUID REFERENCES role_definitions(id),
  
  -- Scope (department, location, etc.)
  scope_type VARCHAR(50), -- "global", "department", "location"
  scope_value VARCHAR(200), -- e.g., "Manufacturing", "Plant A"
  
  -- Temporal
  start_date DATE NOT NULL,
  end_date DATE,
  term_years INT,
  next_election_date DATE,
  
  -- Election/Appointment
  assignment_type VARCHAR(20), -- "elected", "appointed", "acting"
  election_date DATE,
  elected_by VARCHAR(50), -- "membership", "board", "officer"
  vote_count INT,
  total_votes INT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- "active", "expired", "suspended"
  
  -- Acting/Delegation
  is_acting_role BOOLEAN DEFAULT FALSE,
  acting_for_member_id UUID REFERENCES organization_members(id),
  acting_reason TEXT,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP,
  updated_by UUID,
  
  -- Constraints
  UNIQUE(member_id, tenant_id, role_id, scope_type, scope_value)
);

-- Permission exceptions
CREATE TABLE permission_exceptions (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES organization_members(id),
  tenant_id UUID REFERENCES tenants(id),
  
  permission VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id UUID,
  
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES organization_members(id),
  approval_date TIMESTAMP DEFAULT NOW(),
  
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  revoked_by UUID,
  
  usage_count INT DEFAULT 0,
  last_used TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit log (immutable)
CREATE TABLE rbac_audit_log (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  
  actor_id UUID,
  actor_role VARCHAR(100),
  on_behalf_of UUID,
  
  action VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id UUID,
  
  tenant_id UUID,
  required_permission VARCHAR(100),
  granted BOOLEAN,
  denial_reason TEXT,
  
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(200),
  
  record_hash VARCHAR(64), -- SHA-256 hash
  previous_hash VARCHAR(64)
);

-- Indexes
CREATE INDEX idx_member_roles_member ON member_roles(member_id);
CREATE INDEX idx_member_roles_active ON member_roles(status) WHERE status = 'active';
CREATE INDEX idx_exceptions_member ON permission_exceptions(member_id);
CREATE INDEX idx_audit_timestamp ON rbac_audit_log(timestamp DESC);
CREATE INDEX idx_audit_actor ON rbac_audit_log(actor_id);
```

### Phase 2: Middleware Enhancement (1 week)

**New Middleware Functions:**
```typescript
// Enhanced role checking with scope
export async function withScopedRoleAuth(
  requiredRole: string,
  scopeType?: string, // "department", "location", etc.
  handler: (request, context: EnhancedRoleContext) => Promise<Response>
) {
  return withTenantAuth(async (request, tenantContext) => {
    const roles = await getMemberActiveRoles(
      tenantContext.userId, 
      tenantContext.tenantId
    );
    
    // Find matching role with scope
    const matchingRole = roles.find(r => 
      r.roleCode === requiredRole &&
      (scopeType ? r.scopeType === scopeType : true)
    );
    
    if (!matchingRole) {
      return NextResponse.json(
        { error: `Required: ${requiredRole} role` },
        { status: 403 }
      );
    }
    
    const context: EnhancedRoleContext = {
      ...tenantContext,
      roles, // All active roles
      primaryRole: matchingRole,
      permissions: await getEffectivePermissions(roles),
      scope: matchingRole.scope
    };
    
    return handler(request, context);
  });
}

// Permission-based checking with exceptions
export async function withPermission(
  permission: string,
  resourceType?: string,
  handler: (request, context) => Promise<Response>
) {
  return withTenantAuth(async (request, tenantContext) => {
    const resourceId = context.params?.id;
    
    // Check role-based permission
    const hasRolePermission = await checkRoleHasPermission(
      tenantContext.userId,
      tenantContext.tenantId,
      permission
    );
    
    // Check exceptions
    const hasException = !hasRolePermission && resourceId
      ? await checkPermissionException(
          tenantContext.userId,
          permission,
          resourceType,
          resourceId
        )
      : false;
    
    const granted = hasRolePermission || hasException;
    
    // Audit log
    await logPermissionCheck({
      actorId: tenantContext.userId,
      permission,
      resourceType,
      resourceId,
      granted,
      method: hasException ? 'exception' : 'role'
    });
    
    if (!granted) {
      return NextResponse.json(
        { error: `Permission denied: ${permission}` },
        { status: 403 }
      );
    }
    
    return handler(request, tenantContext);
  });
}
```

### Phase 3: UI Components (1 week)

**Role Management Admin:**
```typescript
// components/admin/RoleAssignmentManager.tsx
interface RoleAssignment {
  member: Member;
  role: RoleDefinition;
  scope?: { type: string; value: string };
  startDate: Date;
  endDate?: Date;
  electionDate?: Date;
}

function RoleAssignmentManager() {
  return (
    <div>
      <h2>Role Assignments</h2>
      
      {/* Filter by role type */}
      <RoleFilter />
      
      {/* Show members with expiring terms */}
      <ExpiringTermsAlert />
      
      {/* Assignment table */}
      <RoleAssignmentTable 
        columns={[
          'Member',
          'Role',
          'Scope',
          'Term Start',
          'Term End',
          'Election Due',
          'Status',
          'Actions'
        ]}
      />
      
      {/* Bulk assignment for new elections */}
      <BulkAssignDialog />
    </div>
  );
}
```

### Phase 4: Compliance & Reporting (1 week)

**Audit Reporting:**
```typescript
// Generate compliance report
async function generateComplianceReport(
  tenantId: string,
  startDate: Date,
  endDate: Date
) {
  return {
    summary: {
      totalActions: await countAuditLogs(tenantId, startDate, endDate),
      deniedActions: await countDeniedActions(tenantId, startDate, endDate),
      uniqueActors: await countUniqueActors(tenantId, startDate, endDate)
    },
    
    byRole: await groupActionsByRole(tenantId, startDate, endDate),
    
    highValueActions: await getHighValueActions(
      tenantId, 
      startDate, 
      endDate,
      ['approve_settlement', 'change_role', 'access_financial']
    ),
    
    suspiciousActivity: await detectAnomalies(tenantId, startDate, endDate),
    
    elections: {
      upcomingElections: await getUpcomingElections(tenantId, 90),
      expiredTerms: await getExpiredTerms(tenantId),
      pendingRoleChanges: await getPendingRoleChanges(tenantId)
    }
  };
}
```

---

## Migration Strategy

### Phase 1: Parallel Systems (Month 1)
- Keep current simple RBAC for basic operations
- Build new enhanced RBAC alongside
- Migrate one feature at a time (start with member management)

### Phase 2: Feature Parity (Month 2)
- All features support both systems
- Admin can choose which to use per tenant
- Small unions stay on simple system
- Large unions opt into enhanced system

### Phase 3: Full Migration (Month 3)
- All new tenants use enhanced RBAC
- Existing tenants migrated with assistance
- Simple RBAC becomes "compatibility layer"

### Phase 4: Advanced Features (Month 4+)
- Election management module
- Delegation workflows
- Cross-local reporting
- Compliance automation

---

## Specific Union Examples

### Example 1: UAW (United Auto Workers) - 400K members

**Structure:**
- International Union
- 8 Regions
- ~600 Locals
- Departments: Skilled Trades, Production, Parts & Service

**RBAC Needs:**
- Regional directors with region-wide visibility
- Local presidents with local-only admin
- Skilled trades stewards with department scope
- International officers with global read access
- Audit committee with financial permissions only

### Example 2: AFT (American Federation of Teachers) - 1.7M members

**Structure:**
- National AFT
- State federations (all 50 states)
- ~3,000 local unions
- Sectors: K-12, Higher Ed, Healthcare

**RBAC Needs:**
- State president can see all locals in state
- Local president isolated to their local
- Higher ed representatives different from K-12
- Healthcare locals have medical confidentiality requirements
- Bargaining unit chairs (temporary committee role)

### Example 3: SEIU (Service Employees International Union) - 2M members

**Structure:**
- International Union
- Multiple sectors (healthcare, public services, property services)
- State and regional councils
- Local unions

**RBAC Needs:**
- Healthcare locals need HIPAA-compliant access controls
- Public sector locals need sunshine law compliance
- Property services has multiple shifts (day/night/weekend)
- Multi-employer bargaining units
- Joint labor-management committees

---

## Performance Considerations

**Current Simple RBAC:**
- 1 DB query per request (getMemberByUserId)
- ~5ms overhead
- Works for 10K members

**Enhanced RBAC:**
- Multiple role queries needed
- Exception checking
- Audit logging on every action
- Potential: 20-50ms overhead

**Optimization Strategies:**
```typescript
// 1. Cache active roles per session
const roleCache = new Map<string, CachedRoles>();

// 2. Bulk permission checks
async function checkPermissionsBulk(
  userId: string,
  permissions: string[]
): Promise<Record<string, boolean>> {
  // Single query returns all permission results
}

// 3. Precompute effective permissions
// Store flattened permission set on member_roles table
UPDATE member_roles SET effective_permissions = (
  SELECT array_agg(DISTINCT permission)
  FROM role_definitions rd
  JOIN role_permissions rp ON rd.id = rp.role_id
  WHERE rd.id = member_roles.role_id
);

// 4. Async audit logging (don't block request)
await logPermissionCheck(data); // Non-blocking
```

---

## Estimated Development Time

**Minimum Viable Enterprise RBAC:**
- Phase 1 (Schema + queries): 1 week
- Phase 2 (Middleware): 1 week
- Phase 3 (UI): 1 week
- Phase 4 (Audit/reports): 1 week
- Testing & refinement: 1 week

**Total: 5-6 weeks for production-ready enterprise RBAC**

**ROI:**
- Large unions (50K+ members): Essential, will pay for itself
- Medium unions (5K-50K): Nice to have, simpler version may suffice
- Small unions (<5K): Overkill, current system adequate

---

## Conclusion

**Current RBAC Status:**
✅ Good for small-medium unions (under 10K members)
✅ Clean architecture, easy to extend
❌ Not ready for large/complex union structures
❌ Missing critical governance features
❌ Inadequate audit trail for compliance

**Recommendation:**
1. Keep current system as "Simple Mode"
2. Build enhanced system as "Enterprise Mode"
3. Let tenants choose based on complexity
4. Provide migration path as unions grow

**Priority Order:**
1. **HIGH**: Multi-role assignments (needed by 80% of unions)
2. **HIGH**: Term expiration tracking (union elections)
3. **HIGH**: Audit logging (compliance requirement)
4. **MEDIUM**: Department/scope limiting
5. **MEDIUM**: Permission exceptions
6. **LOW**: Delegation (handle manually for now)
7. **LOW**: Multi-local hierarchy (only largest unions)
