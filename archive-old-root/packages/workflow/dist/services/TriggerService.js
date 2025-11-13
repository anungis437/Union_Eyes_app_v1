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
import { createClient } from '@supabase/supabase-js';
// ============================================================================
// TriggerService Class
// ============================================================================
export class TriggerService {
    constructor(workflowEngine) {
        this.eventListeners = new Map();
        this.scheduledTriggers = new Map();
        this.webhookTriggers = new Map();
        this.supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
        this.workflowEngine = workflowEngine;
        this.initialize();
    }
    // ==========================================================================
    // Initialization
    // ==========================================================================
    /**
     * Initialize trigger service
     */
    async initialize() {
        // Load scheduled triggers
        await this.loadScheduledTriggers();
        // Load webhook triggers
        await this.loadWebhookTriggers();
        // Set up database listeners
        this.setupDatabaseListeners();
    }
    /**
     * Set up database change listeners
     */
    setupDatabaseListeners() {
        // Document changes
        this.supabase
            .channel('documents')
            .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'documents',
        }, (payload) => {
            this.handleDocumentUpload(payload.new);
        })
            .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'documents',
        }, (payload) => {
            this.handleDocumentStatusChange(payload.old, payload.new);
        })
            .subscribe();
        // Case changes
        this.supabase
            .channel('cases')
            .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'cases',
        }, (payload) => {
            this.handleCaseStatusChange(payload.old, payload.new);
        })
            .subscribe();
    }
    // ==========================================================================
    // Event Handlers
    // ==========================================================================
    /**
     * Handle document upload event
     */
    async handleDocumentUpload(document) {
        const event = {
            type: 'document_upload',
            data: {
                documentId: document.id,
                documentName: document.name,
                documentType: document.type,
                caseId: document.case_id,
                uploadedBy: document.uploaded_by,
            },
            organizationId: document.organization_id,
            userId: document.uploaded_by,
            timestamp: new Date(),
        };
        await this.fireEvent(event);
    }
    /**
     * Handle document status change event
     */
    async handleDocumentStatusChange(oldDocument, newDocument) {
        if (oldDocument.status === newDocument.status) {
            return;
        }
        const event = {
            type: 'document_status_change',
            data: {
                documentId: newDocument.id,
                documentName: newDocument.name,
                oldStatus: oldDocument.status,
                newStatus: newDocument.status,
                caseId: newDocument.case_id,
            },
            organizationId: newDocument.organization_id,
            userId: newDocument.updated_by,
            timestamp: new Date(),
        };
        await this.fireEvent(event);
    }
    /**
     * Handle case status change event
     */
    async handleCaseStatusChange(oldCase, newCase) {
        if (oldCase.status === newCase.status) {
            return;
        }
        const event = {
            type: 'case_status_change',
            data: {
                caseId: newCase.id,
                caseName: newCase.name,
                caseNumber: newCase.case_number,
                oldStatus: oldCase.status,
                newStatus: newCase.status,
            },
            organizationId: newCase.organization_id,
            userId: newCase.updated_by,
            timestamp: new Date(),
        };
        await this.fireEvent(event);
    }
    // ==========================================================================
    // Event Firing
    // ==========================================================================
    /**
     * Fire event to matching workflows
     */
    async fireEvent(event) {
        // Find workflows with matching triggers
        const { data: workflows } = await this.supabase
            .from('workflows')
            .select('*')
            .eq('status', 'active')
            .eq('organization_id', event.organizationId)
            .eq('trigger->type', event.type);
        if (!workflows || workflows.length === 0) {
            return;
        }
        // Execute matching workflows
        for (const workflow of workflows) {
            try {
                // Check if trigger config matches event
                if (this.matchesTriggerConfig(workflow.trigger, event)) {
                    await this.workflowEngine.executeWorkflow(workflow.id, event.data, event.userId);
                }
            }
            catch (error) {
                console.error(`Failed to execute workflow ${workflow.id}:`, error);
            }
        }
    }
    /**
     * Check if event matches trigger configuration
     */
    matchesTriggerConfig(trigger, event) {
        const config = trigger.config;
        switch (event.type) {
            case 'document_upload':
                // Check document types
                if (config.documentTypes && Array.isArray(config.documentTypes)) {
                    return config.documentTypes.includes(event.data.documentType);
                }
                return true;
            case 'document_status_change':
                // Check statuses
                if (config.statuses && Array.isArray(config.statuses)) {
                    return config.statuses.includes(event.data.newStatus);
                }
                return true;
            case 'case_status_change':
                // Check statuses
                if (config.statuses && Array.isArray(config.statuses)) {
                    return config.statuses.includes(event.data.newStatus);
                }
                return true;
            default:
                return true;
        }
    }
    // ==========================================================================
    // Scheduled Triggers
    // ==========================================================================
    /**
     * Load scheduled triggers from database
     */
    async loadScheduledTriggers() {
        const { data: workflows } = await this.supabase
            .from('workflows')
            .select('*')
            .eq('status', 'active')
            .eq('trigger->type', 'date_time');
        if (!workflows)
            return;
        for (const workflow of workflows) {
            this.registerScheduledTrigger(workflow);
        }
    }
    /**
     * Register scheduled trigger
     */
    registerScheduledTrigger(workflow) {
        const trigger = workflow.trigger;
        const config = trigger.config;
        if (!config.schedule && !config.cron) {
            return;
        }
        // Parse schedule
        const intervalMs = this.parseSchedule(config.schedule, config.cron);
        if (intervalMs === null) {
            console.error(`Invalid schedule for workflow ${workflow.id}`);
            return;
        }
        // Set up interval
        const timer = setInterval(async () => {
            try {
                await this.workflowEngine.executeWorkflow(workflow.id, {
                    timestamp: new Date().toISOString(),
                    trigger: 'scheduled',
                }, workflow.created_by);
            }
            catch (error) {
                console.error(`Failed to execute scheduled workflow ${workflow.id}:`, error);
            }
        }, intervalMs);
        this.scheduledTriggers.set(workflow.id, timer);
    }
    /**
     * Unregister scheduled trigger
     */
    unregisterScheduledTrigger(workflowId) {
        const timer = this.scheduledTriggers.get(workflowId);
        if (timer) {
            clearInterval(timer);
            this.scheduledTriggers.delete(workflowId);
        }
    }
    /**
     * Parse schedule to interval milliseconds
     */
    parseSchedule(schedule, cron) {
        if (schedule) {
            const schedules = {
                'hourly': 60 * 60 * 1000,
                'daily': 24 * 60 * 60 * 1000,
                'weekly': 7 * 24 * 60 * 60 * 1000,
                'monthly': 30 * 24 * 60 * 60 * 1000,
            };
            return schedules[schedule] || null;
        }
        if (cron) {
            // Basic cron parsing (simplified)
            // In production, use a proper cron library
            return 60 * 60 * 1000; // Default to hourly
        }
        return null;
    }
    // ==========================================================================
    // Webhook Triggers
    // ==========================================================================
    /**
     * Load webhook triggers from database
     */
    async loadWebhookTriggers() {
        const { data: webhooks } = await this.supabase
            .from('workflow_webhooks')
            .select('*')
            .eq('enabled', true);
        if (!webhooks)
            return;
        for (const webhook of webhooks) {
            this.webhookTriggers.set(webhook.id, webhook);
        }
    }
    /**
     * Create webhook trigger
     */
    async createWebhookTrigger(workflowId) {
        const webhookId = this.generateWebhookId();
        const secret = this.generateWebhookSecret();
        const url = `${process.env.NEXT_PUBLIC_API_URL}/webhooks/${webhookId}`;
        const { data, error } = await this.supabase
            .from('workflow_webhooks')
            .insert({
            id: webhookId,
            workflow_id: workflowId,
            url,
            secret,
            enabled: true,
        })
            .select()
            .single();
        if (error)
            throw error;
        const webhook = {
            id: data.id,
            workflowId: data.workflow_id,
            url: data.url,
            secret: data.secret,
            enabled: data.enabled,
        };
        this.webhookTriggers.set(webhook.id, webhook);
        return webhook;
    }
    /**
     * Handle webhook request
     */
    async handleWebhook(webhookId, data, signature) {
        const webhook = this.webhookTriggers.get(webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }
        // Verify signature if provided
        if (signature && !this.verifyWebhookSignature(data, signature, webhook.secret)) {
            throw new Error('Invalid webhook signature');
        }
        // Execute workflow
        const { data: workflow } = await this.supabase
            .from('workflows')
            .select('*')
            .eq('id', webhook.workflowId)
            .single();
        if (!workflow) {
            throw new Error('Workflow not found');
        }
        const execution = await this.workflowEngine.executeWorkflow(workflow.id, data, 'webhook');
        return {
            success: true,
            executionId: execution.id,
        };
    }
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(data, signature, secret) {
        // Implement HMAC verification
        // In production, use crypto module
        return true; // Simplified for now
    }
    /**
     * Generate webhook ID
     */
    generateWebhookId() {
        return `wh_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    /**
     * Generate webhook secret
     */
    generateWebhookSecret() {
        return `whsec_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    }
    // ==========================================================================
    // API Triggers
    // ==========================================================================
    /**
     * Trigger workflow manually via API
     */
    async triggerWorkflow(workflowId, data, userId) {
        const execution = await this.workflowEngine.executeWorkflow(workflowId, data, userId, { skipConditions: false });
        return {
            success: execution.status === 'completed',
            executionId: execution.id,
        };
    }
    // ==========================================================================
    // Custom Event Triggers
    // ==========================================================================
    /**
     * Register custom event listener
     */
    addEventListener(eventType, listener) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }
        this.eventListeners.get(eventType).add(listener);
    }
    /**
     * Remove event listener
     */
    removeEventListener(eventType, listener) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.delete(listener);
        }
    }
    /**
     * Emit custom event
     */
    async emitEvent(eventType, event) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    await listener(event);
                }
                catch (error) {
                    console.error(`Event listener error for ${eventType}:`, error);
                }
            }
        }
        // Also fire to workflow engine
        await this.fireEvent(event);
    }
    // ==========================================================================
    // Cleanup
    // ==========================================================================
    /**
     * Clean up resources
     */
    cleanup() {
        // Clear all scheduled triggers
        for (const timer of this.scheduledTriggers.values()) {
            clearInterval(timer);
        }
        this.scheduledTriggers.clear();
        // Clear event listeners
        this.eventListeners.clear();
    }
}
//# sourceMappingURL=TriggerService.js.map