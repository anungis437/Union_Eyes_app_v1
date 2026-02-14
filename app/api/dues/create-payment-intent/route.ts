import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkAndEnforceMultiLayerRateLimit } from '@/lib/middleware/rate-limit-middleware';
import { RATE_LIMITS, RATE_LIMITS_PER_IP } from '@/lib/rate-limiter';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * Validation schema
 */
const createPaymentIntentSchema = z.object({
  userId: z.string().uuid().describe('User ID for payment'),
  amount: z.number().positive().describe('Amount in dollars'),
  savePaymentMethod: z.boolean().optional(),
});

/**
 * POST /api/dues/create-payment-intent
 * Create a Stripe payment intent for dues payment
 */
export const POST = withEnhancedRoleAuth(60, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
  }

  const parsed = createPaymentIntentSchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  // ENHANCED SECURITY: Multi-layer rate limiting (per-user + per-IP)
  // Protects against:
  // - Compromised accounts (IP rate limit still protects)
  // - Multi-account attacks from single IP (per-user limit still protects)
  // - Payment fraud attempts
  const rateLimitResponse = await checkAndEnforceMultiLayerRateLimit(
    request,
    {
      perUser: RATE_LIMITS.FINANCIAL_WRITE,      // 20/hour per user
      perIP: RATE_LIMITS_PER_IP.FINANCIAL_WRITE, // 50/hour per IP
    },
    { userId }
  );

  if (rateLimitResponse) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/dues/create-payment-intent',
      method: 'POST',
      eventType: 'auth_failed',
      severity: 'high', // Elevated to high for financial endpoint
      details: { 
        reason: 'Multi-layer rate limit exceeded',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });
    return rateLimitResponse;
  }

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

    try {
      const { userId: requestedUserId, amount, savePaymentMethod } = body;

      // User making request must either be requesting their own payment or be admin
      // For now, allow user to request their own payment
      if (requestedUserId !== userId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/dues/create-payment-intent',
          method: 'POST',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'Cross-user payment attempt', requestedUserId },
        });
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Can only create payment intents for your own account'
    );
      }
// Get member record
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.userId, requestedUserId))
        .limit(1);

      if (!member) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/dues/create-payment-intent',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'medium',
          details: { reason: 'Member not found' },
        });
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Member not found'
    );
      }

      // Create Stripe customer if doesn&apos;t exist
      const memberMetadata = member.metadata ? JSON.parse(member.metadata) as Record<string, unknown> : {};
      let customerId = memberMetadata?.stripeCustomerId as string | undefined;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: member.email,
          name: member.name,
          metadata: {
            memberId: member.id,
            organizationId: member.organizationId,
          },
        });
        customerId = customer.id;

        // Update member with Stripe customer ID
        await db
          .update(members)
          .set({
            metadata: JSON.stringify({
              ...memberMetadata,
              stripeCustomerId: customerId,
            }),
            updatedAt: new Date(),
          })
          .where(eq(members.id, member.id));
      }

      // Create PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        setup_future_usage: savePaymentMethod ? 'off_session' : undefined,
        metadata: {
          memberId: member.id,
          organizationId: member.organizationId,
          type: 'dues_payment',
        },
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/dues/create-payment-intent',
        method: 'POST',
        eventType: 'success',
        severity: 'medium',
        details: {
          paymentIntentId: paymentIntent.id,
          amount,
          memberId: member.id,
        },
      });

      return NextResponse.json(
        {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        },
        {
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );

    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/dues/create-payment-intent',
        method: 'POST',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create payment intent',
      error
    );
    }
});


