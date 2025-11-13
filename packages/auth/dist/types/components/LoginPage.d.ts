/**
 * @fileoverview Login Page Component
 *
 * Reusable login page component for CourtLens applications.
 * Provides email/password authentication with SSO support.
 */
import React from 'react';
interface LoginPageProps {
    /** App name to display in the header */
    appName?: string;
    /** Logo URL or component */
    logo?: React.ReactNode;
    /** Redirect path after successful login (default: /) */
    redirectTo?: string;
    /** Show "Remember me" checkbox */
    showRememberMe?: boolean;
    /** Show "Sign up" link */
    showSignUpLink?: boolean;
    /** Custom signup handler */
    onSignUpClick?: () => void;
    /** Custom CSS classes */
    className?: string;
}
/**
 * LoginPage Component
 *
 * Full-featured login page with email/password authentication.
 * Automatically redirects after successful login.
 *
 * @example
 * <Route path="/login" element={
 *   <LoginPage
 *     appName="CourtLens Admin"
 *     redirectTo="/dashboard"
 *     showSignUpLink={true}
 *   />
 * } />
 */
export declare const LoginPage: React.FC<LoginPageProps>;
export default LoginPage;
//# sourceMappingURL=LoginPage.d.ts.map