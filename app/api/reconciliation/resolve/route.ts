import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members, duesTransactions, employerRemittances } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';

// Resolve reconciliation discrepancies
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member to verify tenant
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await req.json();
    const { remittanceId, rowIndex, action, actionData } = body;

    // Validate required fields
    if (!remittanceId || rowIndex === undefined || !action) {
      return NextResponse.json(
        { error: 'remittanceId, rowIndex, and action are required' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['create_member', 'adjust_amount', 'mark_resolved', 'request_correction'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: create_member, adjust_amount, mark_resolved, or request_correction' },
        { status: 400 }
      );
    }

    // Get remittance record
    const [remittance] = await db
      .select()
      .from(employerRemittances)
      .where(
        and(
          eq(employerRemittances.id, remittanceId),
          eq(employerRemittances.tenantId, member.tenantId)
        )
      )
      .limit(1);

    if (!remittance) {
      return NextResponse.json({ error: 'Remittance not found' }, { status: 404 });
    }

    // Parse metadata to get results
    let metadata: Record<string, any> = (remittance.metadata as Record<string, any>) || {};
    if (typeof metadata === 'string') {
      metadata = JSON.parse(metadata);
    }

    const results = metadata.results || [];
    if (!results[rowIndex]) {
      return NextResponse.json({ error: 'Row index not found' }, { status: 404 });
    }

    const row = results[rowIndex];
    let actionResult = null;

    // Execute action
    switch (action) {
      case 'create_member':
        // Create new member from row data
        if (!actionData?.name) {
          return NextResponse.json(
            { error: 'name required for create_member action' },
            { status: 400 }
          );
        }

        const [newMember] = await db
          .insert(members)
          .values({
            tenantId: member.tenantId,
            organizationId: member.organizationId,
            userId: '', // Will be updated when user claims profile
            name: actionData.name,
            email: actionData.email || row.row.email || '',
            membershipNumber: row.row.memberNumber || null,
            status: 'active',
            unionJoinDate: new Date(),
            metadata: JSON.stringify({
              createdFrom: 'reconciliation',
              remittanceId,
              rowIndex,
              originalData: row.row,
            }),
          })
          .returning();

        actionResult = { action: 'create_member', member: newMember };
        row.matchStatus = 'manually_resolved';
        row.resolution = 'Member created';
        break;

      case 'adjust_amount':
        // Adjust transaction amount to match uploaded amount
        if (!row.transaction) {
          return NextResponse.json(
            { error: 'No transaction found to adjust' },
            { status: 400 }
          );
        }

        const newAmount = actionData?.newAmount || row.row.amount;
        const oldAmount = row.transaction.totalAmount;

        const [updatedTransaction] = await db
          .update(duesTransactions)
          .set({
            totalAmount: newAmount.toString(),
            metadata: JSON.stringify({
              ...((row.transaction.metadata as any) || {}),
              adjusted: true,
              adjustedFrom: oldAmount,
              adjustedTo: newAmount,
              adjustedBy: userId,
              adjustedAt: new Date().toISOString(),
              adjustmentReason: actionData?.reason || 'Reconciliation adjustment',
            }),
          })
          .where(eq(duesTransactions.id, row.transaction.id))
          .returning();

        actionResult = { action: 'adjust_amount', transaction: updatedTransaction, oldAmount, newAmount };
        row.matchStatus = 'manually_resolved';
        row.resolution = `Amount adjusted from ${oldAmount} to ${newAmount}`;
        break;

      case 'mark_resolved':
        // Mark row as manually resolved
        row.matchStatus = 'manually_resolved';
        row.resolution = actionData?.notes || 'Manually resolved';
        row.resolvedBy = userId;
        row.resolvedAt = new Date().toISOString();

        actionResult = { action: 'mark_resolved', notes: row.resolution };
        break;

      case 'request_correction':
        // Generate email to employer (placeholder - requires email service)
        row.matchStatus = 'correction_requested';
        row.correctionRequested = true;
        row.correctionRequestedAt = new Date().toISOString();
        row.correctionNotes = actionData?.notes || 'Correction requested from employer';

        actionResult = {
          action: 'request_correction',
          message: 'Email notification would be sent to employer',
          notes: row.correctionNotes,
          // TODO: Implement email service integration
        };
        break;
    }

    // Update remittance metadata with modified results
    results[rowIndex] = row;
    await db
      .update(employerRemittances)
      .set({
        metadata: { ...metadata, results },
        updatedAt: new Date(),
      })
      .where(eq(employerRemittances.id, remittanceId));

    return NextResponse.json({
      message: 'Resolution action completed',
      action: actionResult,
      updatedRow: row,
    });

  } catch (error) {
    console.error('Resolve reconciliation error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve reconciliation' },
      { status: 500 }
    );
  }
}
