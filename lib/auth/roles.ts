/**
 * Role-Based Access Control (RBAC) System
 * Union Claims Management System with CLC Integration
 * 
 * Defines user roles, permissions, and access control logic
 * Includes cross-organizational hierarchy for Canadian Labour Congress (CLC)
 */

// User roles in the system - aligned with ROLE_HIERARCHY
export enum UserRole {
  // System Administration
  SYSTEM_ADMIN = "system_admin",
  
  // CLC National (Congress) Level
  CLC_EXECUTIVE = "clc_executive",      // CLC President, Secretary-Treasurer
  CLC_STAFF = "clc_staff",              // CLC national staff
  
  // Federation Level
  FED_EXECUTIVE = "fed_executive",      // Federation President, VP
  FED_STAFF = "fed_staff",              // Provincial federation staff
  
  // Union National Level
  NATIONAL_OFFICER = "national_officer",
  
  // Local Union Executives
  ADMIN = "admin",
  PRESIDENT = "president",
  VICE_PRESIDENT = "vice_president",
  SECRETARY_TREASURER = "secretary_treasurer",
  
  // Senior Representatives
  CHIEF_STEWARD = "chief_steward",
  OFFICER = "officer",
  
  // Front-line Representatives
  STEWARD = "steward",
  BARGAINING_COMMITTEE = "bargaining_committee",
  
  // Specialized Representatives
  HEALTH_SAFETY_REP = "health_safety_rep",
  
  // Base Membership
  MEMBER = "member",
  
  // Legacy (for backward compatibility)
  GUEST = "guest",
  CONGRESS_STAFF = "congress_staff",      // Deprecated: Use CLC_STAFF
  FEDERATION_STAFF = "federation_staff",  // Deprecated: Use FED_STAFF
  UNION_REP = "union_rep",                // Deprecated: Use STEWARD
  STAFF_REP = "staff_rep",                // Deprecated: Use STEWARD
}

// Permissions that can be assigned to roles
export enum Permission {
  // Claims permissions
  VIEW_ALL_CLAIMS = "view_all_claims",
  VIEW_OWN_CLAIMS = "view_own_claims",
  CREATE_CLAIM = "create_claim",
  EDIT_ALL_CLAIMS = "edit_all_claims",
  EDIT_OWN_CLAIMS = "edit_own_claims",
  DELETE_CLAIM = "delete_claim",
  APPROVE_CLAIM = "approve_claim",
  
  // Member permissions
  VIEW_ALL_MEMBERS = "view_all_members",
  VIEW_OWN_PROFILE = "view_own_profile",
  EDIT_MEMBER = "edit_member",
  DELETE_MEMBER = "delete_member",
  INVITE_MEMBER = "invite_member",
  
  // Voting permissions
  VIEW_VOTING = "view_voting",
  CREATE_VOTE = "create_vote",
  CAST_VOTE = "cast_vote",
  MANAGE_VOTING = "manage_voting",
  VIEW_VOTE_RESULTS = "view_vote_results",
  
  // CBA permissions
  VIEW_CBA = "view_cba",
  EDIT_CBA = "edit_cba",
  CREATE_CBA = "create_cba",
  DELETE_CBA = "delete_cba",
  SIGN_CBA = "sign_cba",                           // President/authorized signatory
  RATIFY_CBA = "ratify_cba",                       // Membership ratification
  CONTRACT_ADMINISTRATION = "contract_administration", // Bargaining chair
  
  // Financial permissions
  VIEW_FINANCIAL = "view_financial",
  EDIT_FINANCIAL = "edit_financial",
  APPROVE_FINANCIAL = "approve_financial",
  MANAGE_FINANCES = "manage_finances",              // Secretary-Treasurer
  AUDIT_FINANCES = "audit_finances",
  
  // Governance permissions
  APPOINT_COMMITTEES = "appoint_committees",        // Executive officers
  MANAGE_ELECTIONS = "manage_elections",
  DELEGATE_AUTHORITY = "delegate_authority",
  APPROVE_APPOINTMENTS = "approve_appointments",
  
