import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authResult = await auth();
    
    console.log('[API /api/test-auth] Full auth result:', {
      userId: authResult.userId,
      sessionId: authResult.sessionId,
      orgId: authResult.orgId,
      hasSession: !!authResult.sessionId,
    });
    
    return NextResponse.json({
      success: true,
      userId: authResult.userId,
      sessionId: authResult.sessionId,
      hasSession: !!authResult.sessionId,
      message: authResult.userId ? 'Authenticated' : 'Not authenticated',
    });
  } catch (error) {
    console.error('[API /api/test-auth] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
