/**
 * @fileoverview SSO Middleware
 *
 * Middleware for Single Sign-On functionality across CourtLens apps.
 * Handles cross-app session synchronization and automatic login.
 */
import React from 'react';
interface SSOConfig {
    /** Enable SSO functionality (default: true) */
    enabled?: boolean;
    /** Check session interval in milliseconds (default: 30000 = 30s) */
    checkInterval?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
    /** Callback when SSO session is detected */
    onSSOLogin?: (userId: string) => void;
    /** Callback when SSO logout is detected */
    onSSOLogout?: () => void;
}
/**
 * useSSO Hook
 *
 * Enables Single Sign-On functionality in any CourtLens application.
 * Automatically syncs authentication state across all apps via localStorage.
 *
 * @example
 * function App() {
 *   useSSO({
 *     enabled: true,
 *     checkInterval: 30000, // Check every 30 seconds
 *     onSSOLogin: (userId) => undefined,
 *     onSSOLogout: () => undefined
 *   });
 *
 *   return <YourApp />;
 * }
 */
export declare const useSSO: (config?: SSOConfig) => {
    enabled: boolean;
    checkInterval: number;
};
interface SSOMiddlewareProps extends SSOConfig {
    children?: React.ReactNode;
}
/**
 * SSOMiddleware Component
 *
 * Component wrapper for SSO functionality. Use this if you prefer
 * a component-based approach instead of the hook.
 *
 * @example
 * <AuthProvider>
 *   <SSOMiddleware enabled={true} debug={true}>
 *     <App />
 *   </SSOMiddleware>
 * </AuthProvider>
 */
export declare const SSOMiddleware: React.FC<SSOMiddlewareProps>;
export default useSSO;
//# sourceMappingURL=useSSO.d.ts.map