  // Claims assignment
  ASSIGN_CLAIMS = "assign_claims",                  // Chief steward, stewards
  
  // Health & Safety permissions
  VIEW_HEALTH_SAFETY_CLAIMS = "view_health_safety_claims",
  CREATE_HEALTH_SAFETY_CLAIM = "create_health_safety_claim",
  MANAGE_HEALTH_SAFETY = "manage_health_safety",
  
  // Analytics permissions
  VIEW_ANALYTICS = "view_analytics",
  VIEW_ADVANCED_ANALYTICS = "view_advanced_analytics",
  
  // Cross-organizational permissions (Congress/Federation)
  VIEW_CROSS_UNION_ANALYTICS = "view_cross_union_analytics",
  MANAGE_CROSS_UNION_ANALYTICS = "manage_cross_union_analytics",
  VIEW_PRECEDENT_DATABASE = "view_precedent_database",
  MANAGE_PRECEDENT_DATABASE = "manage_precedent_database",
  VIEW_CLAUSE_LIBRARY = "view_clause_library",
  MANAGE_CLAUSE_LIBRARY = "manage_clause_library",
  VIEW_FEDERATION_ANALYTICS = "view_federation_analytics",
  VIEW_CONGRESS_ANALYTICS = "view_congress_analytics",
  MANAGE_AFFILIATES = "manage_affiliates",
  VIEW_ALL_ORGANIZATIONS = "view_all_organizations",
  MANAGE_ORGANIZATIONS = "manage_organizations",
  VIEW_COMPLIANCE_REPORTS = "view_compliance_reports",
  MANAGE_SECTOR_ANALYTICS = "manage_sector_analytics",
  
  // CLC-specific permissions
  CLC_EXECUTIVE_DASHBOARD = "clc_executive_dashboard",
  MANAGE_CLC_REMITTANCES = "manage_clc_remittances",
  VIEW_CLC_REMITTANCES = "view_clc_remittances",
  MANAGE_AFFILIATE_SYNC = "manage_affiliate_sync",
  CLC_COMPLIANCE_REPORTS = "clc_compliance_reports",
  
  // Federation-specific permissions
  FEDERATION_DASHBOARD = "federation_dashboard",
  VIEW_PROVINCIAL_AFFILIATES = "view_provincial_affiliates",
  MANAGE_PROVINCIAL_AFFILIATES = "manage_provincial_affiliates",
  VIEW_PROVINCIAL_REMITTANCES = "view_provincial_remittances",
  PROVINCIAL_COMPLIANCE = "provincial_compliance",
  MANAGE_AFFILIATES = "manage_affiliates",
  VIEW_ALL_ORGANIZATIONS = "view_all_organizations",
  MANAGE_ORGANIZATIONS = "manage_organizations",
  VIEW_COMPLIANCE_REPORTS = "view_compliance_reports",
  MANAGE_SECTOR_ANALYTICS = "manage_sector_analytics",
  
  // Admin permissions
  MANAGE_USERS = "manage_users",
  MANAGE_ROLES = "manage_roles",
  SYSTEM_SETTINGS = "system_settings",
  VIEW_ADMIN_PANEL = "view_admin_panel",
}

