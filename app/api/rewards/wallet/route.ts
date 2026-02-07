import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next';
import { db } from '@/db';
import { getBalance, listLedger } from '@/lib/services/rewards/wallet-service';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";
import { NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // 1. Authenticate
      const { user.id, orgId } = await auth();
      
      if (!orgId) {
        return NextResponse.json(
          { error: 'Organization context required' },
          { status: 400 }
        );
      }

      // 2. Parse query parameters
      const { searchParams } = new URL(request.url);
      const limit = Math.min(
        parseInt(searchParams.get('limit') || '20', 10),
        100
      );
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      // 3. Get wallet balance
      const balance = await getBalance(db, user.id, orgId);

      // 4. Get recent ledger entries
      const ledger = await listLedger(db, user.id, orgId, {
        limit,
        offset,
      });

      // 5. Return response
      return NextResponse.json(
        {
          balance,
          ledger: {
            entries: ledger,
            pagination: {
              limit,
              offset,
              hasMore: ledger.length === limit,
            },
          },
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('[Wallet API] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
  })(request);
};
