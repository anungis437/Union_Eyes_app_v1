/**
 * Real-time Notifications Hook
 *
 * React hook for handling real-time notifications
 * across the CourtLens application.
 */
import { NotificationPayload } from '../RealtimeService';
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
export declare function useRealtimeNotifications({ organizationId, userId, enabled }: UseRealtimeNotificationsProps): UseRealtimeNotificationsReturn;
//# sourceMappingURL=useRealtimeNotifications.d.ts.map