// Role definitions with their permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SYSTEM_ADMIN]: [
    // System administrators have complete access to all features
    Permission.VIEW_ALL_CLAIMS,
    Permission.VIEW_OWN_CLAIMS,
    Permission.CREATE_CLAIM,
    Permission.EDIT_ALL_CLAIMS,
    Permission.EDIT_OWN_CLAIMS,
    Permission.DELETE_CLAIM,
    Permission.APPROVE_CLAIM,
    Permission.VIEW_ALL_MEMBERS,
    Permission.VIEW_OWN_PROFILE,
    Permission.EDIT_MEMBER,
    Permission.DELETE_MEMBER,
    Permission.INVITE_MEMBER,
    Permission.VIEW_VOTING,
    Permission.CREATE_VOTE,
    Permission.CAST_VOTE,
    Permission.MANAGE_VOTING,
    Permission.VIEW_VOTE_RESULTS,
    Permission.VIEW_CBA,
    Permission.EDIT_CBA,
    Permission.CREATE_CBA,
    Permission.DELETE_CBA,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    Permission.MANAGE_USERS,
    Permission.MANAGE_ROLES,
    Permission.SYSTEM_SETTINGS,
    Permission.VIEW_ADMIN_PANEL,
    // CLC & Federation permissions
    Permission.CLC_EXECUTIVE_DASHBOARD,
    Permission.MANAGE_CLC_REMITTANCES,
    Permission.VIEW_CLC_REMITTANCES,
    Permission.MANAGE_AFFILIATE_SYNC,
    Permission.CLC_COMPLIANCE_REPORTS,
    Permission.FEDERATION_DASHBOARD,
    Permission.VIEW_PROVINCIAL_AFFILIATES,
    Permission.MANAGE_PROVINCIAL_AFFILIATES,
    Permission.VIEW_PROVINCIAL_REMITTANCES,
    Permission.PROVINCIAL_COMPLIANCE,
    Permission.VIEW_CROSS_UNION_ANALYTICS,
    Permission.MANAGE_CROSS_UNION_ANALYTICS,
    Permission.VIEW_CONGRESS_ANALYTICS,
    Permission.VIEW_FEDERATION_ANALYTICS,
    Permission.VIEW_ALL_ORGANIZATIONS,
    Permission.MANAGE_ORGANIZATIONS,
    Permission.VIEW_COMPLIANCE_REPORTS,
    Permission.MANAGE_SECTOR_ANALYTICS,
    Permission.VIEW_PRECEDENT_DATABASE,
    Permission.MANAGE_PRECEDENT_DATABASE,
    Permission.VIEW_CLAUSE_LIBRARY,
    Permission.MANAGE_CLAUSE_LIBRARY,
    Permission.MANAGE_AFFILIATES,
  ],
  
  [UserRole.CLC_EXECUTIVE]: [
    // CLC President, Secretary-Treasurer - executive oversight of entire CLC
    Permission.VIEW_ALL_CLAIMS,
    Permission.VIEW_OWN_CLAIMS,
    Permission.VIEW_ALL_MEMBERS,
    Permission.VIEW_OWN_PROFILE,
    
    // CLC Executive Dashboard & Remittances
    Permission.CLC_EXECUTIVE_DASHBOARD,
    Permission.MANAGE_CLC_REMITTANCES,
    Permission.VIEW_CLC_REMITTANCES,
    Permission.MANAGE_AFFILIATE_SYNC,
    Permission.CLC_COMPLIANCE_REPORTS,
    
    // Cross-organizational features (full access)
    Permission.VIEW_CROSS_UNION_ANALYTICS,
    Permission.MANAGE_CROSS_UNION_ANALYTICS,
    Permission.VIEW_CONGRESS_ANALYTICS,
    Permission.VIEW_FEDERATION_ANALYTICS,
    Permission.VIEW_ALL_ORGANIZATIONS,
    Permission.MANAGE_ORGANIZATIONS,
    Permission.VIEW_COMPLIANCE_REPORTS,
    Permission.MANAGE_SECTOR_ANALYTICS,
    
    // Shared knowledge resources (full management)
    Permission.VIEW_PRECEDENT_DATABASE,
    Permission.MANAGE_PRECEDENT_DATABASE,
    Permission.VIEW_CLAUSE_LIBRARY,
    Permission.MANAGE_CLAUSE_LIBRARY,
    
    // Collective agreements & voting (view only)
    Permission.VIEW_CBA,
    Permission.VIEW_VOTING,
    Permission.VIEW_VOTE_RESULTS,
    
    // Analytics (advanced access)
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    
    // Affiliate management
    Permission.MANAGE_AFFILIATES,
  ],
  
  [UserRole.CLC_STAFF]: [
    // CLC national staff - operational support for CLC
    Permission.VIEW_ALL_CLAIMS,
    Permission.VIEW_OWN_CLAIMS,
    Permission.VIEW_ALL_MEMBERS,
    Permission.VIEW_OWN_PROFILE,
    
    // CLC Staff operations
    Permission.VIEW_CLC_REMITTANCES,
    Permission.MANAGE_AFFILIATE_SYNC,
    Permission.CLC_COMPLIANCE_REPORTS,
    
    // Cross-organizational features (full access)
    Permission.VIEW_CROSS_UNION_ANALYTICS,
    Permission.MANAGE_CROSS_UNION_ANALYTICS,
    Permission.VIEW_CONGRESS_ANALYTICS,
    Permission.VIEW_FEDERATION_ANALYTICS,
    Permission.VIEW_ALL_ORGANIZATIONS,
    Permission.VIEW_COMPLIANCE_REPORTS,
    Permission.MANAGE_SECTOR_ANALYTICS,
    
    // Shared knowledge resources (full management)
    Permission.VIEW_PRECEDENT_DATABASE,
    Permission.MANAGE_PRECEDENT_DATABASE,
    Permission.VIEW_CLAUSE_LIBRARY,
    Permission.MANAGE_CLAUSE_LIBRARY,
    
    // Collective agreements & voting (view only)
    Permission.VIEW_CBA,
    Permission.VIEW_VOTING,
    Permission.VIEW_VOTE_RESULTS,
    
    // Analytics (advanced access)
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    
    // Affiliate management (view and support)
    Permission.VIEW_ALL_ORGANIZATIONS,
    Permission.MANAGE_AFFILIATES,
  ],
  
  [UserRole.FED_EXECUTIVE]: [
    // Federation President, VP - executive oversight of provincial federation
    Permission.VIEW_ALL_CLAIMS,
    Permission.VIEW_OWN_CLAIMS,
    Permission.VIEW_ALL_MEMBERS,
    Permission.VIEW_OWN_PROFILE,
    
    // Federation Executive Dashboard
    Permission.FEDERATION_DASHBOARD,
    Permission.VIEW_PROVINCIAL_AFFILIATES,
    Permission.MANAGE_PROVINCIAL_AFFILIATES,
    Permission.VIEW_PROVINCIAL_REMITTANCES,
    Permission.PROVINCIAL_COMPLIANCE,
    
    // Cross-organizational features (scoped to federation)
    Permission.VIEW_CROSS_UNION_ANALYTICS,
    Permission.VIEW_FEDERATION_ANALYTICS,
    Permission.VIEW_ALL_ORGANIZATIONS,
    Permission.VIEW_COMPLIANCE_REPORTS,
    
    // Shared knowledge resources (view and contribute)
    Permission.VIEW_PRECEDENT_DATABASE,
    Permission.MANAGE_PRECEDENT_DATABASE,
    Permission.VIEW_CLAUSE_LIBRARY,
    Permission.MANAGE_CLAUSE_LIBRARY,
    
    // Collective agreements & voting (view only)
    Permission.VIEW_CBA,
    Permission.VIEW_VOTING,
    Permission.VIEW_VOTE_RESULTS,
    
    // Analytics (advanced access within federation)
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    
    // Affiliate management (within federation)
    Permission.MANAGE_AFFILIATES,
  ],
  
  [UserRole.FED_STAFF]: [
    // Provincial federation staff - operational support
    Permission.VIEW_ALL_CLAIMS,
    Permission.VIEW_OWN_CLAIMS,
    Permission.VIEW_ALL_MEMBERS,
    Permission.VIEW_OWN_PROFILE,
    
    // Federation operations
    Permission.FEDERATION_DASHBOARD,
    Permission.VIEW_PROVINCIAL_AFFILIATES,
    Permission.VIEW_PROVINCIAL_REMITTANCES,
    Permission.PROVINCIAL_COMPLIANCE,
    
    // Cross-organizational features (scoped to federation)
    Permission.VIEW_CROSS_UNION_ANALYTICS,
    Permission.VIEW_FEDERATION_ANALYTICS,
    Permission.VIEW_ALL_ORGANIZATIONS,
    Permission.VIEW_COMPLIANCE_REPORTS,
    
    // Shared knowledge resources (view and contribute)
    Permission.VIEW_PRECEDENT_DATABASE,
    Permission.MANAGE_PRECEDENT_DATABASE,
    Permission.VIEW_CLAUSE_LIBRARY,
    Permission.MANAGE_CLAUSE_LIBRARY,
    
    // Collective agreements & voting (view only)
    Permission.VIEW_CBA,
    Permission.VIEW_VOTING,
    Permission.VIEW_VOTE_RESULTS,
    
    // Analytics (advanced access within federation)
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    
    // Affiliate management (within federation)
    Permission.MANAGE_AFFILIATES,
  ],
  
  [UserRole.NATIONAL_OFFICER]: [
    // National union officers - leadership at union level
    Permission.VIEW_ALL_CLAIMS,
    Permission.VIEW_OWN_CLAIMS,
    Permission.CREATE_CLAIM,
    Permission.EDIT_ALL_CLAIMS,
    Permission.EDIT_OWN_CLAIMS,
    Permission.APPROVE_CLAIM,
    Permission.VIEW_ALL_MEMBERS,
    Permission.VIEW_OWN_PROFILE,
    Permission.EDIT_MEMBER,
    Permission.INVITE_MEMBER,
    Permission.VIEW_VOTING,
    Permission.CREATE_VOTE,
    Permission.CAST_VOTE,
    Permission.MANAGE_VOTING,
    Permission.VIEW_VOTE_RESULTS,
    Permission.VIEW_CBA,
    Permission.EDIT_CBA,
    Permission.CREATE_CBA,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    Permission.VIEW_PRECEDENT_DATABASE,
    Permission.MANAGE_PRECEDENT_DATABASE,
    Permission.VIEW_CLAUSE_LIBRARY,
    Permission.MANAGE_CLAUSE_LIBRARY,
  ],
  
  [UserRole.CONGRESS_STAFF]: [
    // Legacy role - maps to CLC_STAFF (deprecated)
    Permission.VIEW_ALL_CLAIMS,
    Permission.VIEW_OWN_CLAIMS,
    Permission.VIEW_ALL_MEMBERS,
    Permission.VIEW_OWN_PROFILE,
    
    // Cross-organizational features (full access)
    Permission.VIEW_CROSS_UNION_ANALYTICS,
    Permission.MANAGE_CROSS_UNION_ANALYTICS,
    Permission.VIEW_CONGRESS_ANALYTICS,
    Permission.VIEW_FEDERATION_ANALYTICS,
    Permission.VIEW_ALL_ORGANIZATIONS,
    Permission.VIEW_COMPLIANCE_REPORTS,
    Permission.MANAGE_SECTOR_ANALYTICS,
    
    // Shared knowledge resources (full management)
    Permission.VIEW_PRECEDENT_DATABASE,
    Permission.MANAGE_PRECEDENT_DATABASE,
    Permission.VIEW_CLAUSE_LIBRARY,
    Permission.MANAGE_CLAUSE_LIBRARY,
    
    // Collective agreements & voting (view only)
    Permission.VIEW_CBA,
    Permission.VIEW_VOTING,
    Permission.VIEW_VOTE_RESULTS,
    
    // Analytics (advanced access)
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    
    // Affiliate management
    Permission.VIEW_ALL_ORGANIZATIONS,
    Permission.MANAGE_AFFILIATES,
  ],
  
  [UserRole.FEDERATION_STAFF]: [
    // Federation staff have provincial/regional cross-organizational visibility
    // Claims & Members (view across federation affiliates only)
    Permission.VIEW_ALL_CLAIMS,
    Permission.VIEW_OWN_CLAIMS,
    Permission.VIEW_ALL_MEMBERS,
    Permission.VIEW_OWN_PROFILE,
    
    // Cross-organizational features (scoped to federation)
    Permission.VIEW_CROSS_UNION_ANALYTICS,
    Permission.VIEW_FEDERATION_ANALYTICS,
    Permission.VIEW_ALL_ORGANIZATIONS,
    Permission.VIEW_COMPLIANCE_REPORTS,
    
    // Shared knowledge resources (view and contribute)
    Permission.VIEW_PRECEDENT_DATABASE,
    Permission.MANAGE_PRECEDENT_DATABASE,
    Permission.VIEW_CLAUSE_LIBRARY,
    Permission.MANAGE_CLAUSE_LIBRARY,
    
    // Collective agreements & voting (view only)
    Permission.VIEW_CBA,
    Permission.VIEW_VOTING,
    Permission.VIEW_VOTE_RESULTS,
    
    // Analytics (advanced access within federation)
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    
    // Affiliate management (within federation)
    Permission.MANAGE_AFFILIATES,
  ],
  
  [UserRole.ADMIN]: [
    // Full access to everything
    Permission.VIEW_ALL_CLAIMS,
    Permission.VIEW_OWN_CLAIMS,
    Permission.CREATE_CLAIM,
    Permission.EDIT_ALL_CLAIMS,
    Permission.EDIT_OWN_CLAIMS,
    Permission.DELETE_CLAIM,
    Permission.APPROVE_CLAIM,
    Permission.VIEW_ALL_MEMBERS,
    Permission.VIEW_OWN_PROFILE,
    Permission.EDIT_MEMBER,
    Permission.DELETE_MEMBER,
    Permission.INVITE_MEMBER,
    Permission.VIEW_VOTING,
    Permission.CREATE_VOTE,
    Permission.CAST_VOTE,
    Permission.MANAGE_VOTING,
    Permission.VIEW_VOTE_RESULTS,
    Permission.VIEW_CBA,
    Permission.EDIT_CBA,
    Permission.CREATE_CBA,
    Permission.DELETE_CBA,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    Permission.MANAGE_USERS,
    Permission.MANAGE_ROLES,
    Permission.SYSTEM_SETTINGS,
    Permission.VIEW_ADMIN_PANEL,
  ],
  
  [UserRole.UNION_REP]: [
    // Union representatives have broad access
    Permission.VIEW_ALL_CLAIMS,
    Permission.VIEW_OWN_CLAIMS,
    Permission.CREATE_CLAIM,
    Permission.EDIT_ALL_CLAIMS,
    Permission.EDIT_OWN_CLAIMS,
    Permission.APPROVE_CLAIM,
    Permission.VIEW_ALL_MEMBERS,
    Permission.VIEW_OWN_PROFILE,
    Permission.EDIT_MEMBER,
    Permission.INVITE_MEMBER,
    Permission.VIEW_VOTING,
    Permission.CREATE_VOTE,
    Permission.CAST_VOTE,
    Permission.MANAGE_VOTING,
    Permission.VIEW_VOTE_RESULTS,
    Permission.VIEW_CBA,
    Permission.EDIT_CBA,
    Permission.CREATE_CBA,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
  ],
  
  [UserRole.STAFF_REP]: [
    // Staff representatives have moderate access
    Permission.VIEW_ALL_CLAIMS,
    Permission.VIEW_OWN_CLAIMS,
    Permission.CREATE_CLAIM,
    Permission.EDIT_OWN_CLAIMS,
    Permission.VIEW_ALL_MEMBERS,
    Permission.VIEW_OWN_PROFILE,
    Permission.VIEW_VOTING,
    Permission.CAST_VOTE,
    Permission.VIEW_CBA,
    Permission.VIEW_ANALYTICS,
  ],
  
  [UserRole.MEMBER]: [
    // Members have limited access to their own data
    Permission.VIEW_OWN_CLAIMS,
    Permission.CREATE_CLAIM,
    Permission.EDIT_OWN_CLAIMS,
    Permission.VIEW_OWN_PROFILE,
    Permission.VIEW_VOTING,
    Permission.CAST_VOTE,
    Permission.VIEW_CBA,
  ],
  
  [UserRole.GUEST]: [
    // Guests have minimal read-only access
    Permission.VIEW_OWN_PROFILE,
  ],
};

