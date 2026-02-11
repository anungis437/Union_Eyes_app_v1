/**
 * Session Management Hook
 * 
 * React hook for managing user sessions with real-time updates
 * Provides methods to view, terminate, and monitor active sessions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SessionManagement, type SessionInfo } from '../services/sessionManagement';

// Get Supabase config (similar pattern to packages/supabase/client.ts)
const getSupabaseConfig = () => {
  let url = 'http://127.0.0.1:54321';
  let anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const env = (import.meta as any).env;
    url = env.VITE_SUPABASE_URL || url;
    anonKey = env.VITE_SUPABASE_ANON_KEY || anonKey;
  }

  try {
    if (typeof process !== 'undefined' && process.env) {
      url = process.env.NEXT_PUBLIC_SUPABASE_URL || url;
      anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || anonKey;
    }
  } catch (e) {
    // process is not defined in browser
  }

  return { url, anonKey };
};

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
export function useSessionManagement(
  options: UseSessionManagementOptions = {}
): UseSessionManagementReturn {
  const {
    userId,
    enableRealtime = false,
    refreshInterval = 0,
    includeTerminated = false,
  } = options;

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = useMemo(() => {
    const { url, anonKey } = getSupabaseConfig();
    if (!url || !anonKey) return null;
    return createClient(url, anonKey);
  }, []);

  const sessionManager = useMemo(() => {
    const config = getSupabaseConfig();
    return new SessionManagement(config.url, config.anonKey);
  }, []);

  /**
   * Fetch sessions from the server
   */
  const fetchSessions = useCallback(async () => {
    try {
      setError(null);
      
      let fetchedSessions: SessionInfo[];
      
      if (userId) {
        // Fetch sessions for specific user
        fetchedSessions = await sessionManager.getUserSessions(userId);
      } else {
        // Fetch current user's sessions
        const current = await sessionManager.getCurrentSession();
        if (current) {
          setCurrentSession(current);
          fetchedSessions = await sessionManager.getUserSessions(current.userId);
        } else {
          fetchedSessions = [];
        }
      }

      // Filter out terminated sessions if needed
      if (!includeTerminated) {
        fetchedSessions = fetchedSessions.filter(s => s.isActive);
      }

      setSessions(fetchedSessions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sessions'));
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, includeTerminated, sessionManager]);

  /**
   * Refresh sessions manually
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchSessions();
  }, [fetchSessions]);

  /**
   * Terminate a specific session
   */
  const terminateSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await sessionManager.terminateSession(sessionId, userId || '');
      
      if (success) {
        // Remove from local state
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to terminate session'));
      return false;
    }
  }, [userId, sessionManager]);

  /**
   * Terminate all other sessions except current
   */
  const terminateOtherSessions = useCallback(async (): Promise<number> => {
    try {
      setError(null);
      
      if (!userId && !currentSession) {
        throw new Error('No user session found');
      }
      
      const count = await sessionManager.terminateOtherSessions(userId || currentSession!.userId);
      
      // Refresh sessions after terminating
      await fetchSessions();
      
      return count;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to terminate sessions'));
      return 0;
    }
  }, [userId, currentSession, sessionManager, fetchSessions]);

  /**
   * Initial load
   */
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /**
   * Auto-refresh interval
   */
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchSessions();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchSessions]);

  /**
   * Real-time subscriptions
   */
  useEffect(() => {
    if (!enableRealtime) return;
    if (!supabase) return;

    const channel = supabase
      .channel('user_sessions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_sessions',
        filter: userId ? `user_id=eq.${userId}` : undefined,
      }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, supabase, userId, fetchSessions]);

  /**
   * Calculate active session count
   */
  const activeSessionCount = useMemo(
    () => sessions.filter(s => s.isActive).length,
    [sessions]
  );

  /**
   * Check if at concurrent session limit
   * Assumes default limit of 5 if not specified
   */
  const isAtLimit = useMemo(
    () => activeSessionCount >= 5,
    [activeSessionCount]
  );

  return {
    sessions,
    currentSession,
    isLoading,
    error,
    refresh,
    terminateSession,
    terminateOtherSessions,
    isAtLimit,
    activeSessionCount,
  };
}
