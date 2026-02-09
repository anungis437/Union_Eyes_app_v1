import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: CRA XML Export
 * Download tax slip data in CRA XML format for electronic filing
 * Phase 2: CRA Tax Compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withRoleAuth('steward', async (request, context) => {
    const { userId, organizationId: contextOrganizationId } = context;

  try {
      // Rate limiting: 10 tax operations per hour per user
      const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.TAX_OPERATIONS);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Too many tax requests.',
            resetIn: rateLimitResult.resetIn 
          },
          { 
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
  if (organizationId && organizationId !== contextOrganizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

      const taxYear = parseInt(searchParams.get('taxYear') || new Date().getFullYear().toString());
      const slipType = searchParams.get('slipType') || 't4a'; // 't4a' | 't4' | 't5007'
      const download = searchParams.get('download') === 'true';

      if (!organizationId) {
        return NextResponse.json(
          { error: 'Bad Request - organizationId is required' },
          { status: 400 }
        );
      }

      // Call database function to generate CRA XML
      const result = await db.execute(
        sql`SELECT export_cra_xml(
        ${organizationId}::uuid, 
        ${taxYear}::integer, 
        ${slipType}::text
      ) as xml_content`
      );

      const xmlContent = (result[0] as any).xml_content;

      if (!xmlContent) {
        return NextResponse.json(
          { error: 'No Data - No tax data found for specified parameters' },
          { status: 404 }
        );
      }

      // If download requested, return as file attachment
      if (download) {
        const filename = `CRA_${slipType.toUpperCase()}_${taxYear}_${organizationId.slice(0, 8)}.xml`;
        
        return new NextResponse(xmlContent, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store',
          },
        });
      }

      // Return JSON with XML content
      return NextResponse.json({
        success: true,
        data: {
          organizationId,
          taxYear,
          slipType,
          xmlContent,
          generatedAt: new Date().toISOString(),
          filename: `CRA_${slipType.toUpperCase()}_${taxYear}_${organizationId.slice(0, 8)}.xml`,
        },
        message: 'CRA XML generated successfully',
      });

    } catch (error) {
      logger.error('Failed to export CRA XML', error as Error, {
        userId: userId,
        organizationId: request.nextUrl.searchParams.get('organizationId'),
        taxYear: request.nextUrl.searchParams.get('taxYear'),
        correlationId: request.headers.get('x-correlation-id'),
  });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  })(request);
};

export const POST = async (request: NextRequest) => {
  return withRoleAuth('steward', async (request, context) => {
    const { userId } = context;

  try {
      const body = await request.json();
      const { organizationIds, taxYear, slipType = 't4a' } = body;

      if (!organizationIds || !Array.isArray(organizationIds) || organizationIds.length === 0) {
        return NextResponse.json(
          { error: 'Bad Request - organizationIds array is required' },
          { status: 400 }
        );
      }

      if (!taxYear) {
        return NextResponse.json(
          { error: 'Bad Request - taxYear is required' },
          { status: 400 }
        );
      }

      // Generate XML for each organization
      const results = await Promise.allSettled(
        organizationIds.map(async (orgId: string) => {
          const result = await db.execute(
            sql`SELECT export_cra_xml(
            ${orgId}::uuid, 
            ${taxYear}::integer, 
            ${slipType}::text
          ) as xml_content`
          );
          return {
            organizationId: orgId,
            xmlContent: (result[0] as any).xml_content,
          };
        })
      );

      // Separate successful and failed exports
      const successful = results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<any>).value);

      const failed = results
        .filter((r) => r.status === 'rejected')
        .map((r, idx) => ({
          organizationId: organizationIds[idx],
          error: (r as PromiseRejectedResult).reason,
        }));

      return NextResponse.json({
        success: true,
        data: {
          taxYear,
          slipType,
          totalRequested: organizationIds.length,
          successCount: successful.length,
          failedCount: failed.length,
          successful,
          failed: failed.length > 0 ? failed : undefined,
          generatedAt: new Date().toISOString(),
        },
        message: `Batch export completed: ${successful.length} successful, ${failed.length} failed`,
      });

    } catch (error) {
      logger.error('Failed to batch export CRA XML', error as Error, {
        userId: userId,
        correlationId: request.headers.get('x-correlation-id'),
  });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  })(request);
};
