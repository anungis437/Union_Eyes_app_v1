import { NextRequest, NextResponse } from 'next';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { getBalance, listLedger } from '@/lib/services/rewards/wallet-service';

/**
 * Member Wallet API
 * 
 * GET /api/rewards/wallet
 * Returns the authenticated member's wallet balance and recent ledger entries.
 * 
 * Query Parameters:
 * - limit: Number of ledger entries to return (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * 
 * Security: Member-scoped (RLS enforced via get_current_user_id())
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
    const balance = await getBalance(db, userId, orgId);

    // 4. Get recent ledger entries
    const ledger = await listLedger(db, userId, orgId, {
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
}
