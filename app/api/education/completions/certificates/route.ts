import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Course Certificates
 * Get certificate download information for a member
 * Phase 3: Education & Training
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const memberId = searchParams.get('memberId');

      if (!memberId) {
        return NextResponse.json(
          { error: 'Bad Request - memberId is required' },
          { status: 400 }
        );
      }

      const result = await db.execute(sql`
      SELECT 
        cr.certificate_number,
        cr.certificate_issue_date,
        cr.certificate_url,
        tc.course_name,
        tc.course_code,
        tc.certification_name,
        tc.certification_valid_years,
        m.first_name,
        m.last_name,
        m.member_number
      FROM course_registrations cr
      INNER JOIN training_courses tc ON cr.course_id = tc.id
      INNER JOIN members m ON cr.member_id = m.id
      WHERE cr.member_id = ${memberId}
        AND cr.certificate_issued = true
      ORDER BY cr.certificate_issue_date DESC
    `);

      // Calculate expiry dates
      const certificates = result.map((cert: any) => {
        const expiryDate = cert.certification_valid_years && cert.certificate_issue_date
          ? new Date(cert.certificate_issue_date)
          : null;
        
        if (expiryDate) {
          expiryDate.setFullYear(expiryDate.getFullYear() + cert.certification_valid_years);
        }

        return {
          ...cert,
          expiry_date: expiryDate?.toISOString().split('T')[0],
          is_expired: expiryDate ? new Date() > expiryDate : false,
        };
      });

      return NextResponse.json({
        success: true,
        data: certificates,
        count: certificates.length,
      });

    } catch (error) {
      logger.error('Failed to fetch certificates', error as Error, {
        memberId: request.nextUrl.searchParams.get('memberId'),
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
    })(request);
};
