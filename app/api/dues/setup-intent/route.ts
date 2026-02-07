import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { db } from '@/db';
import { members } from '@/services/financial-service/src/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * Create Stripe SetupIntent for saving payment method without charging
 */
const setupIntentSchema = z.object({});

export const POST = withEnhancedRoleAuth(60, async (request, context) => {
  const user = { id: context.userId, organizationId: context.organizationId };

// Find member by userId
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, user.id))
      .limit(1);

    if (!member) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user.id,
        endpoint: '/api/dues/setup-intent',
        method: 'POST',
        eventType: 'validation_failed',
        severity: 'medium',
        details: { reason: 'Member not found' },
      });
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    try {
      // Get or create Stripe customer
      const memberMetadata = member.metadata ? JSON.parse(member.metadata) as Record<string, unknown> : {};
      let customerId = memberMetadata?.stripeCustomerId as string | undefined;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: member.email || undefined,
          name: member.name,
          metadata: {
            memberId: member.id,
            tenantId: member.tenantId,
          },
        });

        customerId = customer.id;

        // Store customer ID in member metadata
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

      // Create SetupIntent
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card', 'us_bank_account'],
        usage: 'off_session', // For future payments
        metadata: {
          memberId: member.id,
          tenantId: member.tenantId,
        },
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user.id,
        endpoint: '/api/dues/setup-intent',
        method: 'POST',
        eventType: 'success',
        severity: 'medium',
        details: {
          dataType: 'FINANCIAL',
          setupIntentId: setupIntent.id,
          customerId,
          memberId: member.id,
        },
      });

      return NextResponse.json({
        clientSecret: setupIntent.client_secret,
        customerId,
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user.id,
        endpoint: '/api/dues/setup-intent',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      console.error('Error creating SetupIntent:', error);
      return NextResponse.json(
        { error: 'Failed to create setup intent' },
        { status: 500 }
      );
    }
});
