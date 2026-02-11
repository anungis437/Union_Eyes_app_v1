/**
 * Role-Based Access Control (RBAC) System
 * Union Claims Management System
 * 
 * Defines user roles, permissions, and access control logic
 */

// User roles in the system
export enum UserRole {
  ADMIN = "admin",
  CONGRESS_STAFF = "congress_staff",      // CLC/national congress staff
  FEDERATION_STAFF = "federation_staff",  // Provincial federation staff
  UNION_REP = "union_rep",
  STAFF_REP = "staff_rep",
  MEMBER = "member",
  GUEST = "guest"
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
  
  // Admin permissions
  MANAGE_USERS = "manage_users",
  MANAGE_ROLES = "manage_roles",
  SYSTEM_SETTINGS = "system_settings",
  VIEW_ADMIN_PANEL = "view_admin_panel",
}

// Role definitions with their permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.CONGRESS_STAFF]: [
    // Congress staff have highest cross-organizational visibility (read-only to respect local autonomy)
    // Claims & Members (view across all affiliated unions)
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
 */
export function getRoleLevel(role: UserRole): number {
  const levels: Record<UserRole, number> = {
    [UserRole.GUEST]: 0,
    [UserRole.MEMBER]: 1,
    [UserRole.STAFF_REP]: 2,
    [UserRole.UNION_REP]: 3,
    [UserRole.FEDERATION_STAFF]: 4,  // Provincial/regional scope
    [UserRole.CONGRESS_STAFF]: 5,     // National scope
    [UserRole.ADMIN]: 6,              // System-wide
  };
  return levels[role] ?? 0;
}

/**
 * Check if role1 has higher or equal privilege than role2
 */
export function hasHigherOrEqualRole(role1: UserRole, role2: UserRole): boolean {
  return getRoleLevel(role1) >= getRoleLevel(role2);
}

