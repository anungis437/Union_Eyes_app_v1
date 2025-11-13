/**
 * Session Management Hook
 *
 * React hook for managing user sessions with real-time updates
 * Provides methods to view, terminate, and monitor active sessions
 */
import { type SessionInfo } from '../services/sessionManagement';
export interface UseSessionManagementOptions {
    /** User ID to manage sessions for (defaults to current user) */
    userId?: string;
    /** Enable real-time updates via Supabase subscriptions */
    enableRealtime?: boolean;
    /** Auto-refresh interval in milliseconds (0 to disable) */
    refreshInterval?: number;
    /** Include terminated sessions in results */
    includeTerminated?: boolean;
}
export interface UseSessionManagementReturn {
    /** Array of session info */
    sessions: SessionInfo[];
    /** Current session info */
    currentSession: SessionInfo | null;
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: Error | null;
    /** Refresh sessions manually */
    refresh: () => Promise<void>;
    /** Terminate a specific session */
    terminateSession: (sessionId: string) => Promise<boolean>;
    /** Terminate all other sessions except current */
    terminateOtherSessions: () => Promise<number>;
    /** Check if user has reached concurrent session limit */
    isAtLimit: boolean;
    /** Number of active sessions */
    activeSessionCount: number;
}
/**
 * Hook for managing user sessions
 *
 * @example
 * ```tsx
 * function SessionDashboard() {
 *   const {
 *     sessions,
 *     currentSession,
 *     isLoading,
 *     terminateSession,
 *     terminateOtherSessions
 *   } = useSessionManagement({ enableRealtime: true });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <h2>Active Sessions ({sessions.length})</h2>
 *       {sessions.map(session => (
 *         <SessionCard
 *           key={session.id}
 *           session={session}
 *           onTerminate={() => terminateSession(session.id)}
 *         />
 *       ))}
 *       <Button onClick={terminateOtherSessions}>
 *         Sign out other devices
 *       </Button>
 *     </div>
 *   );
 * }
 * ```
 */
export declare function useSessionManagement(options?: UseSessionManagementOptions): UseSessionManagementReturn;
//# sourceMappingURL=useSessionManagement.d.ts.map