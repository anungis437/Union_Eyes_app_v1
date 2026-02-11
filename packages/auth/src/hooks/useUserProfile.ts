// useUserProfile Hook
// React hook for managing user profiles with real-time updates
// Part of Phase 2 Week 1 Day 6 - Unified User Profile Management

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../unified-auth/AuthProvider';
import {
  UserProfile,
  UpdateProfileInput,
  NotificationPreferences,
  UIPreferences,
  PrivacySettings,
  SecuritySettings,
  OnboardingProgress,
  AvatarUploadResult,
  getUserProfileService
} from '../services/userProfileService';
import { getSupabaseClient } from '@unioneyes/supabase';
import { logger } from '../utils/logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface UseUserProfileReturn {
  // Profile Data
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  
  // Profile Operations
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: UpdateProfileInput) => Promise<void>;
  
  // Avatar Operations
  uploadAvatar: (file: File) => Promise<AvatarUploadResult | null>;
  deleteAvatar: () => Promise<void>;
  
  // Preferences
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  updateUIPreferences: (prefs: Partial<UIPreferences>) => Promise<void>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<void>;
  
  // Onboarding
  completeOnboardingStep: (stepId: string) => Promise<void>;
  updateOnboardingProgress: (progress: Partial<OnboardingProgress>) => Promise<void>;
  
  // Activity
  updateLastActivity: () => Promise<void>;
  
  // Computed Properties
  fullName: string;
  initials: string;
  isProfileComplete: boolean;
}

export interface UseUserProfileOptions {
  userId?: string; // If not provided, uses current user
  enableRealtime?: boolean; // Enable real-time profile updates
  autoUpdateActivity?: boolean; // Automatically update last_activity_at
  activityInterval?: number; // Interval for activity updates (ms)
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useUserProfile(options: UseUserProfileOptions = {}): UseUserProfileReturn {
  const {
    userId: providedUserId,
    enableRealtime = true,
    autoUpdateActivity = true,
    activityInterval = 60000 // 1 minute
  } = options;

  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const profileService = getUserProfileService();
  const supabase = getSupabaseClient();

  // Determine which user ID to use
  const userId = providedUserId || user?.id;

  // ===========================================================================
  // PROFILE FETCHING
  // ===========================================================================

  /**
   * Fetch profile from database
   */
  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await profileService.getProfile(userId);
      
      if (fetchError) throw fetchError;
      
      setProfile(data);
    } catch (err: any) {
      logger.error('[useUserProfile] Error fetching profile:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId, profileService]);

  /**
   * Refresh profile manually
   */
  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // ===========================================================================
  // PROFILE UPDATES
  // ===========================================================================

  /**
   * Update profile with optimistic UI
   */
  const updateProfile = useCallback(async (updates: UpdateProfileInput) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      // Optimistic update
      if (profile) {
        setProfile({
          ...profile,
          ...updates,
          updatedAt: new Date()
        });
      }

      const { data, error: updateError } = await profileService.updateProfile(userId, updates);
      
      if (updateError) throw updateError;
      
      // Set actual data from server
      if (data) {
        setProfile(data);
      }
    } catch (err: any) {
      logger.error('[useUserProfile] Error updating profile:', err);
      setError(err);
      
      // Revert optimistic update on error
      await fetchProfile();
      
      throw err;
    }
  }, [userId, profile, profileService, fetchProfile]);

  // ===========================================================================
  // AVATAR OPERATIONS
  // ===========================================================================

