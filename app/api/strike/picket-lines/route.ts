/**
 * API Route: Strike Picket Lines
 * Manage picket line locations and GPS tracking
 * Phase 3: Strike Administration
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/db';
import { logger } from '@/lib/logger';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

// Validation schema for GET query
const listPicketLinesSchema = z.object({
  fundId: z.string().uuid('Invalid fund ID format'),
});

// Validation schema for POST body
const createPicketLineSchema = z.object({
  strikeFundId: z.string().uuid('Invalid strike fund ID format'),
  locationName: z.string().min(1, 'Location name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional(),
  provinceState: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  geofenceRadiusMeters: z.number().positive().optional().default(50),
  shiftSchedule: z.record(z.any()).optional(),
});

/**
 * GET /api/strike/picket-lines
 * List picket lines for a strike fund
 */
export const GET = withEnhancedRoleAuth(60, async (request, context) => {
  try {
    const queryResult = listPicketLinesSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!queryResult.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request parameters'
    );
    }

    const { fundId } = queryResult.data;

      const result = await db.execute(sql`
        SELECT 
          pl.id,
          pl.strike_fund_id,
          pl.location_name,
          pl.address,
          pl.city,
          pl.province_state,
          pl.postal_code,
          ST_X(pl.gps_coordinates::geometry) as longitude,
          ST_Y(pl.gps_coordinates::geometry) as latitude,
          pl.geofence_radius_meters,
          pl.shift_schedule,
          pl.status,
          COUNT(DISTINCT pa.id) as total_attendance_records,
          COUNT(DISTINCT CASE WHEN pa.check_out_time IS NULL THEN pa.id END) as active_picketers_count,
          COALESCE(SUM(CASE 
            WHEN DATE(pa.check_in_time) = CURRENT_DATE 
            THEN EXTRACT(EPOCH FROM (COALESCE(pa.check_out_time, NOW()) - pa.check_in_time)) / 3600 
            ELSE 0 
          END), 0) as total_hours_today,
          pl.created_at
        FROM picket_lines pl
        LEFT JOIN picket_attendance pa ON pa.picket_line_id = pl.id
        WHERE pl.strike_fund_id = ${fundId}
        GROUP BY pl.id
        ORDER BY pl.location_name
      `);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: context.userId,
        endpoint: '/api/strike/picket-lines',
        method: 'GET',
        eventType: 'success',
        severity: 'medium',
        details: {
          fundId,
          picketLinesCount: result.length,
        },
      });

      return NextResponse.json({
        success: true,
        data: result,
        count: result.length,
      });

  } catch (error) {
    logger.error('Failed to fetch picket lines', error as Error, {
      userId: context.userId,
      correlationId: request.headers.get('x-correlation-id'),
    });

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      endpoint: '/api/strike/picket-lines',
      method: 'GET',
      eventType: 'error',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
  }
});

/**
 * POST /api/strike/picket-lines
 * Create a new picket line location
 */
export const POST = withEnhancedRoleAuth(90, async (request, context) => {
  try {
    const body = await request.json();
    const parsed = createPicketLineSchema.safeParse(body);

    if (!parsed.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body'
    );
    }

    const {
      strikeFundId,
      locationName,
      address,
      city,
      provinceState,
      postalCode,
      latitude,
      longitude,
      geofenceRadiusMeters,
      shiftSchedule,
    } = parsed.data;

      // Use parameterized query to prevent SQL injection
      const result = await db.execute(sql`
        INSERT INTO picket_lines (
          id,
          strike_fund_id,
          location_name,
          address,
          city,
          province_state,
          postal_code,
          gps_coordinates,
          geofence_radius_meters,
          shift_schedule,
          status,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${strikeFundId},
          ${locationName},
          ${address},
          ${city || null},
          ${provinceState || null},
          ${postalCode || null},
          ST_GeogFromText(${`POINT(${longitude} ${latitude})`}),
          ${geofenceRadiusMeters},
          ${JSON.stringify(shiftSchedule || {})},
          'active',
          NOW(),
          NOW()
        )
        RETURNING 
          id,
          strike_fund_id,
          location_name,
          address,
          city,
          province_state,
          postal_code,
          geofence_radius_meters,
          shift_schedule,
          status,
          created_at
      `);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: context.userId,
        endpoint: '/api/strike/picket-lines',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          strikeFundId,
          locationName,
          picketLineId: result[0]?.id,
        },
      });

      return standardSuccessResponse(
      { data: result[0],
        message: 'Picket line created successfully', },
      undefined,
      201
    );

  } catch (error) {
    logger.error('Failed to create picket line', error as Error, {
      userId: context.userId,
      correlationId: request.headers.get('x-correlation-id'),
    });

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      endpoint: '/api/strike/picket-lines',
      method: 'POST',
      eventType: 'error',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
  }
});