// Route access control - maps routes to required permissions
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  "/dashboard": [], // All authenticated users
  "/dashboard/claims": [Permission.VIEW_OWN_CLAIMS],
  "/dashboard/members": [Permission.VIEW_ALL_MEMBERS],
  "/dashboard/voting": [Permission.VIEW_VOTING],
  "/dashboard/collective-agreements": [Permission.VIEW_CBA],
  "/dashboard/analytics": [Permission.VIEW_ANALYTICS],
  "/dashboard/settings": [], // All authenticated users
  
  // Cross-organizational routes (Congress/Federation)
  "/dashboard/cross-union-analytics": [Permission.VIEW_CROSS_UNION_ANALYTICS],
  "/dashboard/precedents": [Permission.VIEW_PRECEDENT_DATABASE],
  "/dashboard/clause-library": [Permission.VIEW_CLAUSE_LIBRARY],
  "/dashboard/organizations": [Permission.VIEW_ALL_ORGANIZATIONS],
  "/dashboard/compliance": [Permission.VIEW_COMPLIANCE_REPORTS],
  "/dashboard/federation": [Permission.VIEW_FEDERATION_ANALYTICS],
  "/dashboard/congress": [Permission.VIEW_CONGRESS_ANALYTICS],
  
  "/admin": [Permission.VIEW_ADMIN_PANEL],
  "/admin/claims": [Permission.VIEW_ALL_CLAIMS, Permission.VIEW_ADMIN_PANEL],
  "/admin/members": [Permission.MANAGE_USERS, Permission.VIEW_ADMIN_PANEL],
  "/admin/voting": [Permission.MANAGE_VOTING, Permission.VIEW_ADMIN_PANEL],
  "/admin/analytics": [Permission.VIEW_ADVANCED_ANALYTICS, Permission.VIEW_ADMIN_PANEL],
  "/admin/settings": [Permission.SYSTEM_SETTINGS, Permission.VIEW_ADMIN_PANEL],
  "/admin/organizations": [Permission.MANAGE_ORGANIZATIONS, Permission.VIEW_ADMIN_PANEL],
};

