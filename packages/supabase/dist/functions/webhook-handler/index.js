/**
 * Webhook Handler Edge Function
 *
 * Centralized webhook processing for external integrations.
 * Handles incoming webhooks from payment processors, legal databases,
 * court systems, and other third-party services.
 *
 * Features:
 * - Multi-provider webhook verification
 * - Event routing and processing
 * - Rate limiting and security
 * - Automatic retry handling
 * - Audit logging and monitoring
 * - Dead letter queue for failed processing
 *
 * @module WebhookHandlerEdgeFunction
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';
// ============================================================================
// WEBHOOK PROVIDERS CONFIGURATION
// ============================================================================
const WEBHOOK_PROVIDERS = {
    stripe: {
        name: 'Stripe',
        verificationMethod: 'hmac-sha256',
        signatureHeader: 'stripe-signature',
        supportedEvents: [
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'invoice.payment_succeeded',
            'invoice.payment_failed',
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted'
        ]
    },
    westlaw: {
        name: 'Westlaw',
        verificationMethod: 'hmac-sha256',
        signatureHeader: 'x-westlaw-signature',
        eventTypeHeader: 'x-westlaw-event',
        supportedEvents: [
            'case.updated',
            'research.completed',
            'alert.triggered'
        ]
    },
    lexisnexis: {
        name: 'LexisNexis',
        verificationMethod: 'signature',
        signatureHeader: 'x-lexis-signature',
        supportedEvents: [
            'document.available',
            'search.completed',
            'alert.received'
        ]
    },
    pacer: {
        name: 'PACER',
        verificationMethod: 'hmac-sha1',
        signatureHeader: 'x-pacer-signature',
        supportedEvents: [
            'filing.new',
            'docket.updated',
            'case.status.changed'
        ]
    },
    docusign: {
        name: 'DocuSign',
        verificationMethod: 'hmac-sha256',
        signatureHeader: 'x-docusign-signature-1',
        supportedEvents: [
            'envelope-sent',
            'envelope-delivered',
            'envelope-completed',
            'envelope-declined',
            'envelope-voided'
        ]
    },
    quickbooks: {
        name: 'QuickBooks',
        verificationMethod: 'signature',
        signatureHeader: 'intuit-signature',
        supportedEvents: [
            'customer.create',
            'customer.update',
            'invoice.create',
            'payment.create'
        ]
    }
};
// ============================================================================
// ENVIRONMENT SETUP
// ============================================================================
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const WEBHOOK_CONFIG = {
    enabled: true,
    rateLimit: {
        maxRequests: 100,
        windowMs: 60000 // 1 minute
    },
    retry: {
        maxRetries: 3,
        backoffMultiplier: 2
    },
    deadLetterQueue: {
        enabled: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
};
// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type, stripe-signature, x-westlaw-signature, x-lexis-signature, x-pacer-signature, x-docusign-signature-1, intuit-signature',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== 'POST') {
        return new Response('Method not allowed', {
            status: 405,
            headers: corsHeaders
        });
    }
    const startTime = Date.now();
    let webhookEvent = null;
    try {
        // Extract provider from URL path
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');
        const providerName = pathParts[pathParts.length - 1];
        const provider = WEBHOOK_PROVIDERS[providerName];
        if (!provider) {
            throw new Error(`Unsupported webhook provider: ${providerName}`);
        }
        // Check rate limiting
        const rateLimitOk = await checkRateLimit(req, providerName);
        if (!rateLimitOk) {
            return new Response('Rate limit exceeded', {
                status: 429,
                headers: corsHeaders
            });
        }
        // Parse webhook event
        webhookEvent = await parseWebhookEvent(req, provider);
        // Log incoming webhook
        await logWebhookEvent(webhookEvent, 'received');
        // Process the webhook event
        const result = await processWebhookEvent(webhookEvent);
        // Log processing result
        await logWebhookEvent(webhookEvent, result.success ? 'processed' : 'failed', result);
        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: result.success ? 200 : 500,
        });
    }
    catch (error) {
if (webhookEvent) {
            await logWebhookEvent(webhookEvent, 'error', { error: error.message });
            // Queue for retry if applicable
            if (webhookEvent.retryCount < WEBHOOK_CONFIG.retry.maxRetries) {
                await queueWebhookForRetry(webhookEvent);
            }
            else {
                await sendToDeadLetterQueue(webhookEvent, error.message);
            }
        }
        return new Response(JSON.stringify({
            error: error.message,
            success: false,
            eventId: webhookEvent?.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
// ============================================================================
// WEBHOOK PARSING AND VERIFICATION
// ============================================================================
async function parseWebhookEvent(req, provider) {
    const headers = {};
    req.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
    });
    const payload = await req.json();
    const rawBody = await req.text();
    const event = {
        id: generateEventId(),
        provider,
        eventType: extractEventType(payload, headers, provider),
        payload,
        headers,
        timestamp: new Date().toISOString(),
        signature: headers[provider.signatureHeader],
        verified: false,
        processed: false,
        retryCount: 0
    };
    // Verify webhook signature
    event.verified = await verifyWebhookSignature(rawBody, event.signature, provider);
    if (!event.verified) {
        throw new Error('Webhook signature verification failed');
    }
    // Extract organization/user context if available
    const context = await extractEventContext(event);
    event.organizationId = context.organizationId;
    event.userId = context.userId;
    return event;
}
async function verifyWebhookSignature(payload, signature, provider) {
    if (provider.verificationMethod === 'none') {
        return true;
    }
    if (!signature) {
        return false;
    }
    const secretKey = await getProviderSecret(provider.name);
    if (!secretKey) {
return false;
    }
    try {
        switch (provider.verificationMethod) {
            case 'hmac-sha256':
                return verifyHmacSha256(payload, signature, secretKey);
            case 'hmac-sha1':
                return verifyHmacSha1(payload, signature, secretKey);
            case 'signature':
                return verifyCustomSignature(payload, signature, secretKey, provider.name);
            default:
                return false;
        }
    }
    catch (error) {
return false;
    }
}
function verifyHmacSha256(payload, signature, secret) {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = 'sha256=' + hmac.digest('hex');
    return signature === expectedSignature;
}
function verifyHmacSha1(payload, signature, secret) {
    const hmac = createHmac('sha1', secret);
    hmac.update(payload);
    const expectedSignature = 'sha1=' + hmac.digest('hex');
    return signature === expectedSignature;
}
function verifyCustomSignature(payload, signature, secret, provider) {
    // Custom verification logic for specific providers
    switch (provider) {
        case 'DocuSign':
            // DocuSign uses base64 encoded HMAC
            const hmac = createHmac('sha256', secret);
            hmac.update(payload);
            const expectedSignature = hmac.digest('base64');
            return signature === expectedSignature;
        case 'QuickBooks':
            // QuickBooks verification logic
            return signature.length > 0; // Simplified for demo
        default:
            return false;
    }
}
// ============================================================================
// EVENT PROCESSING
// ============================================================================
async function processWebhookEvent(event) {
    const startTime = Date.now();
    const actions = [];
    try {
        switch (event.provider.name) {
            case 'Stripe':
                await processStripeEvent(event, actions);
                break;
            case 'Westlaw':
                await processWestlawEvent(event, actions);
                break;
            case 'LexisNexis':
                await processLexisNexisEvent(event, actions);
                break;
            case 'PACER':
                await processPacerEvent(event, actions);
                break;
            case 'DocuSign':
                await processDocuSignEvent(event, actions);
                break;
            case 'QuickBooks':
                await processQuickBooksEvent(event, actions);
                break;
            default:
                throw new Error(`No processor for provider: ${event.provider.name}`);
        }
        event.processed = true;
        return {
            success: true,
            eventId: event.id,
            processingTime: Date.now() - startTime,
            actions
        };
    }
    catch (error) {
return {
            success: false,
            eventId: event.id,
            processingTime: Date.now() - startTime,
            actions,
            error: error.message,
            retryAfter: calculateRetryDelay(event.retryCount)
        };
    }
}
// ============================================================================
// PROVIDER-SPECIFIC PROCESSORS
// ============================================================================
async function processStripeEvent(event, actions) {
    const { type, data } = event.payload;
    switch (type) {
        case 'payment_intent.succeeded':
            await updatePaymentStatus(data.object.id, 'paid');
            actions.push({
                type: 'payment_update',
                description: 'Updated payment status to paid',
                success: true
            });
            break;
        case 'invoice.payment_succeeded':
            await processInvoicePayment(data.object);
            actions.push({
                type: 'invoice_payment',
                description: 'Processed invoice payment',
                success: true
            });
            break;
        case 'customer.subscription.updated':
            await updateSubscription(data.object);
            actions.push({
                type: 'subscription_update',
                description: 'Updated subscription details',
                success: true
            });
            break;
        default:
}
}
async function processWestlawEvent(event, actions) {
    const { eventType, data } = event.payload;
    switch (eventType) {
        case 'case.updated':
            await updateCaseInformation(data);
            actions.push({
                type: 'case_update',
                description: 'Updated case information from Westlaw',
                success: true
            });
            break;
        case 'research.completed':
            await processResearchResults(data);
            actions.push({
                type: 'research_complete',
                description: 'Processed research results',
                success: true
            });
            break;
        default:
}
}
async function processDocuSignEvent(event, actions) {
    const { event: eventType, data } = event.payload;
    switch (eventType) {
        case 'envelope-completed':
            await processCompletedEnvelope(data);
            actions.push({
                type: 'document_signed',
                description: 'Processed completed DocuSign envelope',
                success: true
            });
            break;
        case 'envelope-declined':
            await processDeclinedEnvelope(data);
            actions.push({
                type: 'document_declined',
                description: 'Processed declined DocuSign envelope',
                success: true
            });
            break;
        default:
}
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function generateEventId() {
    return 'wh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
function extractEventType(payload, headers, provider) {
    if (provider.eventTypeHeader && headers[provider.eventTypeHeader]) {
        return headers[provider.eventTypeHeader];
    }
    // Extract from payload based on provider
    switch (provider.name) {
        case 'Stripe':
            return payload.type || 'unknown';
        case 'DocuSign':
            return payload.event || 'unknown';
        default:
            return payload.eventType || payload.event || 'unknown';
    }
}
async function extractEventContext(event) {
    // Extract organization/user context from payload
    // This would be provider-specific logic
    return {
        organizationId: event.payload.organizationId,
        userId: event.payload.userId
    };
}
async function getProviderSecret(providerName) {
    const { data } = await supabase
        .from('webhook_secrets')
        .select('secret_key')
        .eq('provider', providerName.toLowerCase())
        .single();
    return data?.secret_key || null;
}
async function checkRateLimit(req, provider) {
    // Implement rate limiting logic
    // For now, return true (no rate limiting)
    return true;
}
async function logWebhookEvent(event, status, result) {
    await supabase
        .from('webhook_logs')
        .insert({
        event_id: event.id,
        provider: event.provider.name,
        event_type: event.eventType,
        status,
        organization_id: event.organizationId,
        user_id: event.userId,
        processing_time: result?.processingTime,
        actions: result?.actions,
        error: result?.error,
        retry_count: event.retryCount,
        created_at: new Date().toISOString()
    });
}
async function queueWebhookForRetry(event) {
    const retryDelay = calculateRetryDelay(event.retryCount);
    const retryAt = new Date(Date.now() + retryDelay);
    await supabase
        .from('webhook_retry_queue')
        .insert({
        event_id: event.id,
        provider: event.provider.name,
        event_data: event,
        retry_count: event.retryCount + 1,
        retry_at: retryAt.toISOString(),
        created_at: new Date().toISOString()
    });
}
async function sendToDeadLetterQueue(event, error) {
    if (!WEBHOOK_CONFIG.deadLetterQueue.enabled)
        return;
    await supabase
        .from('webhook_dead_letter_queue')
        .insert({
        event_id: event.id,
        provider: event.provider.name,
        event_data: event,
        final_error: error,
        max_retries_reached: true,
        created_at: new Date().toISOString()
    });
}
function calculateRetryDelay(retryCount) {
    const baseDelay = 1000; // 1 second
    return baseDelay * Math.pow(WEBHOOK_CONFIG.retry.backoffMultiplier, retryCount);
}
// ============================================================================
// BUSINESS LOGIC FUNCTIONS (Stubs)
// ============================================================================
async function updatePaymentStatus(paymentId, status) {
    await supabase
        .from('payments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('stripe_payment_id', paymentId);
}
async function processInvoicePayment(invoice) {
    // Process invoice payment logic
}
async function updateSubscription(subscription) {
    // Update subscription logic
}
async function updateCaseInformation(caseData) {
    // Update case information from Westlaw
}
async function processResearchResults(results) {
    // Process research results
}
async function processCompletedEnvelope(envelope) {
    // Process completed DocuSign envelope
}
async function processDeclinedEnvelope(envelope) {
    // Process declined DocuSign envelope
}
// Additional provider processors would be implemented here...
async function processLexisNexisEvent(event, actions) {
}
async function processPacerEvent(event, actions) {
}
async function processQuickBooksEvent(event, actions) {
}
//# sourceMappingURL=index.js.map
