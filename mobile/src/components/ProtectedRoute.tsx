import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string | string[];
  requirePermission?: string | string[];
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requireRole,
  requirePermission,
  fallbackPath = '/(auth)/sign-in',
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    isLoading,
    user,
    hasRole,
    hasAnyRole,
    hasPermission: checkPermission,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Check authentication
    if (!isAuthenticated) {
      router.replace(fallbackPath as any);
      return;
    }

    // Check role requirements
    if (requireRole && user) {
      const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
      const hasRequiredRole = Array.isArray(requireRole) ? hasAnyRole(roles) : hasRole(requireRole);

      if (!hasRequiredRole) {
        router.replace('/(tabs)');
        return;
      }
    }

    // Check permission requirements
    if (requirePermission && user) {
      const permissions = Array.isArray(requirePermission)
        ? requirePermission
        : [requirePermission];
      const hasRequiredPermission = permissions.every((p) => checkPermission(p));

      if (!hasRequiredPermission) {
        router.replace('/(tabs)');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, requireRole, requirePermission]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
