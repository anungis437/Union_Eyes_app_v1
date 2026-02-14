// User Profile Service
// Comprehensive service for managing user profiles across all applications
// Part of Phase 2 Week 1 Day 6 - Unified User Profile Management

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@unioneyes/supabase';
import { logger } from '../utils/logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface UserProfile {
  userId: string;
  organizationId?: string;
  organizationName?: string;
  role: UserRole;
  permissions: string[];
  
  // Personal Information
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  bio?: string;
  location?: string;
  timezone: string;
  language: string;
  
  // Professional Information
  title?: string;
  department?: string;
  
  // Preferences
  notificationPreferences: NotificationPreferences;
  uiPreferences: UIPreferences;
  privacySettings: PrivacySettings;
  securitySettings: SecuritySettings;
  
  // Activity Tracking
  isActive: boolean;
  lastLoginAt?: Date;
  lastActivityAt?: Date;
  loginCount: number;
  failedLoginCount: number;
  lastFailedLoginAt?: Date;
  
  // Onboarding
  onboardingCompleted: boolean;
  onboardingProgress: OnboardingProgress;
  
  // Metadata
  profileCompleteness: number;
  metadata: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type UserRole = 
  | 'super_admin'
  | 'org_admin'
  | 'lawyer'
  | 'paralegal'
  | 'support_staff'
  | 'client';

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    types: NotificationType[];
  };
  push: {
    enabled: boolean;
    frequency: 'immediate' | 'hourly' | 'daily';
    types: NotificationType[];
  };
  sms: {
    enabled: boolean;
    frequency: 'immediate' | 'urgent';
    types: NotificationType[];
  };
  inApp: {
    enabled: boolean;
    types: NotificationType[] | ['all'];
  };
}

export type NotificationType =
  | 'security'
  | 'updates'
  | 'mentions'
  | 'tasks'
  | 'deadlines'
  | 'comments'
  | 'assignments'
  | 'system';

export interface UIPreferences {
  theme: 'light' | 'dark' | 'system';
  colorScheme: 'blue' | 'indigo' | 'purple' | 'green' | 'red' | 'orange';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  sidebarCollapsed: boolean;
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  timezone: string;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'organization' | 'private';
  showEmail: boolean;
  showPhone: boolean;
  showActivity: boolean;
  allowDirectMessages: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'app' | 'sms' | 'email';
  sessionTimeout: number; // in seconds
  requirePasswordChange: boolean;
  passwordChangedAt?: Date;
  trustedDevices: TrustedDevice[];
}

export interface TrustedDevice {
  id: string;
  name: string;
  deviceType: string;
  lastUsed: Date;
  addedAt: Date;
}

export interface OnboardingProgress {
  steps: string[];
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
}

export interface UserPreference {
  id: string;
  userId: string;
  category: PreferenceCategory;
  key: string;
  value: any;
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PreferenceCategory =
  | 'notification'
  | 'ui'
  | 'privacy'
  | 'security'
  | 'workflow'
  | 'integration'
  | 'custom';

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phoneNumber?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  language?: string;
  title?: string;
  department?: string;
}

export interface AvatarUploadResult {
  url: string;
  path: string;
  size: number;
}

// =============================================================================
// USER PROFILE SERVICE
// =============================================================================

