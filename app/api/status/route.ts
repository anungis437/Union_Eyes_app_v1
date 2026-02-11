/**
 * System Status API Endpoint
 * 
 * GET /api/status - Returns comprehensive system status
 */

import { NextResponse } from 'next/server';
import { getSystemStatus } from '@/lib/monitoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get system status
 */
export async function GET() {
  try {
    const status = await getSystemStatus();
    
    // Return 503 if system is down
    const statusCode = status.status === 'down' ? 503 : 200;
    
    return NextResponse.json(status, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'down',
        services: [],
        uptime: process.uptime(),
        version: process.env.APP_VERSION || '1.0.0',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

