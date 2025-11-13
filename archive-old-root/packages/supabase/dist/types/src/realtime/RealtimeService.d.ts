/**
 * Supabase Pro Real-time Service
 *
 * Comprehensive real-time functionality leveraging Supabase Pro features:
 * - Collaborative document editing
 * - Live matter status updates
 * - Real-time notifications
 * - Multi-user presence indicators
 * - Live billing meter updates
 *
 * @module RealtimeService
 */
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';
export interface RealtimeSubscription {
    id: string;
    channel: RealtimeChannel;
    tableName: string;
    organizationId?: string;
    userId?: string;
    callback: (payload: any) => void;
}
export interface PresenceState {
    userId: string;
    userName: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen: string;
    currentPage?: string;
    activeDocument?: string;
    activeMatter?: string;
}
export interface NotificationPayload {
    id: string;
    type: 'matter_update' | 'document_shared' | 'deadline_reminder' | 'billing_alert' | 'task_assigned';
    title: string;
    message: string;
    actionUrl?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    organizationId: string;
    userId?: string;
    metadata?: Record<string, any>;
    timestamp: string;
}
export declare class RealtimeService {
    private supabase;
    private subscriptions;
    private presenceChannel?;
    private notificationChannel?;
    constructor(supabase: SupabaseClient<Database>);
    /**
     * Track user presence across the application
     */
    trackPresence(organizationId: string, user: {
        id: string;
        name: string;
        avatar?: string;
    }): Promise<RealtimeChannel>;
    /**
     * Update user's current activity (page, document, matter)
     */
    updatePresenceActivity(activity: {
        currentPage?: string;
        activeDocument?: string;
        activeMatter?: string;
    }): Promise<void>;
    private handlePresenceSync;
    private handlePresenceJoin;
    private handlePresenceLeave;
    /**
     * Enable real-time collaborative editing for documents
     */
    subscribeToDocumentChanges(documentId: string, organizationId: string, onUpdate: (change: any) => void): string;
    /**
     * Broadcast cursor position to other collaborators
     */
    broadcastCursorPosition(documentId: string, position: {
        line: number;
        column: number;
        userId: string;
        userName: string;
    }): Promise<void>;
    /**
     * Subscribe to matter status changes and updates
     */
    subscribeToMatterUpdates(organizationId: string, onUpdate: (matter: any) => void): string;
    /**
     * Subscribe to real-time notifications for the organization
     */
    subscribeToNotifications(organizationId: string, userId: string, onNotification: (notification: NotificationPayload) => void): string;
    /**
     * Send real-time notification to organization members
     */
    sendNotification(notification: Omit<NotificationPayload, 'id' | 'timestamp'>): Promise<void>;
    /**
     * Subscribe to real-time billing updates and usage metrics
     */
    subscribeToBillingUpdates(organizationId: string, onUpdate: (billingData: any) => void): string;
    /**
     * Unsubscribe from a specific real-time subscription
     */
    unsubscribe(subscriptionId: string): Promise<void>;
    /**
     * Unsubscribe from all active subscriptions
     */
    unsubscribeAll(): Promise<void>;
    /**
     * Get all active subscriptions
     */
    getActiveSubscriptions(): RealtimeSubscription[];
    /**
     * Check connection status
     */
    getConnectionStatus(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';
}
export { useRealtimePresence } from './hooks/useRealtimePresence';
export { useRealtimeNotifications } from './hooks/useRealtimeNotifications';
export { useCollaborativeDocument } from './hooks/useCollaborativeDocument';
export { useRealtimeBilling } from './hooks/useRealtimeBilling';
//# sourceMappingURL=RealtimeService.d.ts.map