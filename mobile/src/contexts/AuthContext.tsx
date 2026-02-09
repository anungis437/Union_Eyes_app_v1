import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';
import { User, Organization, AuthError } from '@/types/auth';
import { authService } from '@/services/auth';
import { sessionManager } from '@/services/session-manager';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'expo-router';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Methods
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Permissions
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isLoaded, isSignedIn, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();

  const { user, organization, setUser, setOrganization } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from Clerk
  useEffect(() => {
    const initAuth = async () => {
      if (!isLoaded) return;

      try {
        if (isSignedIn && clerkUser) {
          // Map Clerk user to app user
          const appUser: User = {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            firstName: clerkUser.firstName || '',
            lastName: clerkUser.lastName || '',
            imageUrl: clerkUser.imageUrl,
            phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber,
            // These would come from your backend/metadata
            organizationId: clerkUser.publicMetadata?.organizationId as string,
            organizationName: clerkUser.publicMetadata?.organizationName as string,
            role: clerkUser.publicMetadata?.role as string,
            permissions: clerkUser.publicMetadata?.permissions as string[],
          };

          setUser(appUser);

          // Initialize session manager
          await sessionManager.initialize();
        } else {
          setUser(null);
          setOrganization(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [isLoaded, isSignedIn, clerkUser]);

  // Handle session expiration
  useEffect(() => {
    sessionManager.initialize();

    return () => {
      sessionManager.destroy();
    };
  }, []);

  const signOut = async () => {
    try {
      await authService.signOut();
      await clerkSignOut();
      sessionManager.destroy();
      setUser(null);
      setOrganization(null);
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    // Force refresh user data from Clerk
    if (clerkUser) {
      await clerkUser.reload();
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user?.role) return false;
    return user.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user?.role) return false;
    return roles.includes(user.role);
  };

  const hasAllRoles = (roles: string[]): boolean => {
    if (!user?.role) return false;
    return roles.every((role) => role === user.role);
  };

  const value: AuthContextType = {
    user,
    organization,
    isLoading: isLoading || !isLoaded,
    isAuthenticated: isSignedIn || false,
    signOut,
    refreshUser,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// Auth guard hooks
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/sign-in');
    }
  }, [isAuthenticated, isLoading]);

  return { isAuthenticated, isLoading };
}

export function useRequireRole(role: string | string[]) {
  const { user, isLoading, hasRole, hasAnyRole } = useAuth();
  const router = useRouter();

  const roles = Array.isArray(role) ? role : [role];
  const hasRequiredRole = Array.isArray(role) ? hasAnyRole(roles) : hasRole(role);

  useEffect(() => {
    if (!isLoading && user && !hasRequiredRole) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, hasRequiredRole]);

  return { hasRequiredRole, isLoading };
}

export function useRequirePermission(permission: string | string[]) {
  const { user, isLoading, hasPermission } = useAuth();
  const router = useRouter();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasRequiredPermission = permissions.every((p) => hasPermission(p));

  useEffect(() => {
    if (!isLoading && user && !hasRequiredPermission) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, hasRequiredPermission]);

  return { hasRequiredPermission, isLoading };
}
