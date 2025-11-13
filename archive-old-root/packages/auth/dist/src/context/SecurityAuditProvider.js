import { jsx as _jsx } from "react/jsx-runtime";
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
import { createContext, useContext } from 'react';
import { useSecurityAudit } from '../hooks/useSecurityAudit';
// ============================================================================
// CONTEXT
// ============================================================================
const SecurityAuditContext = createContext(undefined);
/**
 * Security Audit Provider
 *
 * Provides security audit functionality to child components.
 */
export function SecurityAuditProvider({ children, autoRefresh = false, refreshInterval = 30000 }) {
    const auditContext = useSecurityAudit({
        autoRefresh,
        refreshInterval
    });
    return (_jsx(SecurityAuditContext.Provider, { value: auditContext, children: children }));
}
// ============================================================================
// HOOK
// ============================================================================
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
export function useSecurityAuditContext() {
    const context = useContext(SecurityAuditContext);
    if (context === undefined) {
        throw new Error('useSecurityAuditContext must be used within SecurityAuditProvider');
    }
    return context;
}
// ============================================================================
// EXPORTS
// ============================================================================
export default SecurityAuditProvider;
//# sourceMappingURL=SecurityAuditProvider.js.map