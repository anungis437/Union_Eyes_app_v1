import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { nlrbClrbFilings, organizingCampaigns } from '@/db/schema/organizing-tools-schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// Validation schema for NLRB filing submission
const NLRBFilingSchema = z.object({
  campaignId: z.string().uuid('Campaign ID must be a valid UUID'),
  filingType: z.enum(['nlrb_rc', 'nlrb_rm', 'clrb_certification']),
  jurisdiction: z.enum(['federal', 'provincial']),
  filedDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  bargainingUnitDescription: z.string().min(1, 'Bargaining unit description is required'),
  unitSizeClaimed: z.number().int().positive('Unit size must be a positive integer'),
  jobClassifications: z.array(z.string()).min(1, 'At least one job classification is required'),
  excludedPositions: z.array(z.string()).default([]),
  showingOfInterestPercentage: z.string().optional(),
  cardsSubmittedCount: z.number().int().nonnegative().optional(),
  cardSubmissionBatchIds: z.array(z.string().uuid()).default([]),
  electionType: z.enum(['mail', 'manual', 'electronic', 'mixed']).optional(),
  proposedElectionDate: z.string().optional(),
  employerName: z.string().min(1, 'Employer name is required'),
  employerAddress: z.string().min(1, 'Employer address is required'),
  employerRepresentation: z.string().optional(),
  employerContested: z.boolean().default(false),
  employerObjections: z.array(z.string()).default([]),
});

// POST /api/organizing/nlrb-filings - Submit NLRB filing
export const POST = async (req: NextRequest, { params }: { params?: Record<string, string> } = {}) => {
  return withEnhancedRoleAuth(40, async (req: NextRequest, context) => {
  const { userId, organizationId } = context;

  try {
    const body = await req.json();

    // Validate request body
    const validation = NLRBFilingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify campaign exists and belongs to organization
    const [campaign] = await db
      .select()
      .from(organizingCampaigns)
      .where(
        and(
          eq(organizingCampaigns.id, data.campaignId),
          eq(organizingCampaigns.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!campaign) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Campaign not found or does not belong to your organization'
    );
    }

    // Generate filing number (format: ORG-YEAR-NNNN)
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const filingNumber = `${organizationId.substring(0, 8).toUpperCase()}-${year}-${randomNum}`;

    // Create NLRB filing
    const [filing] = await db
      .insert(nlrbClrbFilings)
      .values({
        organizationId,
        campaignId: data.campaignId,
        filingType: data.filingType,
        filingNumber,
        jurisdiction: data.jurisdiction,
        filedDate: new Date(data.filedDate),
        filedBy: userId,
        bargainingUnitDescription: data.bargainingUnitDescription,
        unitSizeClaimed: data.unitSizeClaimed,
        unitJobClassifications: data.jobClassifications,
        excludedPositions: data.excludedPositions,
        showingOfInterestPercentage: data.showingOfInterestPercentage,
        cardsSubmittedCount: data.cardsSubmittedCount,
        cardSubmissionBatchIds: data.cardSubmissionBatchIds,
        electionType: data.electionType,
        electionScheduledDate: data.proposedElectionDate ? new Date(data.proposedElectionDate) : null,
        employerContested: data.employerContested,
        employerObjections: data.employerObjections,
        employerRepresentation: data.employerRepresentation,
        status: 'filed',
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return standardSuccessResponse(
      { 
        filing,
        message: 'NLRB filing submitted successfully',
       },
      undefined,
      201
    );
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to submit NLRB filing',
      error
    );
  }
  })(req, params || {});
};

// GET /api/organizing/nlrb-filings - List NLRB filings
export const GET = async () => {
  return withEnhancedRoleAuth(30, async (req: NextRequest, context) => {
    const { organizationId } = context;

  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where conditions
    const conditions = [eq(nlrbClrbFilings.organizationId, organizationId)];
    if (campaignId) conditions.push(eq(nlrbClrbFilings.campaignId, campaignId));
    if (status) conditions.push(eq(nlrbClrbFilings.status, status));

    // Fetch filings
    const filings = await db
      .select()
      .from(nlrbClrbFilings)
      .where(and(...conditions))
      .orderBy(nlrbClrbFilings.filedDate)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      filings,
      pagination: {
        limit,
        offset,
        count: filings.length,
      },
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch NLRB filings',
      error
    );
  }
  });
};
