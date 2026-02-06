import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { arrearsCases, members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';

// Resolve an arrears case
export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member to verify tenant
    const [currentMember] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!currentMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await req.json();
    const { resolutionType, resolutionNotes } = body;

    // Validate required fields
    if (!resolutionType) {
      return NextResponse.json(
        { error: 'resolutionType is required' },
        { status: 400 }
      );
    }

    // Validate resolution type
    const validResolutionTypes = ['paid_in_full', 'payment_plan_completed', 'written_off', 'disputed_resolved', 'other'];
    if (!validResolutionTypes.includes(resolutionType)) {
      return NextResponse.json(
        { error: 'Invalid resolution type' },
        { status: 400 }
      );
    }

    // Get arrears case
    const [arrearsCase] = await db
      .select()
      .from(arrearsCases)
      .where(
        and(
          eq(arrearsCases.id, params.caseId),
          eq(arrearsCases.tenantId, currentMember.tenantId)
        )
      )
      .limit(1);

    if (!arrearsCase) {
      return NextResponse.json({ error: 'Arrears case not found' }, { status: 404 });
    }

    // If resolution is payment_plan_completed, verify all installments are paid
    if (resolutionType === 'payment_plan_completed') {
      const unpaidInstallments = await db
        .select()
        .from(duesTransactions)
        .where(
          and(
            eq(duesTransactions.memberId, arrearsCase.memberId),
            eq(duesTransactions.tenantId, currentMember.tenantId),
            eq(duesTransactions.transactionType, 'payment_plan_installment'),
            eq(duesTransactions.status, 'pending')
          )
        );

      if (unpaidInstallments.length > 0) {
        return NextResponse.json(
          { error: `Cannot mark as completed: ${unpaidInstallments.length} installments still unpaid` },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      status: 'resolved',
      resolutionDate: new Date(),
      resolutionType,
      resolutionNotes: resolutionNotes || '',
      updatedAt: new Date(),
    };

    // Set remaining balance to 0 if paid in full
    if (resolutionType === 'paid_in_full' || resolutionType === 'payment_plan_completed') {
      updateData.remainingBalance = '0.00';
    }

    // Update arrears case
    const [updatedCase] = await db
      .update(arrearsCases)
      .set(updateData)
      .where(eq(arrearsCases.id, arrearsCase.id))
      .returning();

    // If member was suspended, restore to active status
    const [caseMember] = await db
      .select()
      .from(members)
      .where(eq(members.id, arrearsCase.memberId))
      .limit(1);

    if (caseMember && caseMember.status === 'suspended') {
      // Parse existing metadata safely
      let existingMetadata: Record<string, unknown> = {};
      if (caseMember.metadata) {
        try {
          existingMetadata = typeof caseMember.metadata === 'string' 
            ? JSON.parse(caseMember.metadata) 
            : (caseMember.metadata as Record<string, unknown>);
        } catch {
          existingMetadata = {};
        }
      }
      
      await db
        .update(members)
        .set({
          status: 'active',
          metadata: JSON.stringify({
            ...existingMetadata,
            restoredFromSuspension: true,
            restoredDate: new Date().toISOString(),
            restoredReason: `Arrears case resolved: ${resolutionType}`,
          }),
        })
        .where(eq(members.id, arrearsCase.memberId));
    }

    return NextResponse.json({
      message: 'Arrears case resolved successfully',
      case: updatedCase,
      memberRestored: caseMember?.status === 'suspended',
    });

  } catch (error) {
    console.error('Resolve case error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve case' },
      { status: 500 }
    );
  }
}
