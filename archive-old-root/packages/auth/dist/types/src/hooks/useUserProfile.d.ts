import { UserProfile, UpdateProfileInput, NotificationPreferences, UIPreferences, PrivacySettings, SecuritySettings, OnboardingProgress, AvatarUploadResult } from '../services/userProfileService';
export interface UseUserProfileReturn {
    profile: UserProfile | null;
    loading: boolean;
    error: Error | null;
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: UpdateProfileInput) => Promise<void>;
    uploadAvatar: (file: File) => Promise<AvatarUploadResult | null>;
    deleteAvatar: () => Promise<void>;
    updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
    updateUIPreferences: (prefs: Partial<UIPreferences>) => Promise<void>;
    updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
    updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<void>;
    completeOnboardingStep: (stepId: string) => Promise<void>;
    updateOnboardingProgress: (progress: Partial<OnboardingProgress>) => Promise<void>;
    updateLastActivity: () => Promise<void>;
    fullName: string;
    initials: string;
    isProfileComplete: boolean;
}
export interface UseUserProfileOptions {
    userId?: string;
    enableRealtime?: boolean;
    autoUpdateActivity?: boolean;
    activityInterval?: number;
}
export declare function useUserProfile(options?: UseUserProfileOptions): UseUserProfileReturn;
export default useUserProfile;
//# sourceMappingURL=useUserProfile.d.ts.map