/**
 * Role Assignment API Endpoint
 * POST /api/members/[memberId]/roles
 * 
 * Assigns or updates roles for organization members with validation and audit logging.
 * Supports the complete RBAC hierarchy including executive officers and specialized reps.
 * 
 * Phase 2: Role Assignment Migration
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organizationMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withApiAuth } from '@/lib/api-auth-guard';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const RoleAssignmentSchema = z.object({
  roleCode: z.enum([
    'admin',
    'president',
    'vice_president',
    'secretary_treasurer',
    'chief_steward',
    'officer',
    'steward',
    'bargaining_committee',
    'health_safety_rep',
    'member',
  ]),
  scopeType: z.enum(['global', 'department', 'location', 'shift', 'chapter']).default('global'),
  scopeValue: z.string().optional(),
  assignmentType: z.enum(['elected', 'appointed', 'acting', 'emergency']).default('appointed'),
  startDate: z.string().optional(), // ISO date string
  termYears: z.number().int().positive().optional(),
  electionDate: z.string().optional(), // ISO date string
  voteCount: z.number().int().nonnegative().optional(),
  totalVotes: z.number().int().positive().optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  
  // Acting role fields
  isActingRole: z.boolean().default(false),
  actingForMemberId: z.string().uuid().optional(),
  actingReason: z.string().optional(),
  actingStartDate: z.string().optional(),
  actingEndDate: z.string().optional(),
});

type RoleAssignment = z.infer<typeof RoleAssignmentSchema>;

// ============================================================================
// ROLE LEVEL VALIDATION
// ============================================================================

const ROLE_LEVELS: Record<string, number> = {
  admin: 100,
  president: 90,
  vice_president: 85,
  secretary_treasurer: 85,
  chief_steward: 70,
  officer: 60,
  steward: 50,
  bargaining_committee: 40,
  health_safety_rep: 30,
  member: 10,
};

/**
 * Check if user has authority to assign the requested role
 */
function canAssignRole(assignerRole: string, targetRole: string): boolean {
  const assignerLevel = ROLE_LEVELS[assignerRole] || 0;
  const targetLevel = ROLE_LEVELS[targetRole] || 0;
  
  // Admin can assign any role
  if (assignerRole === 'admin') return true;
  
  // President can assign roles up to officer level
  if (assignerRole === 'president' && targetLevel <= 60) return true;
  
  // Chief steward can assign steward and member roles
  if (assignerRole === 'chief_steward' && ['steward', 'member'].includes(targetRole)) {
    return true;
  }
  
  // Officer can only assign member role
  if (assignerRole === 'officer' && targetRole === 'member') return true;
  
  return false;
}

// ============================================================================
// HANDLER
// ============================================================================

