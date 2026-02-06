/**
 * Real-time Presence Hook
 *
 * React hook for tracking user presence and online status
 * across the CourtLens application.
 */
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../../client';
import { RealtimeService } from '../RealtimeService';
export function useRealtimePresence({ organizationId, user, enabled = true }) {
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [realtimeService, setRealtimeService] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    useEffect(() => {
        if (!enabled || !organizationId || !user.id)
            return;
        const supabase = getSupabaseClient();
        const service = new RealtimeService(supabase);
        setRealtimeService(service);
        const setupPresence = async () => {
            try {
                await service.trackPresence(organizationId, user);
                setIsConnected(true);
            }
            catch (error) {
                console.error('Failed to setup presence tracking:', error);
                setIsConnected(false);
            }
        };
        // Listen for presence events
        const handlePresenceSync = (event) => {
            setOnlineUsers(event.detail.users);
        };
        const handlePresenceJoin = (event) => {
            const { userId, user: joinedUser } = event.detail;
            setOnlineUsers(prev => {
                const exists = prev.find(u => u.userId === userId);
                if (exists)
                    return prev;
                return [...prev, { userId, ...joinedUser, isOnline: true }];
            });
        };
        const handlePresenceLeave = (event) => {
            const { userId } = event.detail;
            setOnlineUsers(prev => prev.filter(u => u.userId !== userId));
        };
        window.addEventListener('presence:sync', handlePresenceSync);
        window.addEventListener('presence:join', handlePresenceJoin);
        window.addEventListener('presence:leave', handlePresenceLeave);
        setupPresence();
        return () => {
            window.removeEventListener('presence:sync', handlePresenceSync);
            window.removeEventListener('presence:join', handlePresenceJoin);
            window.removeEventListener('presence:leave', handlePresenceLeave);
            service.unsubscribeAll();
        };
    }, [organizationId, user.id, user.name, user.avatar, enabled]);
    const updateActivity = useCallback(async (activity) => {
        if (!realtimeService)
            return;
        await realtimeService.updatePresenceActivity(activity);
    }, [realtimeService]);
    const getUsersInDocument = useCallback((documentId) => {
        return onlineUsers.filter(user => user.activeDocument === documentId);
    }, [onlineUsers]);
    const getUsersInMatter = useCallback((matterId) => {
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
//# sourceMappingURL=useRealtimePresence.js.map