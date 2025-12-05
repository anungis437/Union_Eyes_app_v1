'use client';

/**
 * Organization Context Provider
 * 
 * Provides organization context to the application, allowing components to:
 * - Access the current organization ID
 * - Get the list of organizations the user has access to
 * - Switch between organizations
 * - Load organization hierarchy for visualization
 * 
 * Uses cookie-based persistence for selected organization across sessions.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';

// Organization type definitions
export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: 'federation' | 'union' | 'local' | 'chapter';
  parentId: string | null;
  sector?: string;
  jurisdiction?: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  isPrimary: boolean;
  joinedAt: string;
}

export interface OrganizationContextValue {
  // Current organization
  organizationId: string | null;
  organization: Organization | null;
  isLoading: boolean;
  error: string | null;

  // User's organizations
  userOrganizations: Organization[];
  userMemberships: OrganizationMember[];
  
  // Organization hierarchy
  organizationTree: Organization[];
  organizationPath: Organization[];

  // Actions
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  loadOrganizationTree: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { userId, isLoaded: authLoaded } = useAuth();
  
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [userMemberships, setUserMemberships] = useState<OrganizationMember[]>([]);
  const [organizationTree, setOrganizationTree] = useState<Organization[]>([]);
  const [organizationPath, setOrganizationPath] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load user's organizations from API
   */
  const loadUserOrganizations = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get user's organization memberships
      const response = await fetch('/api/users/me/organizations', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load organizations');
      }

      const data = await response.json();
      setUserOrganizations(data.organizations || []);
      setUserMemberships(data.memberships || []);

      // If user has organizations, select the primary one or first available
      if (data.organizations && data.organizations.length > 0) {
        // Check if there's a selected organization in cookie
        const cookies = document.cookie.split(';');
        const selectedOrgCookie = cookies.find(c => c.trim().startsWith('selected_organization_id='));
        let selectedOrgId = selectedOrgCookie?.split('=')[1];

        // Validate that user has access to the selected organization
        const hasAccess = data.organizations.some((org: Organization) => org.id === selectedOrgId);
        
        if (!selectedOrgId || !hasAccess) {
          // Find primary organization
          const primaryMembership = data.memberships?.find((m: OrganizationMember) => m.isPrimary);
          selectedOrgId = primaryMembership?.organizationId || data.organizations[0]?.id || null;
        }

        setOrganizationId(selectedOrgId || null);

        // Load organization details
        const org = data.organizations.find((o: Organization) => o.id === selectedOrgId);
        if (org) {
          setOrganization(org);
          // Load organization path inline to avoid dependency issues
          const pathResponse = await fetch(`/api/organizations/${selectedOrgId}/path`);
          if (pathResponse.ok) {
            const pathResult = await pathResponse.json();
            setOrganizationPath(pathResult.data || []);
          }
        }
      }
    } catch (err) {
      console.error('Error loading organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Load organization hierarchy path (ancestors)
   */
  const loadOrganizationPath = useCallback(async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/path`);
      if (response.ok) {
        const result = await response.json();
        setOrganizationPath(result.data || []);
      }
    } catch (err) {
      console.error('Error loading organization path:', err);
    }
  }, []);

  /**
   * Load full organization tree for visualization
   */
  const loadOrganizationTree = useCallback(async () => {
    try {
      const response = await fetch('/api/organizations/tree');
      if (response.ok) {
        const result = await response.json();
        setOrganizationTree(result.data || []);
      }
    } catch (err) {
      console.error('Error loading organization tree:', err);
    }
  }, []);

  /**
   * Switch to a different organization
   */
  const switchOrganization = useCallback(async (newOrganizationId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if user has access to this organization
      // Note: Super admins can switch to any organization
      const hasAccess = userOrganizations.some(org => org.id === newOrganizationId);
      
      // If no direct access, check if user is super admin via API
      if (!hasAccess) {
        const userResponse = await fetch('/api/users/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          const isSuperAdmin = userData.role === 'super_admin' || userData.isSuperAdmin;
          if (!isSuperAdmin) {
            throw new Error('You do not have access to this organization');
          }
          // Super admin can access any organization
        } else {
          throw new Error('You do not have access to this organization');
        }
      }

      // Update cookie
      document.cookie = `selected_organization_id=${newOrganizationId}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year

      // Update state
      setOrganizationId(newOrganizationId);
      
      const org = userOrganizations.find(o => o.id === newOrganizationId);
      if (org) {
        setOrganization(org);
        await loadOrganizationPath(newOrganizationId);
      }

      // Reload the page to refresh all data with new organization context
      window.location.reload();
    } catch (err) {
      console.error('Error switching organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch organization');
      setIsLoading(false);
    }
  }, [userOrganizations, loadOrganizationPath]);

  /**
   * Refresh organizations list
   */
  const refreshOrganizations = useCallback(async () => {
    await loadUserOrganizations();
  }, [loadUserOrganizations]);

  // Load organizations when user is authenticated
  useEffect(() => {
    if (authLoaded) {
      if (userId) {
        loadUserOrganizations();
      } else {
        // User is not authenticated, stop loading
        setIsLoading(false);
      }
    }
  }, [authLoaded, userId, loadUserOrganizations]);

  // Set API cookie when organization changes
  useEffect(() => {
    if (organization) {
      console.log('[OrganizationContext] Setting API cookie for organization:', organization.slug);
      document.cookie = `active-organization=${organization.slug}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days
      console.log('[OrganizationContext] Cookie set:', `active-organization=${organization.slug}`);
    }
  }, [organization]);

  const value: OrganizationContextValue = {
    organizationId,
    organization,
    isLoading,
    error,
    userOrganizations,
    userMemberships,
    organizationTree,
    organizationPath,
    switchOrganization,
    refreshOrganizations,
    loadOrganizationTree,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * Hook to access organization context
 */
export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

/**
 * Hook to get current organization ID
 */
export function useOrganizationId(): string | null {
  const { organizationId } = useOrganization();
  return organizationId;
}

/**
 * Hook to get user's organizations
 */
export function useUserOrganizations(): Organization[] {
  const { userOrganizations } = useOrganization();
  return userOrganizations;
}

/**
 * Hook to switch organizations
 */
export function useSwitchOrganization(): (organizationId: string) => Promise<void> {
  const { switchOrganization } = useOrganization();
  return switchOrganization;
}