export class UserProfileService {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || getSupabaseClient();
  }

  // ===========================================================================
  // PROFILE CRUD OPERATIONS
  // ===========================================================================

  /**
   * Get user profile by user ID
   */
  async getProfile(userId: string): Promise<{ data: UserProfile | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (!data) return { data: null, error: null };

      return { data: this.mapToUserProfile(data), error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error getting profile:', error);
      return { data: null, error: error };
    }
  }

  /**
   * Get current user's profile
   */
  async getCurrentProfile(): Promise<{ data: UserProfile | null; error: Error | null }> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError) throw authError;
      if (!user) throw new Error('User not authenticated');

      return await this.getProfile(user.id);
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error getting current profile:', error);
      return { data: null, error: error };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: UpdateProfileInput
  ): Promise<{ data: UserProfile | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return { data: this.mapToUserProfile(data), error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error updating profile:', error);
      return { data: null, error: error };
    }
  }

  /**
   * Search profiles by organization
   */
  async searchProfiles(
    organizationId: string,
    query?: string
  ): Promise<{ data: UserProfile[]; error: Error | null }> {
    try {
      let queryBuilder = this.supabase
        .from('user_profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (query) {
        queryBuilder = queryBuilder.or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,display_name.ilike.%${query}%,email.ilike.%${query}%`
        );
      }

      const { data, error } = await queryBuilder.order('first_name');

      if (error) throw error;

      return {
        data: (data || []).map(d => this.mapToUserProfile(d)),
        error: null
      };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error searching profiles:', error);
      return { data: [], error: error };
    }
  }

  // ===========================================================================
  // AVATAR MANAGEMENT
  // ===========================================================================

  /**
   * Upload avatar image to Supabase Storage
   */
  async uploadAvatar(
    userId: string,
    file: File
  ): Promise<{ data: AvatarUploadResult | null; error: Error | null }> {
    try {
      // Validate file
      const validationError = this.validateAvatarFile(file);
      if (validationError) throw new Error(validationError);

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      await this.supabase
        .from('user_profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      return {
        data: {
          url: publicUrl,
          path: fileName,
          size: file.size
        },
        error: null
      };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error uploading avatar:', error);
      return { data: null, error: error };
    }
  }

  /**
   * Delete avatar image
   */
  async deleteAvatar(userId: string): Promise<{ error: Error | null }> {
    try {
      // Get current avatar path
      const { data: profile } = await this.getProfile(userId);
      if (!profile?.avatarUrl) {
        return { error: null };
      }

      // Extract path from URL
      const path = this.extractPathFromUrl(profile.avatarUrl);
      if (!path) {
        return { error: null };
      }

      // Delete from storage
      const { error: deleteError } = await this.supabase.storage
        .from('avatars')
        .remove([path]);

      if (deleteError) throw deleteError;

      // Update profile
      await this.supabase
        .from('user_profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      return { error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error deleting avatar:', error);
      return { error: error };
    }
  }

  // ===========================================================================
  // PREFERENCES MANAGEMENT
  // ===========================================================================

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<{ data: NotificationPreferences | null; error: Error | null }> {
    try {
      // Get current profile
      const { data: profile, error: getError } = await this.getProfile(userId);
      if (getError) throw getError;
      if (!profile) throw new Error('Profile not found');

      // Merge preferences
      const updatedPreferences = {
        ...profile.notificationPreferences,
        ...preferences
      };

      // Update in database
      const { error: updateError } = await this.supabase
        .from('user_profiles')
        .update({
          notification_preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { data: updatedPreferences, error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error updating notification preferences:', error);
      return { data: null, error: error };
    }
  }

  /**
   * Update UI preferences
   */
  async updateUIPreferences(
    userId: string,
    preferences: Partial<UIPreferences>
  ): Promise<{ data: UIPreferences | null; error: Error | null }> {
    try {
      const { data: profile, error: getError } = await this.getProfile(userId);
      if (getError) throw getError;
      if (!profile) throw new Error('Profile not found');

      const updatedPreferences = {
        ...profile.uiPreferences,
        ...preferences
      };

      const { error: updateError } = await this.supabase
        .from('user_profiles')
        .update({
          ui_preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { data: updatedPreferences, error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error updating UI preferences:', error);
      return { data: null, error: error };
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    settings: Partial<PrivacySettings>
  ): Promise<{ data: PrivacySettings | null; error: Error | null }> {
    try {
      const { data: profile, error: getError } = await this.getProfile(userId);
      if (getError) throw getError;
      if (!profile) throw new Error('Profile not found');

      const updatedSettings = {
        ...profile.privacySettings,
        ...settings
      };

      const { error: updateError } = await this.supabase
        .from('user_profiles')
        .update({
          privacy_settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { data: updatedSettings, error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error updating privacy settings:', error);
      return { data: null, error: error };
    }
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(
    userId: string,
    settings: Partial<SecuritySettings>
  ): Promise<{ data: SecuritySettings | null; error: Error | null }> {
    try {
      const { data: profile, error: getError } = await this.getProfile(userId);
      if (getError) throw getError;
      if (!profile) throw new Error('Profile not found');

      const updatedSettings = {
        ...profile.securitySettings,
        ...settings
      };

      const { error: updateError } = await this.supabase
        .from('user_profiles')
        .update({
          security_settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { data: updatedSettings, error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error updating security settings:', error);
      return { data: null, error: error };
    }
  }

  // ===========================================================================
  // ONBOARDING
  // ===========================================================================

  /**
   * Update onboarding progress
   */
  async updateOnboardingProgress(
    userId: string,
    progress: Partial<OnboardingProgress>
  ): Promise<{ data: OnboardingProgress | null; error: Error | null }> {
    try {
      const { data: profile, error: getError } = await this.getProfile(userId);
      if (getError) throw getError;
      if (!profile) throw new Error('Profile not found');

      const updatedProgress = {
        ...profile.onboardingProgress,
        ...progress
      };

      const isCompleted = updatedProgress.completedSteps.length === updatedProgress.steps.length;

      const { error: updateError } = await this.supabase
        .from('user_profiles')
        .update({
          onboarding_progress: updatedProgress,
          onboarding_completed: isCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { data: updatedProgress, error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error updating onboarding progress:', error);
      return { data: null, error: error };
    }
  }

  /**
   * Complete onboarding step
   */
  async completeOnboardingStep(
    userId: string,
    stepId: string
  ): Promise<{ error: Error | null }> {
    try {
      const { data: profile, error: getError } = await this.getProfile(userId);
      if (getError) throw getError;
      if (!profile) throw new Error('Profile not found');

      const completedSteps = [...profile.onboardingProgress.completedSteps];
      if (!completedSteps.includes(stepId)) {
        completedSteps.push(stepId);
      }

      const currentStep = Math.min(
        profile.onboardingProgress.currentStep + 1,
        profile.onboardingProgress.steps.length
      );

      await this.updateOnboardingProgress(userId, {
        completedSteps,
        currentStep
      });

      return { error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error completing onboarding step:', error);
      return { error: error };
    }
  }

  // ===========================================================================
  // ACTIVITY TRACKING
  // ===========================================================================

  /**
   * Record login activity
   */
  async recordLoginActivity(
    userId: string,
    success: boolean
  ): Promise<{ error: Error | null }> {
    try {
      await this.supabase.rpc('record_login_activity', {
        p_user_id: userId,
        p_success: success
      });

      return { error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error recording login activity:', error);
      return { error: error };
    }
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(userId: string): Promise<{ error: Error | null }> {
    try {
      await this.supabase
        .from('user_profiles')
        .update({
          last_activity_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      return { error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error updating last activity:', error);
      return { error: error };
    }
  }

  // ===========================================================================
  // UTILITY FUNCTIONS
  // ===========================================================================

  /**
   * Calculate profile completeness score
   */
  async calculateCompleteness(userId: string): Promise<{ data: number | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.rpc('calculate_profile_completeness', {
        p_user_id: userId
      });

      if (error) throw error;

      return { data: data as number, error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error calculating completeness:', error);
      return { data: null, error: error };
    }
  }

  /**
   * Get user's full name
   */
  async getFullName(userId: string): Promise<{ data: string | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_full_name', {
        p_user_id: userId
      });

      if (error) throw error;

      return { data: data as string, error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error getting full name:', error);
      return { data: null, error: error };
    }
  }

  /**
   * Soft delete user profile
   */
  async softDeleteProfile(userId: string): Promise<{ error: Error | null }> {
    try {
      await this.supabase
        .from('user_profiles')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      return { error: null };
    } catch (error: unknown) {
      logger.error('[UserProfileService] Error soft deleting profile:', error);
      return { error: error };
    }
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Map database row to UserProfile
   */
  private mapToUserProfile(data: any): UserProfile {
    return {
      userId: data.user_id,
      organizationId: data.organization_id,
      organizationName: data.organization_name,
      role: data.role,
      permissions: data.permissions || [],
      
      firstName: data.first_name,
      lastName: data.last_name,
      displayName: data.display_name,
      email: data.email,
      avatarUrl: data.avatar_url,
      phoneNumber: data.phone_number,
      bio: data.bio,
      location: data.location,
      timezone: data.timezone || 'UTC',
      language: data.language || 'en',
      
      title: data.title,
      department: data.department,
      
      notificationPreferences: data.notification_preferences || this.getDefaultNotificationPreferences(),
      uiPreferences: data.ui_preferences || this.getDefaultUIPreferences(),
      privacySettings: data.privacy_settings || this.getDefaultPrivacySettings(),
      securitySettings: data.security_settings || this.getDefaultSecuritySettings(),
      
      isActive: data.is_active,
      lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : undefined,
      lastActivityAt: data.last_activity_at ? new Date(data.last_activity_at) : undefined,
      loginCount: data.login_count || 0,
      failedLoginCount: data.failed_login_count || 0,
      lastFailedLoginAt: data.last_failed_login_at ? new Date(data.last_failed_login_at) : undefined,
      
      onboardingCompleted: data.onboarding_completed || false,
      onboardingProgress: data.onboarding_progress || this.getDefaultOnboardingProgress(),
      
      profileCompleteness: data.profile_completeness || 0,
      metadata: data.metadata || {},
      
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined
    };
  }

  /**
   * Validate avatar file
   */
  private validateAvatarFile(file: File): string | null {
    const maxSize = 2 * 1024 * 1024; // 2MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (file.size > maxSize) {
      return 'File size must be less than 2MB';
    }

    if (!allowedTypes.includes(file.type)) {
      return 'File must be a JPEG, PNG, WebP, or GIF image';
    }

    return null;
  }

  /**
   * Extract path from storage URL
   */
  private extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.indexOf('avatars');
      if (bucketIndex === -1) return null;
      
      return pathParts.slice(bucketIndex + 1).join('/');
    } catch {
      return null;
    }
  }

  /**
   * Get default notification preferences
   */
  private getDefaultNotificationPreferences(): NotificationPreferences {
    return {
      email: {
        enabled: true,
        frequency: 'immediate',
        types: ['security', 'updates', 'mentions', 'tasks']
      },
      push: {
        enabled: true,
        frequency: 'immediate',
        types: ['security', 'mentions', 'tasks']
      },
      sms: {
        enabled: false,
        frequency: 'urgent',
        types: ['security']
      },
      inApp: {
        enabled: true,
        types: ['all']
      }
    };
  }

  /**
   * Get default UI preferences
   */
  private getDefaultUIPreferences(): UIPreferences {
    return {
      theme: 'system',
      colorScheme: 'blue',
      fontSize: 'medium',
      compactMode: false,
      sidebarCollapsed: false,
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      timezone: 'UTC'
    };
  }

  /**
   * Get default privacy settings
   */
  private getDefaultPrivacySettings(): PrivacySettings {
    return {
      profileVisibility: 'organization',
      showEmail: false,
      showPhone: false,
      showActivity: true,
      allowDirectMessages: true
    };
  }

  /**
   * Get default security settings
   */
  private getDefaultSecuritySettings(): SecuritySettings {
    return {
      twoFactorEnabled: false,
      twoFactorMethod: 'app',
      sessionTimeout: 3600,
      requirePasswordChange: false,
      trustedDevices: []
    };
  }

  /**
   * Get default onboarding progress
   */
  private getDefaultOnboardingProgress(): OnboardingProgress {
    return {
      steps: [],
      currentStep: 0,
      completedSteps: [],
      skippedSteps: []
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new UserProfileService instance
 */
export function createUserProfileService(supabaseClient?: SupabaseClient): UserProfileService {
  return new UserProfileService(supabaseClient);
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let userProfileServiceInstance: UserProfileService | null = null;

/**
 * Get singleton instance of UserProfileService
 */
export function getUserProfileService(): UserProfileService {
  if (!userProfileServiceInstance) {
    userProfileServiceInstance = new UserProfileService();
  }
  return userProfileServiceInstance;
}

// Export default instance
export default getUserProfileService();
