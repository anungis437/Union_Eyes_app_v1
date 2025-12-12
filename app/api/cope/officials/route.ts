/**
 * API Route: Elected Officials
 * Track relationships with elected officials and government contacts
 * Phase 3: Political Action & Electoral
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cope/officials
 * List elected officials tracked by the organization
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
    const organizationId = searchParams.get('organizationId');
    const governmentLevel = searchParams.get('governmentLevel'); // federal, provincial_territorial, municipal
    const politicalParty = searchParams.get('politicalParty');
    const jurisdiction = searchParams.get('jurisdiction');
    const isCurrent = searchParams.get('isCurrent');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId is required' },
        { status: 400 }
      );
    }

    // Build query
    const conditions = [sql`organization_id = ${organizationId}`];

    if (governmentLevel) {
      conditions.push(sql`government_level = ${governmentLevel}`);
    }

    if (politicalParty) {
      conditions.push(sql`political_party = ${politicalParty}`);
    }

    if (jurisdiction) {
      conditions.push(sql`jurisdiction = ${jurisdiction}`);
    }

    if (isCurrent !== null && isCurrent !== undefined) {
      conditions.push(sql`is_current = ${isCurrent === 'true'}`);
    }

    const whereClause = sql.join(conditions, sql.raw(' AND '));

    const result = await db.execute(sql`
      SELECT 
        id,
        first_name,
        last_name,
        full_name,
        office_title,
        government_level,
        jurisdiction,
        electoral_district,
        political_party,
        party_caucus_role,
        constituency_office_phone,
        email,
        cabinet_position,
        labor_friendly_rating,
        previous_union_member,
        union_endorsed,
        total_meetings_held,
        responsive,
        is_current,
        created_at
      FROM elected_officials
      WHERE ${whereClause}
      ORDER BY government_level, jurisdiction, last_name
    `);

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
    });

  } catch (error) {
    logger.error('Failed to fetch elected officials', error as Error, {
      organizationId: request.nextUrl.searchParams.get('organizationId'),
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cope/officials
 * Add a new elected official to track
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
      organizationId,
      firstName,
      lastName,
      officeTitle,
      governmentLevel,
      jurisdiction,
      electoralDistrict,
      politicalParty,
      constituencyOfficePhone,
      email,
      cabinetPosition,
      laborFriendlyRating,
      previousUnionMember,
      unionEndorsed,
    } = body;

    // Validate required fields
    if (!organizationId || !firstName || !lastName || !governmentLevel) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId, firstName, lastName, and governmentLevel are required' },
        { status: 400 }
      );
    }

    // Generate full name
    const fullName = `${firstName} ${lastName}`;

    // Insert official
    const result = await db.execute(sql`
      INSERT INTO elected_officials (
        id,
        organization_id,
        first_name,
        last_name,
        full_name,
        office_title,
        government_level,
        jurisdiction,
        electoral_district,
        political_party,
        constituency_office_phone,
        email,
        cabinet_position,
        labor_friendly_rating,
        previous_union_member,
        union_endorsed,
        is_current,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${organizationId}, ${firstName}, ${lastName}, ${fullName},
        ${officeTitle || null}, ${governmentLevel}, ${jurisdiction || null},
        ${electoralDistrict || null}, ${politicalParty || null},
        ${constituencyOfficePhone || null}, ${email || null},
        ${cabinetPosition || null}, ${laborFriendlyRating || null},
        ${previousUnionMember !== undefined ? previousUnionMember : false},
        ${unionEndorsed !== undefined ? unionEndorsed : false},
        ${true},
        NOW(), NOW()
      )
      RETURNING *
    `);

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Elected official added successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to add elected official', error as Error, {
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cope/officials?id=<officialId>
 * Update elected official information
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const officialId = searchParams.get('id');

    if (!officialId) {
      return NextResponse.json(
        { error: 'Bad Request - id parameter is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      laborFriendlyRating,
      unionEndorsed,
      totalMeetingsHeld,
      lastContactDate,
      responsive,
      isCurrent,
      defeatDate,
      retirementDate,
    } = body;

    // Build update query
    const updates: any[] = [];

    if (laborFriendlyRating !== undefined) {
      updates.push(sql`labor_friendly_rating = ${laborFriendlyRating}`);
    }
    if (unionEndorsed !== undefined) {
      updates.push(sql`union_endorsed = ${unionEndorsed}`);
    }
    if (totalMeetingsHeld !== undefined) {
      updates.push(sql`total_meetings_held = ${totalMeetingsHeld}`);
    }
    if (lastContactDate !== undefined) {
      updates.push(sql`last_contact_date = ${lastContactDate}`);
    }
    if (responsive !== undefined) {
      updates.push(sql`responsive = ${responsive}`);
    }
    if (isCurrent !== undefined) {
      updates.push(sql`is_current = ${isCurrent}`);
    }
    if (defeatDate !== undefined) {
      updates.push(sql`defeat_date = ${defeatDate}`);
    }
    if (retirementDate !== undefined) {
      updates.push(sql`retirement_date = ${retirementDate}`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request - No fields to update' },
        { status: 400 }
      );
    }

    updates.push(sql`updated_at = NOW()`);
    const setClause = sql.join(updates, sql.raw(', '));

    const result = await db.execute(sql`
      UPDATE elected_officials
      SET ${setClause}
      WHERE id = ${officialId}
      RETURNING *
    `);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Not Found - Official not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Elected official updated successfully',
    });

  } catch (error) {
    logger.error('Failed to update elected official', error as Error, {
      officialId: request.nextUrl.searchParams.get('id'),
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
