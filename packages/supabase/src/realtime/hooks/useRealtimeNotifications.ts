/**
 * Real-time Notifications Hook
 * 
 * React hook for handling real-time notifications
 * across the CourtLens application.
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../../client';
import { RealtimeService, NotificationPayload } from '../RealtimeService';

export interface UseRealtimeNotificationsProps {
  organizationId: string;
  userId: string;
  enabled?: boolean;
}

export interface UseRealtimeNotificationsReturn {
  notifications: NotificationPayload[];
  unreadCount: number;
  isConnected: boolean;
  sendNotification: (notification: Omit<NotificationPayload, 'id' | 'timestamp'>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
}

export function useRealtimeNotifications({
  organizationId,
  userId,
  enabled = true
}: UseRealtimeNotificationsProps): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [realtimeService, setRealtimeService] = useState<RealtimeService | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const unreadCount = notifications.length;

  useEffect(() => {
    if (!enabled || !organizationId || !userId) return;

    const supabase = getSupabaseClient();
    const service = new RealtimeService(supabase);
    setRealtimeService(service);

    const setupNotifications = async () => {
      try {
        // Subscribe to new notifications
        service.subscribeToNotifications(organizationId, userId, (notification) => {
          setNotifications(prev => {
            // Avoid duplicates
            const exists = prev.find(n => n.id === notification.id);
            if (exists) return prev;
            return [notification, ...prev];
          });

          // Show browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
              tag: notification.id
            });
          }
        });

        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
      }
    };

    setupNotifications();

    return () => {
      service.unsubscribeAll();
    };
  }, [organizationId, userId, enabled]);

  const sendNotification = useCallback(async (notification: Omit<NotificationPayload, 'id' | 'timestamp'>) => {
    if (!realtimeService) return;
    await realtimeService.sendNotification(notification);
  }, [realtimeService]);

  const markAsRead = useCallback(async (notificationId: string) => {
    // Remove from local state (database update would be implemented with proper types)
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Clear local state (database update would be implemented with proper types)
    setNotifications([]);
  }, []);

  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    sendNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications
  };
}
