import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { completeDeadline } from '@/db/queries/deadline-queries';
import { getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const completeDeadlineSchema = z.object({
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});
/**
 * POST /api/deadlines/[id]/complete
 * Mark a deadline as completed
 */
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

    const { id: userId } = user;

    const body = await request.json();
    
    // Validate request body
    const validation = completeDeadlineSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }

    const { notes } = validation.data;

    const result = await completeDeadline(
      params.id,
      userId,
      notes
    );

    if (!result) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Deadline not found or already completed'
    );
    }

    return NextResponse.json({
      success: true,
      deadline: result,
      message: 'Deadline marked as completed',
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to complete deadline',
      error
    );
  }
}
