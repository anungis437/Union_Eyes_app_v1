import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const GET = async () => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const financialServiceUrl = process.env.FINANCIAL_SERVICE_URL;
      if (!financialServiceUrl) {
        return NextResponse.json(
          { error: 'Financial service URL not configured' },
          { status: 500 }
        );
      }
      
      // Fetch member's current dues balance from financial-service
      const response = await fetch(`${financialServiceUrl}/api/dues/transactions?memberId=${userId}&status=pending`, {
        headers: {
          'Authorization': `Bearer ${process.env.FINANCIAL_SERVICE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch dues balance' }, { status: response.status });
      }

      const data = await response.json();
      
      // Calculate totals from pending transactions
      const balance = {
        totalOwed: data.transactions?.reduce((sum: number, t: any) => sum + t.totalAmount, 0) || 0,
        duesAmount: data.transactions?.reduce((sum: number, t: any) => sum + t.duesAmount, 0) || 0,
        copeAmount: data.transactions?.reduce((sum: number, t: any) => sum + t.copeAmount, 0) || 0,
        pacAmount: data.transactions?.reduce((sum: number, t: any) => sum + t.pacAmount, 0) || 0,
        strikeFundAmount: data.transactions?.reduce((sum: number, t: any) => sum + t.strikeFundAmount, 0) || 0,
        lateFees: data.transactions?.reduce((sum: number, t: any) => sum + t.lateFeeAmount, 0) || 0,
        nextDueDate: data.transactions?.[0]?.dueDate || null,
      };

      // Fetch payment history (last 12 months)
      const historyResponse = await fetch(`${financialServiceUrl}/api/dues/transactions?memberId=${userId}&limit=12`, {
        headers: {
          'Authorization': `Bearer ${process.env.FINANCIAL_SERVICE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const historyData = await historyResponse.json();

      return NextResponse.json({
        balance,
        transactions: historyData.transactions || [],
      });
    } catch (error) {
      logger.error('Failed to fetch dues balance', error as Error, {
        userId: userId,
  });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  })(request);
};

