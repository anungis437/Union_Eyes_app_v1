/**
 * Real-time Presence Hook
 * 
 * React hook for tracking user presence and online status
 * across the CourtLens application.
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../../client';
import { RealtimeService, PresenceState } from '../RealtimeService';

export interface UseRealtimePresenceProps {
  organizationId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  enabled?: boolean;
}

export interface UseRealtimePresenceReturn {
  onlineUsers: PresenceState[];
  isConnected: boolean;
  updateActivity: (activity: {
    currentPage?: string;
    activeDocument?: string;
    activeMatter?: string;
  }) => Promise<void>;
  getUsersInDocument: (documentId: string) => PresenceState[];
  getUsersInMatter: (matterId: string) => PresenceState[];
}

export function useRealtimePresence({
  organizationId,
  user,
  enabled = true
}: UseRealtimePresenceProps): UseRealtimePresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const [realtimeService, setRealtimeService] = useState<RealtimeService | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !organizationId || !user.id) return;

    const supabase = getSupabaseClient();
    const service = new RealtimeService(supabase);
    setRealtimeService(service);

    const setupPresence = async () => {
      try {
        await service.trackPresence(organizationId, user);
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      }
    };

    // Listen for presence events
    const handlePresenceSync = (event: CustomEvent) => {
      setOnlineUsers(event.detail.users);
    };

    const handlePresenceJoin = (event: CustomEvent) => {
      const { userId, user: joinedUser } = event.detail;
      setOnlineUsers(prev => {
        const exists = prev.find(u => u.userId === userId);
        if (exists) return prev;
        return [...prev, { userId, ...joinedUser, isOnline: true }];
      });
    };

    const handlePresenceLeave = (event: CustomEvent) => {
      const { userId } = event.detail;
      setOnlineUsers(prev => prev.filter(u => u.userId !== userId));
    };

    window.addEventListener('presence:sync', handlePresenceSync as EventListener);
    window.addEventListener('presence:join', handlePresenceJoin as EventListener);
    window.addEventListener('presence:leave', handlePresenceLeave as EventListener);

    setupPresence();

    return () => {
      window.removeEventListener('presence:sync', handlePresenceSync as EventListener);
      window.removeEventListener('presence:join', handlePresenceJoin as EventListener);
      window.removeEventListener('presence:leave', handlePresenceLeave as EventListener);
      service.unsubscribeAll();
    };
  }, [organizationId, user.id, user.name, user.avatar, enabled]);

  const updateActivity = useCallback(async (activity: {
    currentPage?: string;
    activeDocument?: string;
    activeMatter?: string;
  }) => {
    if (!realtimeService) return;
    await realtimeService.updatePresenceActivity(activity);
  }, [realtimeService]);

  const getUsersInDocument = useCallback((documentId: string): PresenceState[] => {
    return onlineUsers.filter(user => user.activeDocument === documentId);
  }, [onlineUsers]);

  const getUsersInMatter = useCallback((matterId: string): PresenceState[] => {
    return onlineUsers.filter(user => user.activeMatter === matterId);
  }, [onlineUsers]);

  return {
    onlineUsers,
    isConnected,
    updateActivity,
    getUsersInDocument,
    getUsersInMatter
  };
}
