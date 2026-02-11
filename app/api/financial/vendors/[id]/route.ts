import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/services/financial-service/src/db';
import { vendors } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const updateVendorSchema = z.object({
  vendorName: z.string().min(1).max(255).optional(),
  legalName: z.string().max(255).optional(),
  vendorType: z.string().max(100).optional(),
  taxId: z.string().max(50).optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  address: z.any().optional(),
  billingAddress: z.any().optional(),
  primaryContactName: z.string().max(255).optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().max(50).optional(),
  paymentTerms: z.enum(['net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'due_on_receipt', 'cod']).optional(),
  defaultAccountCode: z.string().max(50).optional(),
  currency: z.string().length(3).optional(),
  creditLimit: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'archived']).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/financial/vendors/[id]
 * Get vendor details
 */
export const GET = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const userLevel = (user as any).roleLevel || 0;
    if (userLevel < 85) {
      return standardErrorResponse(ErrorCode.FORBIDDEN, 'Requires Financial Officer role (level 85+)');
    }

    const { organizationId } = context as any;
    const { params } = context as any;
    const vendorId = params.id;

    const [vendor] = await db
      .select()
      .from(vendors)
      .where(and(
        eq(vendors.id, vendorId),
        eq(vendors.organizationId, organizationId)
      ));

    if (!vendor) {
      return standardErrorResponse(ErrorCode.RESOURCE_NOT_FOUND, 'Vendor not found');
    }

    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: user.id,
      endpoint: `/api/financial/vendors/${vendorId}`,
      method: 'GET',
      eventType: 'read',
      severity: 'low',
      details: { vendorId },
    });

    return standardSuccessResponse({
      vendor,
    });

  } catch (error) {
    console.error('Error fetching vendor:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch vendor',
      error
    );
  }
});

/**
 * PATCH /api/financial/vendors/[id]
 * Update vendor
 */
export const PATCH = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const userLevel = (user as any).roleLevel || 0;
    if (userLevel < 85) {
      return standardErrorResponse(ErrorCode.FORBIDDEN, 'Requires Financial Officer role (level 85+)');
    }

    const { organizationId } = context as any;
    const { params } = context as any;
    const vendorId = params.id;

    const body = await request.json();
    const parsed = updateVendorSchema.safeParse(body);
    
    if (!parsed.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error
      );
    }

    const data = parsed.data;

    // Verify vendor exists
    const [existingVendor] = await db
      .select()
      .from(vendors)
      .where(and(
        eq(vendors.id, vendorId),
        eq(vendors.organizationId, organizationId)
      ));

    if (!existingVendor) {
      return standardErrorResponse(ErrorCode.RESOURCE_NOT_FOUND, 'Vendor not found');
    }

    // Update vendor
    const [updatedVendor] = await db
      .update(vendors)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(vendors.id, vendorId))
      .returning();

    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: user.id,
      endpoint: `/api/financial/vendors/${vendorId}`,
      method: 'PATCH',
      eventType: 'update',
      severity: 'medium',
      details: { vendorId, updates: data },
    });

    return standardSuccessResponse({
      vendor: updatedVendor,
      message: 'Vendor updated successfully',
    });

  } catch (error: any) {
    if (error?.message?.includes('unique_vendor_name')) {
      return standardErrorResponse(
        ErrorCode.DUPLICATE_ENTRY,
        'A vendor with this name already exists'
      );
    }
    console.error('Error updating vendor:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update vendor',
      error
    );
  }
});
