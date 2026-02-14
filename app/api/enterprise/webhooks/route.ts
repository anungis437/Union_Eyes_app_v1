/**
 * Webhooks API
 * 
 * Manages outbound webhook subscriptions for real-time event notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { webhookSubscriptions, webhookDeliveries } from '@/db/schema/integration-schema';
import { and, desc } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schema for creating webhook subscription
const createWebhookSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  authType: z.enum(['bearer', 'basic', 'hmac', 'none']).default('bearer'),
  authSecret: z.string().optional(),
  customHeaders: z.record(z.string()).optional(),
  filters: z.record(z.any()).optional(),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/enterprise/webhooks
 * List webhook subscriptions
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    
    const conditions = [];
    
    if (organizationId) {
      conditions.push(eq(webhookSubscriptions.organizationId, organizationId));
    }
    
    const subscriptionsQuery = db
      .select()
      .from(webhookSubscriptions)
      .orderBy(desc(webhookSubscriptions.createdAt));
    
    if (conditions.length > 0) {
      subscriptionsQuery.where(and(...conditions));
    }
    
    const subscriptions = await subscriptionsQuery;
    
    // Redact sensitive information
    const sanitizedSubscriptions = subscriptions.map(sub => ({
      ...sub,
      authSecret: sub.authSecret ? '***REDACTED***' : null,
    }));
    
    return NextResponse.json({ subscriptions: sanitizedSubscriptions });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enterprise/webhooks
 * Create new webhook subscription
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const validatedData = createWebhookSchema.parse(body);
    
    // TODO: Extract from auth
    const createdBy = 'system';
    
    // Validate auth secret for bearer/hmac types
    if (['bearer', 'hmac'].includes(validatedData.authType) && !validatedData.authSecret) {
      return NextResponse.json(
        { error: `${validatedData.authType} auth requires authSecret` },
        { status: 400 }
      );
    }
    
    // Create webhook subscription
    const [subscription] = await db
      .insert(webhookSubscriptions)
      .values({
        ...validatedData,
        createdBy,
      })
      .returning();
    
    return NextResponse.json({
      message: 'Webhook subscription created successfully',
      subscription: {
        ...subscription,
        authSecret: subscription.authSecret ? '***REDACTED***' : null,
      },
    }, { status: 201 });
  } catch (error: Record<string, unknown>) {
    console.error('Error creating webhook:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create webhook', details: error.message },
      { status: 500 }
    );
  }
}
