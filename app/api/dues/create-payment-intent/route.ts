import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

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
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = createPaymentIntentSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  // Rate limiting: 20 financial write operations per hour per user
  const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.FINANCIAL_WRITE);
  if (!rateLimitResult.allowed) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(), userId,
      endpoint: '/api/dues/create-payment-intent',
      method: 'POST',
      eventType: 'auth_failed',
      severity: 'medium',
      details: { reason: 'Rate limit exceeded' },
    });
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Too many financial write requests.',
        resetIn: rateLimitResult.resetIn 
      },
      { 
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
        return NextResponse.json(
          { error: 'Forbidden - Can only create payment intents for your own account' },
          { status: 403 }
        );
      }

      console.log('[create-payment-intent] Request body:', { requestedUserId, amount, savePaymentMethod });

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
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      // Create Stripe customer if doesn't exist
      const memberMetadata = member.metadata ? JSON.parse(member.metadata) as Record<string, unknown> : {};
      let customerId = memberMetadata?.stripeCustomerId as string | undefined;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: member.email,
          name: member.name,
          metadata: {
            memberId: member.id,
            tenantId: member.tenantId,
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
          tenantId: member.tenantId,
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

      console.error('Error creating payment intent:', error);
      return NextResponse.json(
        { error: 'Failed to create payment intent' },
        { status: 500 }
      );
    }
});


