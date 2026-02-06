/**
 * @fileoverview Change Password Page Component
 *
 * Allows authenticated users to change their password with validation and policy enforcement
 */
interface ChangePasswordPageProps {
    /** Optional redirect path after successful password change */
    redirectTo?: string;
    /** Whether this is a forced password change (expired/must change) */
    isRequired?: boolean;
}
/**
 * Change Password Page Component
 *
 * Provides a secure password change interface with:
 * - Current password verification
 * - New password strength validation
 * - Password history checking (prevents reuse)
 * - Password confirmation matching
 * - Visual feedback with PasswordStrengthMeter
 * - Dark mode support
 */
export declare function ChangePasswordPage({ redirectTo, isRequired }: ChangePasswordPageProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ChangePasswordPage.d.ts.map