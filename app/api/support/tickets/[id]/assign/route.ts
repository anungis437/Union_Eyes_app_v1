/**
 * Support Ticket Assignment API Route
 * 
 * Handles assigning tickets to support agents.
 * Part of Phase 2 - App Operations Roles implementation.
 * 
 * Authentication: Minimum role level 260 (support_manager)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { standardSuccessResponse,
} from '@/lib/api/standardized-responses';
import { getTicketById, assignTicket } from '@/lib/services/support-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const assignTicketSchema = z.object({
  assignedTo: z.string().uuid(),
  assignedByName: z.string().min(1),
  notes: z.string().optional(),
});

// ============================================================================
// POST /api/support/tickets/[id]/assign
// Assign ticket to agent
// ============================================================================

export const POST = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(260, async (request, context) => {
    const { userId } = context;

    try {
      const ticketId = params.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 50,
        window: 60,
        identifier: 'support-ticket-assign',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      // Validate ticket exists
      const ticket = await getTicketById(ticketId);
      if (!ticket) {
        return standardErrorResponse(
          ErrorCode.NOT_FOUND,
          'Support ticket not found'
        );
      }

      const body = await request.json();

      // Validate request body
      const validation = assignTicketSchema.safeParse(body);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid assignment data',
          validation.error.errors
        );
      }

      const { assignedTo, assignedByName, notes } = validation.data;

      // Assign ticket
      const updatedTicket = await assignTicket(
        ticketId,
        assignedTo,
        assignedByName,
        userId
      );

      // Audit log
      await logApiAuditEvent({
        action: 'support.ticket.assigned',
        userId,
        resourceType: 'support_ticket',
        resourceId: ticketId,
        oldValues: { assignedTo: ticket.assignedTo },
        newValues: { assignedTo },
        severity: 'info',
        metadata: {
          ticketNumber: ticket.ticketNumber,
          assignedBy: userId,
          notes,
        },
      });

      logger.info('Support ticket assigned', {
        userId,
        ticketId,
        assignedTo,
        ticketNumber: ticket.ticketNumber,
      });

      return standardSuccessResponse({ ticket: updatedTicket });
    } catch (error) {
      logger.error('Error assigning support ticket', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to assign support ticket'
      );
    }
  })(request, {});
};
