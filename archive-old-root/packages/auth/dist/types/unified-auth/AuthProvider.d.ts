/**
 * @fileoverview Unified Authentication Provider
 *
 * Central authentication context provider for all 17 CourtLens applications.
 * Provides SSO functionality, session management, and authentication state.
 */
import React from 'react';
import { User, Session } from '@supabase/supabase-js';
import type { UserRole, Permission } from '../rbac';
export interface AuthUser extends User {
    organizationId?: string;
    organizationName?: string;
    role?: UserRole;
    permissions?: Permission[];
}
export interface AuthContextType {
    user: AuthUser | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{
        error: Error | null;
    }>;
    signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{
        error: Error | null;
    }>;
    signOut: () => Promise<{
        error: Error | null;
    }>;
    resetPassword: (email: string) => Promise<{
        error: Error | null;
    }>;
    updatePassword: (newPassword: string) => Promise<{
        error: Error | null;
    }>;
    hasPermission: (permission: Permission) => boolean;
    hasRole: (role: UserRole) => boolean;
    refreshSession: () => Promise<void>;
}
interface AuthProviderProps {
    children: React.ReactNode;
    appName?: string;
}
export declare const AuthProvider: React.FC<AuthProviderProps>;
export declare const useAuth: () => AuthContextType;
export {};
//# sourceMappingURL=AuthProvider.d.ts.map