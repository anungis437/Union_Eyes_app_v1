import { SupabaseClient } from '@supabase/supabase-js';
export interface UserProfile {
    userId: string;
    organizationId?: string;
    organizationName?: string;
    role: UserRole;
    permissions: string[];
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
    title?: string;
    department?: string;
    notificationPreferences: NotificationPreferences;
    uiPreferences: UIPreferences;
    privacySettings: PrivacySettings;
    securitySettings: SecuritySettings;
    isActive: boolean;
    lastLoginAt?: Date;
    lastActivityAt?: Date;
    loginCount: number;
    failedLoginCount: number;
    lastFailedLoginAt?: Date;
    onboardingCompleted: boolean;
    onboardingProgress: OnboardingProgress;
    profileCompleteness: number;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
export type UserRole = 'super_admin' | 'org_admin' | 'lawyer' | 'paralegal' | 'support_staff' | 'client';
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
export type NotificationType = 'security' | 'updates' | 'mentions' | 'tasks' | 'deadlines' | 'comments' | 'assignments' | 'system';
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
    sessionTimeout: number;
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
export type PreferenceCategory = 'notification' | 'ui' | 'privacy' | 'security' | 'workflow' | 'integration' | 'custom';
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
export declare class UserProfileService {
    private supabase;
    constructor(supabaseClient?: SupabaseClient);
    /**
     * Get user profile by user ID
     */
    getProfile(userId: string): Promise<{
        data: UserProfile | null;
        error: Error | null;
    }>;
    /**
     * Get current user's profile
     */
    getCurrentProfile(): Promise<{
        data: UserProfile | null;
        error: Error | null;
    }>;
    /**
     * Update user profile
     */
    updateProfile(userId: string, updates: UpdateProfileInput): Promise<{
        data: UserProfile | null;
        error: Error | null;
    }>;
    /**
     * Search profiles by organization
     */
    searchProfiles(organizationId: string, query?: string): Promise<{
        data: UserProfile[];
        error: Error | null;
    }>;
    /**
     * Upload avatar image to Supabase Storage
     */
    uploadAvatar(userId: string, file: File): Promise<{
        data: AvatarUploadResult | null;
        error: Error | null;
    }>;
    /**
     * Delete avatar image
     */
    deleteAvatar(userId: string): Promise<{
        error: Error | null;
    }>;
    /**
     * Update notification preferences
     */
    updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<{
        data: NotificationPreferences | null;
        error: Error | null;
    }>;
    /**
     * Update UI preferences
     */
    updateUIPreferences(userId: string, preferences: Partial<UIPreferences>): Promise<{
        data: UIPreferences | null;
        error: Error | null;
    }>;
    /**
     * Update privacy settings
     */
    updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<{
        data: PrivacySettings | null;
        error: Error | null;
    }>;
    /**
     * Update security settings
     */
    updateSecuritySettings(userId: string, settings: Partial<SecuritySettings>): Promise<{
        data: SecuritySettings | null;
        error: Error | null;
    }>;
    /**
     * Update onboarding progress
     */
    updateOnboardingProgress(userId: string, progress: Partial<OnboardingProgress>): Promise<{
        data: OnboardingProgress | null;
        error: Error | null;
    }>;
    /**
     * Complete onboarding step
     */
    completeOnboardingStep(userId: string, stepId: string): Promise<{
        error: Error | null;
    }>;
    /**
     * Record login activity
     */
    recordLoginActivity(userId: string, success: boolean): Promise<{
        error: Error | null;
    }>;
    /**
     * Update last activity timestamp
     */
    updateLastActivity(userId: string): Promise<{
        error: Error | null;
    }>;
    /**
     * Calculate profile completeness score
     */
    calculateCompleteness(userId: string): Promise<{
        data: number | null;
        error: Error | null;
    }>;
    /**
     * Get user's full name
     */
    getFullName(userId: string): Promise<{
        data: string | null;
        error: Error | null;
    }>;
    /**
     * Soft delete user profile
     */
    softDeleteProfile(userId: string): Promise<{
        error: Error | null;
    }>;
    /**
     * Map database row to UserProfile
     */
    private mapToUserProfile;
    /**
     * Validate avatar file
     */
    private validateAvatarFile;
    /**
     * Extract path from storage URL
     */
    private extractPathFromUrl;
    /**
     * Get default notification preferences
     */
    private getDefaultNotificationPreferences;
    /**
     * Get default UI preferences
     */
    private getDefaultUIPreferences;
    /**
     * Get default privacy settings
     */
    private getDefaultPrivacySettings;
    /**
     * Get default security settings
     */
    private getDefaultSecuritySettings;
    /**
     * Get default onboarding progress
     */
    private getDefaultOnboardingProgress;
}
/**
 * Create a new UserProfileService instance
 */
export declare function createUserProfileService(supabaseClient?: SupabaseClient): UserProfileService;
/**
 * Get singleton instance of UserProfileService
 */
export declare function getUserProfileService(): UserProfileService;
declare const _default: UserProfileService;
export default _default;
//# sourceMappingURL=userProfileService.d.ts.map