  /**
   * Upload avatar with optimistic UI
   */
  const uploadAvatar = useCallback(async (file: File): Promise<AvatarUploadResult | null> => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const { data, error: uploadError } = await profileService.uploadAvatar(userId, file);
      
      if (uploadError) throw uploadError;
      
      if (data && profile) {
        // Update profile with new avatar URL
        setProfile({
          ...profile,
          avatarUrl: data.url,
          updatedAt: new Date()
        });
      }
      
      return data;
    } catch (err: any) {
      logger.error('[useUserProfile] Error uploading avatar:', err);
      setError(err);
      throw err;
    }
  }, [userId, profile, profileService]);

  /**
   * Delete avatar
   */
  const deleteAvatar = useCallback(async () => {
    if (!userId) throw new Error('User not authenticated');

    try {
      // Optimistic update
      if (profile) {
        setProfile({
          ...profile,
          avatarUrl: undefined,
          updatedAt: new Date()
        });
      }

      const { error: deleteError } = await profileService.deleteAvatar(userId);
      
      if (deleteError) throw deleteError;
      
      await fetchProfile();
    } catch (err: any) {
      logger.error('[useUserProfile] Error deleting avatar:', err);
      setError(err);
      
      // Revert on error
      await fetchProfile();
      
      throw err;
    }
  }, [userId, profile, profileService, fetchProfile]);

  // ===========================================================================
  // PREFERENCES MANAGEMENT
  // ===========================================================================

  /**
   * Update notification preferences
   */
  const updateNotificationPreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        // Optimistic update
        if (profile) {
          setProfile({
            ...profile,
            notificationPreferences: {
              ...profile.notificationPreferences,
              ...prefs
            },
            updatedAt: new Date()
          });
        }

        const { data, error: updateError } = await profileService.updateNotificationPreferences(
          userId,
          prefs
        );
        
        if (updateError) throw updateError;
        
        // Update with server data
        if (data && profile) {
          setProfile({
            ...profile,
            notificationPreferences: data,
            updatedAt: new Date()
          });
        }
      } catch (err: any) {
        logger.error('[useUserProfile] Error updating notification preferences:', err);
        setError(err);
        await fetchProfile();
        throw err;
      }
    },
    [userId, profile, profileService, fetchProfile]
  );

  /**
   * Update UI preferences
   */
  const updateUIPreferences = useCallback(
    async (prefs: Partial<UIPreferences>) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        if (profile) {
          setProfile({
            ...profile,
            uiPreferences: {
              ...profile.uiPreferences,
              ...prefs
            },
            updatedAt: new Date()
          });
        }

        const { data, error: updateError } = await profileService.updateUIPreferences(userId, prefs);
        
        if (updateError) throw updateError;
        
        if (data && profile) {
          setProfile({
            ...profile,
            uiPreferences: data,
            updatedAt: new Date()
          });
        }
      } catch (err: any) {
        logger.error('[useUserProfile] Error updating UI preferences:', err);
        setError(err);
        await fetchProfile();
        throw err;
      }
    },
    [userId, profile, profileService, fetchProfile]
  );

  /**
   * Update privacy settings
   */
  const updatePrivacySettings = useCallback(
    async (settings: Partial<PrivacySettings>) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        if (profile) {
          setProfile({
            ...profile,
            privacySettings: {
              ...profile.privacySettings,
              ...settings
            },
            updatedAt: new Date()
          });
        }

        const { data, error: updateError } = await profileService.updatePrivacySettings(
          userId,
          settings
        );
        
        if (updateError) throw updateError;
        
        if (data && profile) {
          setProfile({
            ...profile,
            privacySettings: data,
            updatedAt: new Date()
          });
        }
      } catch (err: any) {
        logger.error('[useUserProfile] Error updating privacy settings:', err);
        setError(err);
        await fetchProfile();
        throw err;
      }
    },
    [userId, profile, profileService, fetchProfile]
  );

  /**
   * Update security settings
   */
  const updateSecuritySettings = useCallback(
    async (settings: Partial<SecuritySettings>) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        if (profile) {
          setProfile({
            ...profile,
            securitySettings: {
              ...profile.securitySettings,
              ...settings
            },
            updatedAt: new Date()
          });
        }

        const { data, error: updateError } = await profileService.updateSecuritySettings(
          userId,
          settings
        );
        
        if (updateError) throw updateError;
        
        if (data && profile) {
          setProfile({
            ...profile,
            securitySettings: data,
            updatedAt: new Date()
          });
        }
      } catch (err: any) {
        logger.error('[useUserProfile] Error updating security settings:', err);
        setError(err);
        await fetchProfile();
        throw err;
      }
    },
    [userId, profile, profileService, fetchProfile]
  );

  // ===========================================================================
  // ONBOARDING
  // ===========================================================================

  /**
   * Complete onboarding step
   */
  const completeOnboardingStep = useCallback(
    async (stepId: string) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const { error: completeError } = await profileService.completeOnboardingStep(
          userId,
          stepId
        );
        
        if (completeError) throw completeError;
        
        await fetchProfile();
      } catch (err: any) {
        logger.error('[useUserProfile] Error completing onboarding step:', err);
        setError(err);
        throw err;
      }
    },
    [userId, profileService, fetchProfile]
  );

  /**
   * Update onboarding progress
   */
  const updateOnboardingProgress = useCallback(
    async (progress: Partial<OnboardingProgress>) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const { data, error: updateError } = await profileService.updateOnboardingProgress(
          userId,
          progress
        );
        
        if (updateError) throw updateError;
        
        if (data && profile) {
          setProfile({
            ...profile,
            onboardingProgress: data,
            updatedAt: new Date()
          });
        }
      } catch (err: any) {
        logger.error('[useUserProfile] Error updating onboarding progress:', err);
        setError(err);
        throw err;
      }
    },
    [userId, profile, profileService]
  );

  // ===========================================================================
  // ACTIVITY TRACKING
  // ===========================================================================

  /**
   * Update last activity timestamp
   */
  const updateLastActivity = useCallback(async () => {
    if (!userId) return;

    try {
      await profileService.updateLastActivity(userId);
      
      // Update local state
      if (profile) {
        setProfile({
          ...profile,
          lastActivityAt: new Date()
        });
      }
    } catch (err: any) {
      // Silently fail for activity updates
      logger.warn('[useUserProfile] Error updating activity:', err);
    }
  }, [userId, profile, profileService]);

  // ===========================================================================
  // COMPUTED PROPERTIES
  // ===========================================================================

  /**
   * Get full name from profile
   */
  const fullName = profile
    ? profile.displayName ||
      `${profile.firstName || ''} ${profile.lastName || ''}`.trim() ||
      'User'
    : 'User';

  /**
   * Get initials from name
   */
  const initials = profile
    ? (profile.firstName?.[0] || '') + (profile.lastName?.[0] || '') || '?'
    : '?';

  /**
   * Check if profile is complete
   */
  const isProfileComplete = (profile?.profileCompleteness || 0) >= 80;

  // ===========================================================================
  // EFFECTS
  // ===========================================================================

  /**
   * Initial profile fetch
   */
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Real-time profile updates
   */
  useEffect(() => {
    if (!enableRealtime || !userId) return;

    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            // Refresh profile on update
            fetchProfile();
          } else if (payload.eventType === 'DELETE') {
            // Clear profile on delete
            setProfile(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, userId, supabase, fetchProfile]);

  /**
   * Auto-update activity
   */
  useEffect(() => {
    if (!autoUpdateActivity || !userId) return;

    // Update immediately
    updateLastActivity();

    // Set up interval
    const intervalId = setInterval(updateLastActivity, activityInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoUpdateActivity, userId, activityInterval, updateLastActivity]);

  // ===========================================================================
  // RETURN VALUE
  // ===========================================================================

  return {
    // Profile Data
    profile,
    loading,
    error,
    
    // Profile Operations
    refreshProfile,
    updateProfile,
    
    // Avatar Operations
    uploadAvatar,
    deleteAvatar,
    
    // Preferences
    updateNotificationPreferences,
    updateUIPreferences,
    updatePrivacySettings,
    updateSecuritySettings,
    
    // Onboarding
    completeOnboardingStep,
    updateOnboardingProgress,
    
    // Activity
    updateLastActivity,
    
    // Computed Properties
    fullName,
    initials,
    isProfileComplete
  };
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default useUserProfile;
