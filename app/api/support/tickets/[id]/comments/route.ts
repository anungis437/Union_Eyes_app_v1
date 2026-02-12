/**
 * Support Ticket Comments API Route
 * 
 * Handles ticket comment listing and creation.
 * Part of Phase 2 - App Operations Roles implementation.
 * 
 * Authentication: Minimum role level 250 (support_agent)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import {
  standardErrorResponse,
  standardSuccessResponse,
  ErrorCode,
} from '@/lib/api/standardized-responses';
import {
  getTicketById,
  getTicketComments,
  addComment,
} from '@/lib/services/support-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const addCommentSchema = z.object({
  comment: z.string().min(1, 'Comment cannot be empty').max(5000),
  isInternal: z.boolean().default(false),
  authorName: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

// ============================================================================
// GET /api/support/tickets/[id]/comments
// Get ticket comments
// ============================================================================

export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(250, async (request, context) => {
    const { userId } = context;

    try {
      const ticketId = params.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 100,
        window: 60,
        identifier: 'support-comments-read',
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

      // Fetch comments
      const comments = await getTicketComments(ticketId);

      // Audit log
      await logApiAuditEvent({
        action: 'support.comments.list',
        userId,
        resourceType: 'ticket_comment',
        severity: 'info',
        metadata: { ticketId, count: comments.length },
      });

      logger.info('Ticket comments retrieved', {
        userId,
        ticketId,
        count: comments.length,
      });

      return standardSuccessResponse({
        comments,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
        },
      });
    } catch (error) {
      logger.error('Error retrieving ticket comments', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to retrieve ticket comments'
      );
    }
  })(request, {});
};

// ============================================================================
// POST /api/support/tickets/[id]/comments
// Add comment to ticket
// ============================================================================

export const POST = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(250, async (request, context) => {
    const { userId } = context;

    try {
      const ticketId = params.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 30,
        window: 60,
        identifier: 'support-comments-create',
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
      const validation = addCommentSchema.safeParse(body);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid comment data',
          validation.error.errors
        );
      }

      const commentData = validation.data;

      // Add comment
      const comment = await addComment({
        ticketId,
        comment: commentData.comment,
        isInternal: commentData.isInternal,
        authorUserId: userId,
        authorName: commentData.authorName,
        metadata: commentData.metadata,
      });

      // Audit log
      await logApiAuditEvent({
        action: 'support.comment.added',
        userId,
        resourceType: 'ticket_comment',
        resourceId: comment.id,
        severity: 'info',
        metadata: {
          ticketId,
          ticketNumber: ticket.ticketNumber,
          isInternal: commentData.isInternal,
        },
      });

      logger.info('Comment added to ticket', {
        userId,
        ticketId,
        commentId: comment.id,
      });

      return standardSuccessResponse(
        { comment },
        { status: 201 }
      );
    } catch (error) {
      logger.error('Error adding ticket comment', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to add ticket comment'
      );
    }
  })(request, {});
};
