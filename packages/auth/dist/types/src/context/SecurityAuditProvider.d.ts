/**
 * Security Audit Provider
 *
 * React context provider for security audit functionality.
 * Makes audit services available throughout the application.
 *
 * @module SecurityAuditProvider
 * @author CourtLens Platform Team
 * @date October 23, 2025
 * @phase Phase 2 Week 1 Day 7
 */
import { ReactNode } from 'react';
import { UseSecurityAuditReturn } from '../hooks/useSecurityAudit';
export interface SecurityAuditProviderProps {
    children: ReactNode;
    autoRefresh?: boolean;
    refreshInterval?: number;
}
/**
 * Security Audit Provider
 *
 * Provides security audit functionality to child components.
 */
export declare function SecurityAuditProvider({ children, autoRefresh, refreshInterval }: SecurityAuditProviderProps): import("react/jsx-runtime").JSX.Element;
/**
 * Use Security Audit context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { logs, getLogs, logAuthEvent } = useSecurityAuditContext();
 *
 *   useEffect(() => {
 *     getLogs({ userId: 'user123' });
 *   }, []);
 *
 *   return <div>{logs.length} logs</div>;
 * }
 * ```
 */
export declare function useSecurityAuditContext(): UseSecurityAuditReturn;
export default SecurityAuditProvider;
//# sourceMappingURL=SecurityAuditProvider.d.ts.map