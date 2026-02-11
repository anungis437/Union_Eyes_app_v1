/**
 * API route to fetch user role
 * GET /api/auth/role
 */

import { NextResponse } from "next/server";
import { withSecureAPI, logApiAuditEvent } from "@/lib/middleware/api-security";
import { standardErrorResponse, ErrorCode } from '@/lib/api/standardized-responses';

/**
 * GET /api/auth/role
 * Fetch current user's role and permissions
 */
export const GET = withSecureAPI(async (request, user) => {
  const { id: userId, email } = user;

  try {
    // User is already authenticated via withSecureAPI wrapper
    logApiAuditEvent({
      timestamp: new Date().toISOString(), userId,
      endpoint: '/api/auth/role',
      method: 'GET',
      eventType: 'success',
      severity: 'low',
      details: { userEmail: email },
    });

    return NextResponse.json({ 
      userId,
      email,
      success: true 
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(), userId,
      endpoint: '/api/auth/role',
      method: 'GET',
      eventType: 'auth_failed',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
throw error;
  }
});


