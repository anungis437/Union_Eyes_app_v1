import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { db } from '@/db';
import { arrearsCases, members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * Get detailed arrears case information
 */
export const GET = async (
  req: NextRequest,
  { params }: { params: { memberId: string } }
) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  // Get member to verify tenant
      const [currentMember] = await db
        .select()
        .from(members)
        .where(eq(members.userId, userId))
        .limit(1);

      if (!currentMember) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/arrears/case/[memberId]',
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'medium',
          details: { reason: 'Member not found' },
        });
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      try {
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
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/arrears/case/[memberId]',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'medium',
            details: { reason: 'Arrears case not found', memberId: params.memberId },
          });
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

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/arrears/case/[memberId]',
          method: 'GET',
          eventType: 'success',
          severity: 'medium',
          details: {
            dataType: 'FINANCIAL',
            memberId: params.memberId,
            caseStatus: result.case.status,
            unpaidCount: unpaidTransactions.length,
          },
        });

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
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/arrears/case/[memberId]',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error', memberId: params.memberId },
        });
        console.error('Get arrears case error:', error);
        return NextResponse.json(
          { error: 'Failed to get arrears case' },
          { status: 500 }
        );
      }
  })(req, { params });
};
