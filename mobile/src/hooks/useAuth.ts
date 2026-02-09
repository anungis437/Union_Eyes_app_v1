import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';

export function useAuthCheck() {
  const { isSignedIn, isLoaded } = useAuth();

  return {
    isAuthenticated: isSignedIn,
    isLoading: !isLoaded,
  };
}