async function assignRoleHandler(
  request: NextRequest,
  context: { params: { memberId: string }; userId: string; role: string; tenantId: string }
) {
  const { memberId } = context.params;
  const { userId, role: assignerRole, tenantId } = context;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = RoleAssignmentSchema.parse(body);
    
    // Authorization check
    if (!canAssignRole(assignerRole, validatedData.roleCode)) {
      logger.warn('Role assignment denied - Insufficient authority', {
        assignerId: userId,
        assignerRole,
        targetMemberId: memberId,
        requestedRole: validatedData.roleCode,
      });
      
      return NextResponse.json(
        {
          error: 'Insufficient authority to assign this role',
          details: `Your role (${assignerRole}) cannot assign ${validatedData.roleCode}`,
          required: 'At least officer role to assign member, president for executive roles',
        },
        { status: 403 }
      );
    }
    
    // Fetch target member
    const [targetMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.tenantId, tenantId)
        )
      )
      .limit(1);
    
    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found in this organization' },
        { status: 404 }
      );
    }
    
    if (targetMember.status !== 'active') {
      return NextResponse.json(
        {
          error: 'Cannot assign role to inactive member',
          memberStatus: targetMember.status,
        },
        { status: 400 }
      );
    }
    
    // Validation: Acting role requires actingForMemberId
    if (validatedData.isActingRole && !validatedData.actingForMemberId) {
      return NextResponse.json(
        { error: 'Acting role requires actingForMemberId' },
        { status: 400 }
      );
    }
    
    // Validation: Elected roles should have election date
    if (validatedData.assignmentType === 'elected' && !validatedData.electionDate) {
      logger.warn('Elected role without election date', {
        memberId,
        roleCode: validatedData.roleCode,
      });
    }
    
    // Validation: Scope value required for non-global scopes
    if (validatedData.scopeType !== 'global' && !validatedData.scopeValue) {
      return NextResponse.json(
        {
          error: 'Scope value required for non-global scope',
          scopeType: validatedData.scopeType,
        },
        { status: 400 }
      );
    }
    
    // Check for existing active role in same scope
    const existingRole = await db.execute(
      `SELECT id, role_code, status 
       FROM member_roles 
       WHERE member_id = $1 
         AND tenant_id = $2 
         AND role_code = $3
         AND scope_type = $4
         AND COALESCE(scope_value, '') = COALESCE($5, '')
         AND status = 'active'
       LIMIT 1`,
      [
        memberId,
        tenantId,
        validatedData.roleCode,
        validatedData.scopeType,
        validatedData.scopeValue || '',
      ]
    );
    
    if (existingRole.rows.length > 0) {
      return NextResponse.json(
        {
          error: 'Member already has this role in the specified scope',
          existingRole: existingRole.rows[0],
        },
        { status: 409 }
      );
    }
    
    // Calculate next election date if term specified
    const startDate = validatedData.startDate ? new Date(validatedData.startDate) : new Date();
    const nextElectionDate = validatedData.termYears
      ? new Date(startDate.getTime() + validatedData.termYears * 365 * 24 * 60 * 60 * 1000)
      : null;
    
    // Begin transaction
    await db.transaction(async (tx) => {
      // 1. Update organization_members table (legacy simple role)
      await tx
        .update(organizationMembers)
        .set({
          role: validatedData.roleCode,
          updatedAt: new Date(),
        })
        .where(eq(organizationMembers.id, memberId));
      
      // 2. Insert new member_roles record (enhanced RBAC)
      await tx.execute(
        `INSERT INTO member_roles (
          id,
          member_id,
          tenant_id,
          role_code,
          scope_type,
          scope_value,
          start_date,
          term_years,
          next_election_date,
          assignment_type,
          election_date,
          elected_by,
          vote_count,
          total_votes,
          vote_percentage,
          status,
          is_acting_role,
          acting_for_member_id,
          acting_reason,
          acting_start_date,
          acting_end_date,
          requires_approval,
          created_at,
          created_by,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), $22, NOW()
        )`,
        [
          memberId,
          tenantId,
          validatedData.roleCode,
          validatedData.scopeType,
          validatedData.scopeValue || null,
          startDate.toISOString().split('T')[0],
          validatedData.termYears || null,
          nextElectionDate?.toISOString().split('T')[0] || null,
          validatedData.assignmentType,
          validatedData.electionDate || null,
          validatedData.assignmentType === 'elected' ? 'membership_vote' : null,
          validatedData.voteCount || null,
          validatedData.totalVotes || null,
          validatedData.voteCount && validatedData.totalVotes
            ? ((validatedData.voteCount / validatedData.totalVotes) * 100).toFixed(2)
            : null,
          'active',
          validatedData.isActingRole,
          validatedData.actingForMemberId || null,
          validatedData.actingReason || null,
          validatedData.actingStartDate || null,
          validatedData.actingEndDate || null,
          false, // No approval needed for API assignments
          userId,
        ]
      );
      
      // 3. Expire conflicting lower-level global roles
      await tx.execute(
        `UPDATE member_roles mr
         SET status = 'expired',
             end_date = CURRENT_DATE,
             updated_at = NOW(),
             updated_by = $1
         FROM role_definitions rd_new, role_definitions rd_old
         WHERE mr.member_id = $2
           AND mr.tenant_id = $3
           AND mr.role_code != $4
           AND mr.scope_type = 'global'
           AND mr.status = 'active'
           AND mr.role_code = rd_old.role_code
           AND rd_new.role_code = $4
           AND rd_old.role_level < rd_new.role_level`,
        [userId, memberId, tenantId, validatedData.roleCode]
      );
      
      // 4. Audit logging
      await tx.execute(
        `INSERT INTO audit_log (
          event_type,
          resource_type,
          resource_id,
          tenant_id,
          user_id,
          event_data,
          ip_address,
          user_agent,
          status,
          created_at
        ) VALUES (
          'role_assigned',
          'member_roles',
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          'success',
          NOW()
        )`,
        [
          memberId,
          tenantId,
          userId,
          JSON.stringify({
            memberId,
            memberName: targetMember.name,
            roleCode: validatedData.roleCode,
            scopeType: validatedData.scopeType,
            scopeValue: validatedData.scopeValue,
            assignmentType: validatedData.assignmentType,
            termYears: validatedData.termYears,
            electionDate: validatedData.electionDate,
            reason: validatedData.reason,
            isActingRole: validatedData.isActingRole,
            assignedBy: userId,
            assignedByRole: assignerRole,
          }),
          request.headers.get('x-forwarded-for') || 'unknown',
          request.headers.get('user-agent') || 'unknown',
        ]
      );
    });
    
    logger.info('Role assigned successfully', {
      memberId,
      memberName: targetMember.name,
      roleCode: validatedData.roleCode,
      scopeType: validatedData.scopeType,
      assignedBy: userId,
      assignerRole,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Role assigned successfully',
      data: {
        memberId,
        memberName: targetMember.name,
        roleCode: validatedData.roleCode,
        scopeType: validatedData.scopeType,
        scopeValue: validatedData.scopeValue,
        assignmentType: validatedData.assignmentType,
        startDate: startDate.toISOString().split('T')[0],
        nextElectionDate: nextElectionDate?.toISOString().split('T')[0],
      },
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    logger.error('Role assignment failed', {
      error,
      memberId,
      userId,
      tenantId,
    });
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Export with authentication wrapper
// Requires at least officer role to assign member, president for executive roles
export const POST = withApiAuth(assignRoleHandler);
