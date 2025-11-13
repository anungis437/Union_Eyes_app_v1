/**
 * TriggerService - Event-based workflow trigger management
 *
 * Manages workflow triggers including event listeners, schedulers,
 * webhooks, and trigger registration.
 *
 * Features:
 * - Document event triggers
 * - Case event triggers
 * - Scheduled triggers (cron)
 * - Webhook triggers
 * - API triggers
 * - Custom event triggers
 *
 * @module TriggerService
 */
import type { WorkflowEngine } from './WorkflowEngine';
import type { TriggerType } from './WorkflowEngine';
export interface TriggerEvent {
    type: TriggerType;
    data: Record<string, any>;
    organizationId: string;
    userId: string;
    timestamp: Date;
}
export interface ScheduledTrigger {
    id: string;
    workflowId: string;
    schedule: string;
    timezone: string;
    lastRun?: Date;
    nextRun: Date;
    enabled: boolean;
}
export interface WebhookTrigger {
    id: string;
    workflowId: string;
    url: string;
    secret: string;
    enabled: boolean;
}
export declare class TriggerService {
    private supabase;
    private workflowEngine;
    private eventListeners;
    private scheduledTriggers;
    private webhookTriggers;
    constructor(workflowEngine: WorkflowEngine);
    /**
     * Initialize trigger service
     */
    private initialize;
    /**
     * Set up database change listeners
     */
    private setupDatabaseListeners;
    /**
     * Handle document upload event
     */
    private handleDocumentUpload;
    /**
     * Handle document status change event
     */
    private handleDocumentStatusChange;
    /**
     * Handle case status change event
     */
    private handleCaseStatusChange;
    /**
     * Fire event to matching workflows
     */
    fireEvent(event: TriggerEvent): Promise<void>;
    /**
     * Check if event matches trigger configuration
     */
    private matchesTriggerConfig;
    /**
     * Load scheduled triggers from database
     */
    private loadScheduledTriggers;
    /**
     * Register scheduled trigger
     */
    registerScheduledTrigger(workflow: any): void;
    /**
     * Unregister scheduled trigger
     */
    unregisterScheduledTrigger(workflowId: string): void;
    /**
     * Parse schedule to interval milliseconds
     */
    private parseSchedule;
    /**
     * Load webhook triggers from database
     */
    private loadWebhookTriggers;
    /**
     * Create webhook trigger
     */
    createWebhookTrigger(workflowId: string): Promise<WebhookTrigger>;
    /**
     * Handle webhook request
     */
    handleWebhook(webhookId: string, data: any, signature?: string): Promise<{
        success: boolean;
        executionId?: string;
    }>;
    /**
     * Verify webhook signature
     */
    private verifyWebhookSignature;
    /**
     * Generate webhook ID
     */
    private generateWebhookId;
    /**
     * Generate webhook secret
     */
    private generateWebhookSecret;
    /**
     * Trigger workflow manually via API
     */
    triggerWorkflow(workflowId: string, data: Record<string, any>, userId: string): Promise<{
        success: boolean;
        executionId: string;
    }>;
    /**
     * Register custom event listener
     */
    addEventListener(eventType: string, listener: EventListener): void;
    /**
     * Remove event listener
     */
    removeEventListener(eventType: string, listener: EventListener): void;
    /**
     * Emit custom event
     */
    emitEvent(eventType: string, event: TriggerEvent): Promise<void>;
    /**
     * Clean up resources
     */
    cleanup(): void;
}
export type EventListener = (event: TriggerEvent) => Promise<void> | void;
//# sourceMappingURL=TriggerService.d.ts.map