// Navigation items with required permissions
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  requiredPermissions: Permission[];
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "Home",
    requiredPermissions: [],
  },
  {
    href: "/dashboard/claims",
    label: "My Claims",
    icon: "FileText",
    requiredPermissions: [Permission.VIEW_OWN_CLAIMS],
  },
  {
    href: "/dashboard/collective-agreements",
    label: "Collective Agreements",
    icon: "BookOpen",
    requiredPermissions: [Permission.VIEW_CBA],
  },
  {
    href: "/dashboard/voting",
    label: "Voting",
    icon: "Vote",
    requiredPermissions: [Permission.VIEW_VOTING],
  },
  {
    href: "/dashboard/members",
    label: "Members",
    icon: "Users",
    requiredPermissions: [Permission.VIEW_ALL_MEMBERS],
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: "TrendingUp",
    requiredPermissions: [Permission.VIEW_ANALYTICS],
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: "Settings",
    requiredPermissions: [],
  },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: "LayoutDashboard",
    requiredPermissions: [Permission.VIEW_ADMIN_PANEL],
    adminOnly: true,
  },
  {
    href: "/admin/claims",
    label: "Claims Management",
    icon: "FileText",
    requiredPermissions: [Permission.VIEW_ALL_CLAIMS, Permission.VIEW_ADMIN_PANEL],
    adminOnly: true,
  },
  {
    href: "/admin/members",
    label: "Members",
    icon: "Users",
    requiredPermissions: [Permission.MANAGE_USERS, Permission.VIEW_ADMIN_PANEL],
    adminOnly: true,
  },
  {
    href: "/admin/voting",
    label: "Voting Admin",
    icon: "Vote",
    requiredPermissions: [Permission.MANAGE_VOTING, Permission.VIEW_ADMIN_PANEL],
    adminOnly: true,
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: "TrendingUp",
    requiredPermissions: [Permission.VIEW_ADVANCED_ANALYTICS, Permission.VIEW_ADMIN_PANEL],
    adminOnly: true,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: "Settings",
    requiredPermissions: [Permission.SYSTEM_SETTINGS, Permission.VIEW_ADMIN_PANEL],
    adminOnly: true,
  },
];

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the required permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  if (permissions.length === 0) return true; // No permissions required
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all required permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  if (permissions.length === 0) return true; // No permissions required
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Check if a role can access a specific route
 */
