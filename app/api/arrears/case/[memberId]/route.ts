import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { arrearsCases, members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// Get detailed arrears case information
export async function GET(
  req: NextRequest,
  { params }: { params: { memberId: string } }
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

    // Get arrears case with member details
    const [result] = await db
      .select({
        case: arrearsCases,
        member: {
          id: members.id,
          name: members.name,
          email: members.email,
          phone: members.phone,
          status: members.status,
          department: members.department,
          position: members.position,
          membershipNumber: members.membershipNumber,
          unionJoinDate: members.unionJoinDate,
        },
      })
      .from(arrearsCases)
      .innerJoin(members, eq(arrearsCases.memberId, members.id))
      .where(
        and(
          eq(arrearsCases.memberId, params.memberId),
          eq(arrearsCases.tenantId, currentMember.tenantId)
        )
      )
      .limit(1);

    if (!result) {
      return NextResponse.json({ error: 'Arrears case not found' }, { status: 404 });
    }

    // Get unpaid transactions
    const unpaidTransactions = await db
      .select()
      .from(duesTransactions)
      .where(
        and(
          eq(duesTransactions.memberId, params.memberId),
          eq(duesTransactions.tenantId, currentMember.tenantId),
          eq(duesTransactions.status, 'pending')
        )
      )
      .orderBy(desc(duesTransactions.dueDate));

    // Parse JSON fields with error handling
    let contactHistory = [];
    let escalationHistory = [];
    let paymentSchedule = [];

    try {
      if (result.case.contactHistory) {
        contactHistory = typeof result.case.contactHistory === 'string' 
          ? JSON.parse(result.case.contactHistory) 
          : result.case.contactHistory;
      }
      if (result.case.escalationHistory) {
        escalationHistory = typeof result.case.escalationHistory === 'string'
          ? JSON.parse(result.case.escalationHistory)
          : result.case.escalationHistory;
      }
      if (result.case.paymentSchedule) {
        paymentSchedule = typeof result.case.paymentSchedule === 'string'
          ? JSON.parse(result.case.paymentSchedule)
          : result.case.paymentSchedule;
      }
    } catch (parseError) {
      console.error('Error parsing JSON fields:', parseError);
    }

    // Calculate payment plan progress if active
    let paymentPlanProgress = null;
    if (result.case.paymentPlanActive && paymentSchedule.length > 0) {
      const paidInstallments = paymentSchedule.filter((s: any) => s.status === 'paid').length;
      const totalInstallments = paymentSchedule.length;
      const remainingInstallments = totalInstallments - paidInstallments;
      
      paymentPlanProgress = {
        paidInstallments,
        totalInstallments,
        remainingInstallments,
        nextPaymentDue: paymentSchedule.find((s: any) => s.status === 'pending')?.dueDate || null,
      };
    }

    return NextResponse.json({
      case: result.case,
      member: result.member,
      unpaidTransactions,
      contactHistory,
      escalationHistory,
      paymentSchedule,
      paymentPlanProgress,
    });

  } catch (error) {
    console.error('Get arrears case error:', error);
    return NextResponse.json(
      { error: 'Failed to get arrears case' },
      { status: 500 }
    );
  }
}
