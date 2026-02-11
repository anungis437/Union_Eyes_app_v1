import { makeWebhookHandler } from "@whop-apps/sdk";
import { checkDatabaseConnection } from "@/db/db";
import { NextResponse } from "next/server";
import { logger } from '@/lib/logger';

// Import utility functions
import { handlePaymentSuccess, handlePaymentFailed } from "./utils/payment-handlers";
import { handleMembershipChange } from "./utils/membership-handlers";

// Lazy initialization to avoid module-level env var access during build
let handleWebhook: ReturnType<typeof makeWebhookHandler> | null = null;
function getWebhookHandler() {
  if (!handleWebhook) {
    handleWebhook = makeWebhookHandler();
  }
  return handleWebhook;
}

/**
 * Main webhook handler function
 * Receives events from Whop and routes them to the appropriate handlers
 * 
 * Note: This routes to payment-handlers.ts which now delegates frictionless payments
 * to frictionless-payment-handlers.ts based on the presence of email in metadata
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    
    // Convert back to request for the handler
    const newReq = new Request(req.url, {
      headers: req.headers,
      method: req.method,
      body: rawBody
    });
    
    // Check database connection health
    let dbStatus;
    try {
      dbStatus = await checkDatabaseConnection();
    } catch (dbError) {
      logger.error('Database connection check failed', dbError as Error);
      dbStatus = { ok: false, message: "Database connection check failed" };
    }
    
    if (!dbStatus.ok) {
      logger.error('Database unavailable for webhook processing', undefined, { message: dbStatus.message });
      // Even with DB issues, we return 200 to Whop to avoid retries
      return new Response(JSON.stringify({ 
        status: "warning", 
        message: "Database connection unavailable, event will not be processed" 
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Process the webhook with error handling for each handler function
    try {
      return getWebhookHandler()(newReq, {
        // When a membership becomes invalid
        membershipWentInvalid(event) {
          try {
            handleMembershipChange(event.data, false);
          } catch (error) {
            logger.error('Error in membershipWentInvalid handler', error as Error, { eventAction: event.action });
            // Don't rethrow, let the webhook complete successfully
          }
        },
        
        // When a payment is successfully processed
        paymentSucceeded(event) {
          try {
            handlePaymentSuccess(event.data);
          } catch (error) {
            logger.error('Error in paymentSucceeded handler', error as Error, { eventAction: event.action });
            // Don't rethrow, let the webhook complete successfully
          }
        },
        
        // When a payment fails
        paymentFailed(event) {
          try {
            handlePaymentFailed(event.data);
          } catch (error) {
            logger.error('Error in paymentFailed handler', error as Error, { eventAction: event.action, membershipId: event.data.id });
            // Don't rethrow, let the webhook complete successfully
          }
        }
      });
    } catch (webhookError) {
      console.error("Error in Whop webhook handler:", webhookError);
      // Return 200 even if there's an error in the webhook handler itself
      return new Response(JSON.stringify({ 
        status: "error", 
        message: "Webhook handler error but acknowledging receipt" 
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("Error processing Whop webhook:", error);
    // Always return 200 status to Whop even for errors
    return new Response(JSON.stringify({ 
      status: "error", 
      message: "Webhook processing error but acknowledging receipt" 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
} 
