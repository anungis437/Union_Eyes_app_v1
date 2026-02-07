import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { duesTransactions, memberDuesAssignments, duesRules, members } from '@/services/financial-service/src/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

// Validation schema for query parameters
const balanceQuerySchema = z.object({
  userId: z.string().min(1, 'userId parameter is required'),
});

export const GET = withEnhancedRoleAuth(60, async (request, context) => {
  const parsed = balanceQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  }

  const query = parsed.data;
  const user = { id: context.userId, organizationId: context.organizationId };

  const orgId = (query as Record<string, unknown>)["organizationId"] ?? (query as Record<string, unknown>)["orgId"] ?? (query as Record<string, unknown>)["organization_id"] ?? (query as Record<string, unknown>)["org_id"] ?? (query as Record<string, unknown>)["tenantId"] ?? (query as Record<string, unknown>)["tenant_id"] ?? (query as Record<string, unknown>)["unionId"] ?? (query as Record<string, unknown>)["union_id"] ?? (query as Record<string, unknown>)["localId"] ?? (query as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

try {
      const requestedUserId = query.userId;

      // Get member record
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.userId, requestedUserId))
        .limit(1);

      if (!member) {
        // Return default values instead of 404 - member might not be in financial system yet
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: user.id,
          endpoint: '/api/dues/balance',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { reason: 'Member not in financial system', requestedUserId },
        });
        
        return NextResponse.json({
          currentBalance: 0,
          nextDueDate: null,
          nextDueAmount: 0,
          overdueAmount: 0,
          lastPaymentDate: null,
          lastPaymentAmount: 0,
          isInArrears: false,
          arrearsAmount: 0,
          membershipStatus: 'pending',
          autoPayEnabled: false,
          paymentMethodLast4: null,
        });
      }

      // Get active dues assignment
      const [assignment] = await db
        .select({
          assignment: memberDuesAssignments,
          rule: duesRules,
        })
        .from(memberDuesAssignments)
        .leftJoin(duesRules, eq(memberDuesAssignments.ruleId, duesRules.id))
        .where(
          and(
            eq(memberDuesAssignments.memberId, member.id),
            eq(memberDuesAssignments.isActive, true)
          )
        )
        .orderBy(desc(memberDuesAssignments.effectiveDate))
        .limit(1);

      if (!assignment) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: user.id,
          endpoint: '/api/dues/balance',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { reason: 'No active assignment', memberId: member.id },
        });
        
        return NextResponse.json({
          currentBalance: 0,
          nextDueDate: null,
          nextDueAmount: 0,
          overdueAmount: 0,
          lastPaymentDate: null,
          lastPaymentAmount: 0,
          isInArrears: false,
          arrearsAmount: 0,
          membershipStatus: 'good_standing',
          autoPayEnabled: false,
          paymentMethodLast4: null,
        });
      }

      // Calculate current balance (sum of unpaid transactions)
      const [balanceResult] = await db
        .select({
          totalOwed: sql<number>`COALESCE(SUM(CAST(${duesTransactions.totalAmount} AS DECIMAL)), 0)`,
          overdueAmount: sql<number>`COALESCE(SUM(CASE WHEN ${duesTransactions.dueDate} < CURRENT_DATE AND ${duesTransactions.status} = 'pending' THEN CAST(${duesTransactions.totalAmount} AS DECIMAL) ELSE 0 END), 0)`,
        })
        .from(duesTransactions)
        .where(
          and(
            eq(duesTransactions.memberId, member.id),
            eq(duesTransactions.status, 'pending')
          )
        );

      // Get next upcoming payment
      const [nextPayment] = await db
        .select()
        .from(duesTransactions)
        .where(
          and(
            eq(duesTransactions.memberId, member.id),
            eq(duesTransactions.status, 'pending'),
            sql`${duesTransactions.dueDate} >= CURRENT_DATE`
          )
        )
        .orderBy(duesTransactions.dueDate)
        .limit(1);

      // Get last completed payment
      const [lastPayment] = await db
        .select()
        .from(duesTransactions)
        .where(
          and(
            eq(duesTransactions.memberId, member.id),
            eq(duesTransactions.status, 'completed')
          )
        )
        .orderBy(desc(duesTransactions.paidDate))
        .limit(1);

      const currentBalance = parseFloat(balanceResult.totalOwed.toString());
      const overdueAmount = parseFloat(balanceResult.overdueAmount.toString());
      const isInArrears = overdueAmount > 0;

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user.id,
        endpoint: '/api/dues/balance',
        method: 'GET',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          requestedUserId,
          memberId: member.id,
          currentBalance,
          overdueAmount,
          isInArrears,
        },
      });

      return NextResponse.json({
        currentBalance,
        nextDueDate: nextPayment?.dueDate || null,
        nextDueAmount: nextPayment?.totalAmount ? parseFloat(nextPayment.totalAmount.toString()) : 0,
        overdueAmount,
        lastPaymentDate: lastPayment?.paidDate || null,
        lastPaymentAmount: lastPayment?.totalAmount ? parseFloat(lastPayment.totalAmount.toString()) : 0,
        isInArrears,
        arrearsAmount: overdueAmount,
        membershipStatus: isInArrears ? 'arrears' : 'good_standing',
        autoPayEnabled: false, // TODO: Implement autopay settings table
        paymentMethodLast4: null, // TODO: Get from Stripe customer
      });

    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user.id,
        endpoint: '/api/dues/balance',
        method: 'GET',
        eventType: 'error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      
      // Return default values instead of 500 to prevent UI crashes
      return NextResponse.json({
        currentBalance: 0,
        nextDueDate: null,
        nextDueAmount: 0,
        overdueAmount: 0,
        lastPaymentDate: null,
        lastPaymentAmount: 0,
        isInArrears: false,
        arrearsAmount: 0,
        membershipStatus: 'pending',
        autoPayEnabled: false,
        paymentMethodLast4: null,
        _error: 'Failed to fetch dues balance - financial system may not be initialized',
      });
    }
});
        )
      )
      .orderBy(duesTransactions.dueDate)
      .limit(1);

    // Get last completed payment
    const [lastPayment] = await db
      .select()
      .from(duesTransactions)
      .where(
        and(
          eq(duesTransactions.memberId, member.id),
          eq(duesTransactions.status, 'completed')
        )
      )
      .orderBy(desc(duesTransactions.paidDate))
      .limit(1);

    const currentBalance = parseFloat(balanceResult.totalOwed.toString());
    const overdueAmount = parseFloat(balanceResult.overdueAmount.toString());
    const isInArrears = overdueAmount > 0;

    return NextResponse.json({
      currentBalance,
      nextDueDate: nextPayment?.dueDate || null,
      nextDueAmount: nextPayment?.totalAmount ? parseFloat(nextPayment.totalAmount.toString()) : 0,
      overdueAmount,
      lastPaymentDate: lastPayment?.paidDate || null,
      lastPaymentAmount: lastPayment?.totalAmount ? parseFloat(lastPayment.totalAmount.toString()) : 0,
      isInArrears,
      arrearsAmount: overdueAmount,
      membershipStatus: isInArrears ? 'arrears' : 'good_standing',
      autoPayEnabled: false, // TODO: Implement autopay settings table
      paymentMethodLast4: null, // TODO: Get from Stripe customer
    });

  } catch (error) {
    console.error('Error fetching dues balance:', error);
    // Return default values instead of 500 to prevent UI crashes
    return NextResponse.json({
      currentBalance: 0,
      nextDueDate: null,
      nextDueAmount: 0,
      overdueAmount: 0,
      lastPaymentDate: null,
      lastPaymentAmount: 0,
      isInArrears: false,
      arrearsAmount: 0,
      membershipStatus: 'pending',
      autoPayEnabled: false,
      paymentMethodLast4: null,
      _error: 'Failed to fetch dues balance - financial system may not be initialized',
    });
  }
}
