import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { arrearsCases, members } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';

// Escalate an arrears case to the next level
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
    const { reason } = body;

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

    // Define escalation stages
    const escalationStages = [
      { level: 0, name: 'No action', description: 'Initial state' },
      { level: 1, name: 'Reminder', description: 'Friendly reminder sent (7 days overdue)' },
      { level: 2, name: 'Warning', description: 'Formal warning sent (14 days overdue)' },
      { level: 3, name: 'Suspension', description: 'Member benefits suspended (30 days overdue)' },
      { level: 4, name: 'Legal', description: 'Legal action or collections (60+ days overdue)' },
    ];

    const currentLevel = parseInt(String(arrearsCase.escalationLevel || '0'), 10);
    const newLevel = Math.min(currentLevel + 1, 4);

    if (newLevel === currentLevel) {
      return NextResponse.json(
        { error: 'Case is already at maximum escalation level' },
        { status: 400 }
      );
    }

    // Parse existing escalation history
    let escalationHistory = [];
    try {
      if (arrearsCase.escalationHistory) {
        escalationHistory = typeof arrearsCase.escalationHistory === 'string'
          ? JSON.parse(arrearsCase.escalationHistory)
          : arrearsCase.escalationHistory;
      }
    } catch (parseError) {
      console.error('Error parsing escalation history:', parseError);
      escalationHistory = [];
    }

    // Create escalation record
    const escalationRecord = {
      id: crypto.randomUUID(),
      fromLevel: currentLevel,
      fromStage: escalationStages[currentLevel].name,
      toLevel: newLevel,
      toStage: escalationStages[newLevel].name,
      reason: reason || `Escalated to ${escalationStages[newLevel].name}`,
      escalatedAt: new Date().toISOString(),
      escalatedBy: userId,
      escalatedByName: currentMember.name,
    };

    escalationHistory.push(escalationRecord);

    // Prepare update data
    const updateData: any = {
      escalationLevel: newLevel,
      escalationHistory: JSON.stringify(escalationHistory),
      lastEscalationDate: new Date(),
      updatedAt: new Date(),
    };

    // Handle special actions at certain levels
    if (newLevel === 3) {
      // Suspension level - update member status
      await db
        .update(members)
        .set({
          status: 'suspended',
          metadata: JSON.stringify({
            ...(arrearsCase.metadata || {}),
            suspensionReason: 'Arrears escalation - benefits suspended',
            suspensionDate: new Date().toISOString(),
          }),
        })
        .where(eq(members.id, arrearsCase.memberId));
      
      updateData.notes = `Member suspended due to escalation. ${updateData.notes || ''}`;
    }

    if (newLevel === 4) {
      // Legal action level
      updateData.status = 'legal';
      updateData.notes = `Case escalated to legal action/collections. ${updateData.notes || ''}`;
    }

    // Update arrears case
    const [updatedCase] = await db
      .update(arrearsCases)
      .set(updateData)
      .where(eq(arrearsCases.id, arrearsCase.id))
      .returning();

    return NextResponse.json({
      message: `Case escalated to level ${newLevel}: ${escalationStages[newLevel].name}`,
      case: updatedCase,
      escalation: escalationRecord,
      stage: escalationStages[newLevel],
    });

  } catch (error) {
    console.error('Escalate case error:', error);
    return NextResponse.json(
      { error: 'Failed to escalate case' },
      { status: 500 }
    );
  }
}
