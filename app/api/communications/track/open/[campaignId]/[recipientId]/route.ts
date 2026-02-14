/**
 * Newsletter Email Tracking - Open Pixel API
 * 
 * Endpoint:
 * - GET /api/communications/track/open/[campaignId]/[recipientId] - Track email opens
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsletterEngagement, newsletterRecipients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { resolveIpGeolocation } from '@/lib/geo/ip-geolocation';
import { ErrorCode } from '@/lib/api/standardized-responses';

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string; recipientId: string } }
) {
  try {
    // Get user agent and IP
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';

    const location = await resolveIpGeolocation(ip);

    // Record engagement event
    await db
      .insert(newsletterEngagement)
      .values({
        campaignId: params.campaignId,
        recipientId: params.recipientId,
        eventType: 'open',
        occurredAt: new Date(),
        eventData: {
          location,
          device: parseUserAgent(userAgent),
        },
        ipAddress: ip,
        userAgent,
      })
      .onConflictDoNothing();

    // Return tracking pixel
    return new NextResponse(TRACKING_PIXEL, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
// Still return pixel even on error
    return new NextResponse(TRACKING_PIXEL, {
      headers: {
        'Content-Type': 'image/gif',
      },
    });
  }
}

function parseUserAgent(ua: string): { type?: 'desktop' | 'mobile' | 'tablet'; browser?: string; os?: string } {
  // Simple user agent parsing
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';

  let browser = 'unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  let os = 'unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { type: deviceType, browser, os };
}
