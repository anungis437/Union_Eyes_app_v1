/**
 * API Route: Strike Picket Lines
 * Manage picket line locations and GPS tracking
 * Phase 3: Strike Administration
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/strike/picket-lines
 * List picket lines for a strike fund
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get('fundId');

    if (!fundId) {
      return NextResponse.json(
        { error: 'Bad Request - fundId is required' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
    });

  } catch (error) {
    logger.error('Failed to fetch picket lines', error as Error, {
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/strike/picket-lines
 * Create a new picket line location
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
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
    } = body;

    if (!strikeFundId || !locationName || !address || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Bad Request - strikeFundId, locationName, address, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    const result = await db.execute(sql.raw(`
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
        '${strikeFundId}', '${locationName}', '${address}',
        '${city}', '${provinceState}', '${postalCode}',
        ST_GeogFromText('POINT(${longitude} ${latitude})'),
        ${geofenceRadiusMeters || 50}, '${JSON.stringify(shiftSchedule)}', 'active',
        NOW(), NOW()
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
    `));

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Picket line created successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create picket line', error as Error, {
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
