/**
 * @fileoverview Password Expiration Banner Component
 *
 * Displays a warning banner when user's password is expiring soon
 */
interface PasswordExpirationBannerProps {
    /** Number of days until password expires */
    daysUntilExpiration: number;
    /** Path to change password page */
    changePasswordPath?: string;
    /** Whether the banner can be dismissed */
    dismissible?: boolean;
    /** Callback when banner is dismissed */
    onDismiss?: () => void;
}
/**
 * Password Expiration Banner Component
 *
 * Shows a warning banner at the top of the app when user's password is expiring soon
 * Features:
 * - Color-coded urgency (yellow for 7+ days, orange for 3-6 days, red for <3 days)
 * - Dismissible with sessionStorage persistence
 * - Click to navigate to change password page
 * - Dark mode support
 */
export declare function PasswordExpirationBanner({ daysUntilExpiration, changePasswordPath, dismissible, onDismiss, }: PasswordExpirationBannerProps): import("react/jsx-runtime").JSX.Element | null;
/**
 * Hook to calculate days until password expiration
 *
 * @param expiresAt - ISO date string of when password expires
 * @returns Number of days until expiration (null if no expiration)
 */
export declare function useDaysUntilExpiration(expiresAt: string | null | undefined): number | null;
export {};
//# sourceMappingURL=PasswordExpirationBanner.d.ts.map