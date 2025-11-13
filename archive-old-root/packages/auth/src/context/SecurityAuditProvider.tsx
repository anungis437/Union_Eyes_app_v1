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

import React, { createContext, useContext, ReactNode } from 'react';
import { useSecurityAudit, UseSecurityAuditReturn } from '../hooks/useSecurityAudit';

// ============================================================================
// CONTEXT
// ============================================================================

const SecurityAuditContext = createContext<UseSecurityAuditReturn | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

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
export function SecurityAuditProvider({
  children,
  autoRefresh = false,
  refreshInterval = 30000
}: SecurityAuditProviderProps) {
  const auditContext = useSecurityAudit({
    autoRefresh,
    refreshInterval
  });

  return (
    <SecurityAuditContext.Provider value={auditContext}>
      {children}
    </SecurityAuditContext.Provider>
  );
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
export function useSecurityAuditContext(): UseSecurityAuditReturn {
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
