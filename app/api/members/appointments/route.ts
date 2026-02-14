/**
 * Member Appointments API Route
 * POST /api/members/appointments - Create appointment request
 * GET /api/members/appointments - List member's appointments
 * 
 * Allows members to book appointments with union stewards/officers
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit } from "@/lib/rate-limiter";
import { standardErrorResponse, standardSuccessResponse, ErrorCode } from '@/lib/api/standardized-responses';

/**
 * Validation schema for creating an appointment
 */
const createAppointmentSchema = z.object({
  // Appointment details
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  appointmentType: z.enum(['consultation', 'grievance_review', 'contract_question', 'membership', 'other']),
  
  // Scheduling
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  preferredTimeSlot: z.enum(['morning', 'afternoon', 'evening', 'any']),
  
  // Optional: link to existing claim
  relatedClaimId: z.string().uuid().optional(),
  
  // Contact preference
  contactPreference: z.enum(['in_person', 'phone', 'video', 'any']).default('any'),
  phoneNumber: z.string().optional(),
});

/**
 * POST /api/members/appointments
 * Create a new appointment request
 */
export const POST = withRoleAuth('member', async (request: NextRequest, context) => {
  const { userId, organizationId } = context;

  // Check rate limit
  const rateLimitResult = await checkRateLimit(
    `member-appointments:${userId}`,
    { limit: 10, window: 3600, identifier: 'member-appointments' }
  );

  if (!rateLimitResult.allowed) {
    return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded. Please try again later.'
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body'
    );
  }

  const parsed = createAppointmentSchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      parsed.error
    );
  }

  const { 
    title, 
    description, 
    appointmentType, 
    requestedDate, 
    preferredTimeSlot,
    relatedClaimId,
    contactPreference,
    phoneNumber 
  } = parsed.data;

  try {
    // Generate appointment ID
    const appointmentId = crypto.randomUUID();
    
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/members/appointments',
      method: 'POST',
      eventType: 'success',
      severity: 'low',
      details: { appointmentType, requestedDate, appointmentId },
    });

    return standardSuccessResponse(
      {
        appointmentId,
        status: 'pending',
        message: 'Appointment request submitted. You will be notified when a steward confirms your appointment.',
        requestedDate,
        preferredTimeSlot,
      }
    );
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/members/appointments',
      method: 'POST',
      eventType: 'auth_failed',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create appointment request',
      error instanceof Error ? error : undefined
    );
  }
});

/**
 * GET /api/members/appointments
 * List member's appointments
 */
export const GET = withRoleAuth('member', async (request: NextRequest, context) => {
  const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, confirmed, cancelled, completed
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // In production, query appointments table filtered by memberId
    // For now, return empty array as placeholder
    const appointments: Record<string, unknown>[] = [];

    return NextResponse.json({
      success: true,
      data: appointments,
      pagination: {
        total: 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/members/appointments',
      method: 'GET',
      eventType: 'auth_failed',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch appointments',
      error instanceof Error ? error : undefined
    );
  }
});
