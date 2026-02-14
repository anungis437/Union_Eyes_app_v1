/**
 * Newsletter Email Tracking - Link Click API
 * 
 * Endpoint:
 * - GET /api/communications/track/click - Track link clicks and redirect
 * 
 * Query Parameters:
 * - recipientId: Recipient ID
 * - url: Destination URL
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsletterEngagement } from '@/db/schema';
import { resolveIpGeolocation } from '@/lib/geo/ip-geolocation';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('recipientId');
    const campaignId = searchParams.get('campaignId');
    const url = searchParams.get('url');

    if (!recipientId || !campaignId || !url) {
      // Still redirect even on missing params
      if (url) {
        return NextResponse.redirect(url);
      }
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required parameters'
    );
    }

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
        campaignId,
        recipientId,
        eventType: 'click',
        eventData: {
          url,
          location,
          device: parseUserAgent(userAgent),
        },
        ipAddress: ip,
        userAgent,
      })
      .onConflictDoNothing();

    // Redirect to destination URL
    return NextResponse.redirect(url);
  } catch (error) {
// Still redirect even on error
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (url) {
      return NextResponse.redirect(url);
    }

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to track click',
      error
    );
  }
}

function parseUserAgent(ua: string): { type?: 'desktop' | 'mobile' | 'tablet'; browser?: string; os?: string } {
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

