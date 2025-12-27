import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members, autopaySettings, paymentMethods } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET: Get AutoPay settings for member
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get AutoPay settings
    const [settings] = await db
      .select()
      .from(autopaySettings)
      .where(eq(autopaySettings.memberId, member.id))
      .limit(1);

    return NextResponse.json({
      enabled: settings?.enabled || false,
      paymentMethodId: settings?.paymentMethodId,
      lastChargeDate: settings?.lastChargeDate,
      lastChargeAmount: settings?.lastChargeAmount,
      lastChargeStatus: settings?.lastChargeStatus,
      failureCount: settings?.failureCount || 0,
    });
  } catch (error) {
    console.error('Error fetching AutoPay settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AutoPay settings' },
      { status: 500 }
    );
  }
}

/**
 * POST: Enable or disable AutoPay
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid "enabled" field' },
        { status: 400 }
      );
    }

    // Find member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (enabled) {
      // Check if member has default payment method
      const [defaultMethod] = await db
        .select()
        .from(paymentMethods)
        .where(
          and(
            eq(paymentMethods.memberId, member.id),
            eq(paymentMethods.isDefault, true),
            eq(paymentMethods.isActive, true)
          )
        )
        .limit(1);

      if (!defaultMethod) {
        return NextResponse.json(
          { error: 'No default payment method found. Please add a payment method and set it as default.' },
          { status: 400 }
        );
      }

      // Enable AutoPay (upsert)
      const [existingSettings] = await db
        .select()
        .from(autopaySettings)
        .where(eq(autopaySettings.memberId, member.id))
        .limit(1);

      if (existingSettings) {
        await db
          .update(autopaySettings)
          .set({
            enabled: true,
            paymentMethodId: defaultMethod.stripePaymentMethodId,
            updatedAt: new Date(),
          })
          .where(eq(autopaySettings.memberId, member.id));
      } else {
        await db.insert(autopaySettings).values({
          tenantId: member.tenantId,
          memberId: member.id,
          enabled: true,
          paymentMethodId: defaultMethod.stripePaymentMethodId,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'AutoPay enabled',
        enabled: true,
      });
    } else {
      // Disable AutoPay
      await db
        .update(autopaySettings)
        .set({
          enabled: false,
          updatedAt: new Date(),
        })
        .where(eq(autopaySettings.memberId, member.id));

      return NextResponse.json({
        success: true,
        message: 'AutoPay disabled',
        enabled: false,
      });
    }
  } catch (error) {
    console.error('Error updating AutoPay settings:', error);
    return NextResponse.json(
      { error: 'Failed to update AutoPay settings' },
      { status: 500 }
    );
  }
}