export function canAccessRoute(role: UserRole, route: string): boolean {
  const requiredPermissions = ROUTE_PERMISSIONS[route];
  if (!requiredPermissions) return true; // Route not defined, allow access
  return hasAllPermissions(role, requiredPermissions);
}

/**
 * Get filtered navigation items based on user role
 */
export function getAccessibleNavItems(role: UserRole, adminMode: boolean = false): NavItem[] {
  const items = adminMode ? ADMIN_NAV_ITEMS : NAV_ITEMS;
  return items.filter(item => hasAllPermissions(role, item.requiredPermissions));
}

/**
 * Get role hierarchy level (higher number = more permissions)
 * 
 * Role Hierarchy:
 * 200: SYSTEM_ADMIN (CLC IT / System operators)
 * 190: CLC_EXECUTIVE (CLC President, Secretary-Treasurer)
 * 180: CLC_STAFF (CLC national staff)
 * 170: FED_EXECUTIVE (Federation President, VP)
 * 160: FED_STAFF (Provincial federation staff)
 * 150: NATIONAL_OFFICER (National union officers)
 * 140-100: Local union executives (ADMIN, PRESIDENT, VP, SECRETARY_TREASURER)
 * 90-60: Senior representatives (CHIEF_STEWARD, OFFICER)
 * 50-40: Front-line representatives (STEWARD, BARGAINING_COMMITTEE)
 * 30: Specialized representatives (HEALTH_SAFETY_REP)
 * 20-10: Base membership (MEMBER)
 * 0: GUEST
 * 
 * Legacy roles map to their equivalent new roles
 */
