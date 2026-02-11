/**
 * Newsletter Template Duplication API
 * 
 * Endpoint:
 * - POST /api/communications/templates/[id]/duplicate - Duplicate template
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsletterTemplates } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }
    const { id: userId, tenantId } = user;

    if (!tenantId) {
      return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Tenant context required'
    );
    }

    // Fetch original template
    const [original] = await db
      .select()
      .from(newsletterTemplates)
      .where(
        and(
          eq(newsletterTemplates.id, params.id),
          eq(newsletterTemplates.organizationId, tenantId)
        )
      );

    if (!original) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Template not found'
    );
    }

    // Create duplicate - note: subject/preheader are campaign-level fields, not template-level
    const [duplicate] = await db
      .insert(newsletterTemplates)
      .values({
        organizationId: tenantId,
        createdBy: userId,
        name: `${original.name} (Copy)`,
        description: original.description,
        category: original.category,
        htmlContent: original.htmlContent,
        jsonStructure: original.jsonStructure,
        variables: original.variables,
        thumbnailUrl: original.thumbnailUrl,
        isSystem: false, // Duplicates are never system templates
      })
      .returning();

    return standardSuccessResponse(
      {  template: duplicate  },
      undefined,
      201
    );
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to duplicate template',
      error
    );
  }
}
