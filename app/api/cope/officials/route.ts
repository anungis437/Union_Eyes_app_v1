import { withRLSContext } from '@/lib/db/with-rls-context';
import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Elected Officials
 * Track relationships with elected officials and government contacts
 * Phase 3: Political Action & Electoral
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
      const governmentLevel = searchParams.get('governmentLevel'); // federal, provincial_territorial, municipal
      const politicalParty = searchParams.get('politicalParty');
      const jurisdiction = searchParams.get('jurisdiction');
      const isCurrent = searchParams.get('isCurrent');

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId is required'
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

      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
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
    });

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
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};


const copeOfficialsSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  firstName: z.string().min(1, 'firstName is required'),
  lastName: z.string().min(1, 'lastName is required'),
  officeTitle: z.string().min(1, 'officeTitle is required'),
  governmentLevel: z.unknown().optional(),
  jurisdiction: z.boolean().optional(),
  electoralDistrict: z.boolean().optional(),
  politicalParty: z.unknown().optional(),
  constituencyOfficePhone: z.string().min(10, 'Invalid phone number'),
  email: z.string().email('Invalid email address'),
  cabinetPosition: z.unknown().optional(),
  laborFriendlyRating: z.unknown().optional(),
  previousUnionMember: z.unknown().optional(),
  unionEndorsed: z.unknown().optional(),
  totalMeetingsHeld: z.unknown().optional(),
  lastContactDate: z.string().datetime().optional(),
  responsive: z.unknown().optional(),
  isCurrent: z.boolean().optional(),
  defeatDate: z.string().datetime().optional(),
  retirementDate: z.string().datetime().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
    // Validate request body
    const validation = copeOfficialsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
      // DUPLICATE REMOVED:     const { organizationId, firstName, lastName, officeTitle, governmentLevel, jurisdiction, electoralDistrict, politicalParty, constituencyOfficePhone, email, cabinetPosition, laborFriendlyRating, previousUnionMember, unionEndorsed, totalMeetingsHeld, lastContactDate, responsive, isCurrent, defeatDate, retirementDate } = validation.data;
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
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      // Validate required fields
      if (!organizationId || !firstName || !lastName || !governmentLevel) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId, firstName, lastName, and governmentLevel are required'
    );
      }

      // Generate full name
      const fullName = `${firstName} ${lastName}`;

      // Insert official
      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
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
    });

      return standardSuccessResponse(
      { data: result[0],
        message: 'Elected official added successfully', },
      undefined,
      201
    );

    } catch (error) {
      logger.error('Failed to add elected official', error as Error, {
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};

export const PATCH = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const officialId = searchParams.get('id');

      if (!officialId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - id parameter is required'
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
      const updates: Array<Record<string, unknown>> = [];

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

      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      UPDATE elected_officials
      SET ${setClause}
      WHERE id = ${officialId}
      RETURNING *
    `);
    });

      if (result.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found - Official not found'
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
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};