export function getRoleLevel(role: UserRole): number {
  const levels: Record<UserRole, number> = {
    [UserRole.SYSTEM_ADMIN]: 200,
    [UserRole.CLC_EXECUTIVE]: 190,
    [UserRole.CLC_STAFF]: 180,
    [UserRole.FED_EXECUTIVE]: 170,
    [UserRole.FED_STAFF]: 160,
    [UserRole.NATIONAL_OFFICER]: 150,
    [UserRole.ADMIN]: 140,
    [UserRole.PRESIDENT]: 130,
    [UserRole.VICE_PRESIDENT]: 120,
    [UserRole.SECRETARY_TREASURER]: 110,
    [UserRole.CHIEF_STEWARD]: 90,
    [UserRole.OFFICER]: 80,
    [UserRole.STEWARD]: 50,
    [UserRole.BARGAINING_COMMITTEE]: 40,
    [UserRole.HEALTH_SAFETY_REP]: 30,
    [UserRole.MEMBER]: 20,
    // Legacy roles
    [UserRole.CONGRESS_STAFF]: 180,      // Maps to CLC_STAFF
    [UserRole.FEDERATION_STAFF]: 160,    // Maps to FED_STAFF
    [UserRole.UNION_REP]: 50,            // Maps to STEWARD
    [UserRole.STAFF_REP]: 50,            // Maps to STEWARD
    [UserRole.GUEST]: 0,
  };
  return levels[role] ?? 0;
}

/**
 * Check if role1 has higher or equal privilege than role2
 */
export function hasHigherOrEqualRole(role1: UserRole, role2: UserRole): boolean {
  return getRoleLevel(role1) >= getRoleLevel(role2);
}

