/**
 * Batch Role Assignment API
 * POST /api/admin/roles/batch
 * 
 * Assigns multiple roles to multiple members in a single transaction.
 * Useful for mass migrations after identifying upgrade candidates.
 * 
 * Authorization: admin, president, chief_steward (within scope)
 * Date: February 11, 2026
 * Phase: 2 - Role Assignment Migration
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizationMembers } from '@/db/schema';
import { withApiAuth } from '@/lib/api-auth-guard';
import { z } from 'zod';
import { and, inArray } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { pgTable, uuid, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

// ============================================================================
// LOCAL TABLE DEFINITIONS
// Note: These tables exist in DB but aren&apos;t exported in main schema yet
// ============================================================================

const memberRoles = pgTable('member_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull(),
  organizationId: uuid('organization_id').notNull(),
  roleCode: text('role_code').notNull(),
  scopeType: text('scope_type').notNull(),
  scopeValue: text('scope_value'),
  assignmentType: text('assignment_type'),
  status: text('status').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  assignedBy: text('assigned_by'),
  assignedByRole: text('assigned_by_role'),
  reason: text('reason'),
  electionDate: timestamp('election_date', { withTimezone: true }),
  voteCount: integer('vote_count'),
  totalVotes: integer('total_votes'),
  votePercentage: integer('vote_percentage'),
  termYears: integer('term_years'),
  nextElectionDate: timestamp('next_election_date', { withTimezone: true }),
  isActingRole: boolean('is_acting_role'),
  actingForMemberId: uuid('acting_for_member_id'),
  actingReason: text('acting_reason'),
  actingStartDate: timestamp('acting_start_date', { withTimezone: true }),
  actingEndDate: timestamp('acting_end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

const roleDefinitions = pgTable('role_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleCode: text('role_code').notNull(),
  roleName: text('role_name').notNull(),
  roleLevel: integer('role_level').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

const auditLog = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id'),
  userId: text('user_id'),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }),
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

const RoleAssignmentSchema = z.object({
  memberId: z.string().uuid(),
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
    'member'
  ]),
  scopeType: z.enum(['global', 'department', 'location', 'shift', 'chapter']).default('global'),
  scopeValue: z.string().optional(),
  assignmentType: z.enum(['elected', 'appointed', 'acting', 'emergency']).default('appointed'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  
  // Election tracking
  electionDate: z.string().datetime().optional(),
  voteCount: z.number().int().positive().optional(),
  totalVotes: z.number().int().positive().optional(),
  termYears: z.number().int().positive().optional(),
  
  // Acting role fields
  isActingRole: z.boolean().default(false),
  actingForMemberId: z.string().uuid().optional(),
  actingReason: z.string().optional(),
  actingStartDate: z.string().datetime().optional(),
  actingEndDate: z.string().datetime().optional(),
});

const BatchRoleAssignmentRequestSchema = z.object({
  assignments: z.array(RoleAssignmentSchema).min(1).max(100), // Max 100 per batch
  dryRun: z.boolean().default(false), // Test mode - validate but don&apos;t commit
  stopOnError: z.boolean().default(false), // Stop batch if any assignment fails
});

type RoleAssignment = z.infer<typeof RoleAssignmentSchema>;

interface AssignmentResult {
  memberId: string;
  memberName: string;
  roleCode: string;
  success: boolean;
  error?: string;
  skipReason?: string;
}

// ============================================================================
// AUTHORIZATION LOGIC
// ============================================================================

/**
 * Check if current user can assign a specific role
 * Uses role hierarchy levels from lib/api-auth-guard.ts
 */
function canAssignRole(currentUserRole: string, targetRoleCode: string): boolean {
  const ROLE_HIERARCHY: Record<string, number> = {
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

  const targetLevel = ROLE_HIERARCHY[targetRoleCode] || 0;

  // Admin can assign any role
  if (currentUserRole === 'admin') return true;

  // President can assign roles up to officer (level 60)
  if (currentUserRole === 'president' && targetLevel <= 60) return true;

  // Chief steward can assign steward and member
  if (currentUserRole === 'chief_steward' && ['steward', 'member'].includes(targetRoleCode)) {
    return true;
  }

  // Officer can assign member only
  if (currentUserRole === 'officer' && targetRoleCode === 'member') return true;

  return false;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate a single role assignment before execution
 */
async function validateAssignment(
  assignment: RoleAssignment,
  currentUserId: string,
  currentUserRole: string,
  currentOrganizationId: string
): Promise<{ valid: boolean; error?: string; skipReason?: string }> {
  // Authorization check
  if (!canAssignRole(currentUserRole, assignment.roleCode)) {
    return {
      valid: false,
      error: `Insufficient permissions to assign role: ${assignment.roleCode}`,
    };
  }

  // Check target member exists and is in same org
  const [targetMemberResult] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.id, assignment.memberId),
        eq(organizationMembers.organizationId, currentOrganizationId)
      )
    )
    .limit(1);

  if (!targetMemberResult) {
    return {
      valid: false,
      error: `Member ${assignment.memberId} not found in organization`,
    };
  }

  if (targetMemberResult.status !== 'active') {
    return {
      valid: false,
      skipReason: `Member ${targetMemberResult.name} is ${targetMemberResult.status}, skipping`,
    };
  }

  // Check if member already has this role in this scope
  const [existingRole] = await db
    .select()
    .from(memberRoles)
    .where(
      and(
        eq(memberRoles.memberId, assignment.memberId),
        eq(memberRoles.roleCode, assignment.roleCode),
        eq(memberRoles.scopeType, assignment.scopeType),
        assignment.scopeValue
          ? eq(memberRoles.scopeValue, assignment.scopeValue)
          : eq(memberRoles.scopeValue, ''),
        eq(memberRoles.status, 'active')
      )
    )
    .limit(1);

  if (existingRole) {
    return {
      valid: true,
      skipReason: `Member already has ${assignment.roleCode} in ${assignment.scopeType} scope`,
    };
  }

  // Validate acting role fields
  if (assignment.isActingRole) {
    if (!assignment.actingForMemberId) {
      return {
        valid: false,
        error: 'Acting role requires actingForMemberId',
      };
    }
    if (!assignment.actingReason) {
      return {
        valid: false,
        error: 'Acting role requires actingReason',
      };
    }
  }

  // Validate elected role fields
  if (assignment.assignmentType === 'elected' && !assignment.electionDate) {
    logger.warn(`Elected role ${assignment.roleCode} for ${assignment.memberId} missing electionDate`);
  }

  // Validate non-global scopes require scopeValue
  if (assignment.scopeType !== 'global' && !assignment.scopeValue) {
    return {
      valid: false,
      error: `${assignment.scopeType} scope requires scopeValue`,
    };
  }

  // Validate vote percentages if provided
  if (assignment.voteCount && assignment.totalVotes) {
    if (assignment.voteCount > assignment.totalVotes) {
      return {
        valid: false,
        error: 'voteCount cannot exceed totalVotes',
      };
    }
  }

  return { valid: true };
}

/**
 * Execute a single role assignment
 */
async function executeAssignment(
  assignment: RoleAssignment,
  currentUserId: string,
  currentUserRole: string,
  currentOrganizationId: string
): Promise<AssignmentResult> {
  try {
    // Get target member info
    const [targetMember] = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.id, assignment.memberId))
      .limit(1);

    if (!targetMember) {
      return {
        memberId: assignment.memberId,
        memberName: 'Unknown',
        roleCode: assignment.roleCode,
        success: false,
        error: 'Member not found',
      };
    }

    // Validate assignment
    const validation = await validateAssignment(
      assignment,
      currentUserId,
      currentUserRole,
      currentOrganizationId
    );

    if (!validation.valid) {
      return {
        memberId: assignment.memberId,
        memberName: targetMember.name,
        roleCode: assignment.roleCode,
        success: false,
        error: validation.error,
      };
    }

    if (validation.skipReason) {
      return {
        memberId: assignment.memberId,
        memberName: targetMember.name,
        roleCode: assignment.roleCode,
        success: true,
        skipReason: validation.skipReason,
      };
    }

    // Calculate vote percentage
    const votePercentage =
      assignment.voteCount && assignment.totalVotes
        ? (assignment.voteCount / assignment.totalVotes) * 100
        : undefined;

    // Calculate next election date
    const nextElectionDate =
      assignment.termYears && assignment.electionDate
        ? new Date(
            new Date(assignment.electionDate).setFullYear(
              new Date(assignment.electionDate).getFullYear() + assignment.termYears
            )
          )
        : undefined;

    // Execute in transaction
    await db.transaction(async (tx) => {
      // Step 1: Update organization_members.role (legacy simple role)
      await tx
        .update(organizationMembers)
        .set({
          role: assignment.roleCode,
          updatedAt: new Date(),
        })
        .where(eq(organizationMembers.id, assignment.memberId));

      // Step 2: Insert into member_roles (enhanced RBAC)
      await tx.insert(memberRoles).values({
        memberId: assignment.memberId,
        organizationId: currentOrganizationId,
        roleCode: assignment.roleCode,
        scopeType: assignment.scopeType,
        scopeValue: assignment.scopeValue || '',
        assignmentType: assignment.assignmentType,
        status: 'active',
        startDate: new Date(),
        assignedBy: currentUserId,
        assignedByRole: currentUserRole,
        reason: assignment.reason,

        // Election tracking
        electionDate: assignment.electionDate ? new Date(assignment.electionDate) : undefined,
        voteCount: assignment.voteCount,
        totalVotes: assignment.totalVotes,
        votePercentage,
        termYears: assignment.termYears,
        nextElectionDate,

        // Acting role
        isActingRole: assignment.isActingRole,
        actingForMemberId: assignment.actingForMemberId,
        actingReason: assignment.actingReason,
        actingStartDate: assignment.actingStartDate
          ? new Date(assignment.actingStartDate)
          : undefined,
        actingEndDate: assignment.actingEndDate
          ? new Date(assignment.actingEndDate)
          : undefined,

        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 3: Get role level for new role
      const [newRoleDef] = await tx
        .select()
        .from(roleDefinitions)
        .where(eq(roleDefinitions.roleCode, assignment.roleCode))
        .limit(1);

      if (!newRoleDef) {
        throw new Error(`Role definition not found for ${assignment.roleCode}`);
      }

      // Step 4: Expire conflicting lower-level global roles
      const lowerLevelRoles = await tx
        .select({ roleCode: roleDefinitions.roleCode })
        .from(roleDefinitions)
        .where(and(
          eq(roleDefinitions.roleLevel, newRoleDef.roleLevel),
          eq(roleDefinitions.isActive, true)
        ));

      const lowerRoleCodes = lowerLevelRoles.map((r) => r.roleCode);

      if (lowerRoleCodes.length > 0) {
        await tx
          .update(memberRoles)
          .set({
            status: 'expired',
            endDate: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(memberRoles.memberId, assignment.memberId),
              inArray(memberRoles.roleCode, lowerRoleCodes),
              eq(memberRoles.scopeType, 'global'),
              eq(memberRoles.status, 'active')
            )
          );
      }

      // Step 5: Audit log
      await tx.insert(auditLog).values({
        organizationId: currentOrganizationId,
        userId: currentUserId,
        action: 'role_assigned',
        resourceType: 'member_role',
        resourceId: assignment.memberId,
        details: {
          memberId: assignment.memberId,
          memberName: targetMember.name,
          roleCode: assignment.roleCode,
          scopeType: assignment.scopeType,
          scopeValue: assignment.scopeValue,
          assignmentType: assignment.assignmentType,
          reason: assignment.reason,
          isActingRole: assignment.isActingRole,
          assignedBy: currentUserId,
          assignedByRole: currentUserRole,
          batchOperation: true,
        },
        createdAt: new Date(),
      });
    });

    logger.info(`Role assigned: ${targetMember.name} → ${assignment.roleCode}`);

    return {
      memberId: assignment.memberId,
      memberName: targetMember.name,
      roleCode: assignment.roleCode,
      success: true,
    };
  } catch (error) {
    logger.error('Role assignment failed', { assignment, error });
    return {
      memberId: assignment.memberId,
      memberName: 'Unknown',
      roleCode: assignment.roleCode,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

interface RequestContext {
  user: { id: string; role: string };
  organizationId: string;
}

async function batchRoleAssignmentHandler(req: NextRequest, context: RequestContext) {
  try {
    const { user, organizationId } = context;

    // Parse and validate request body
    const body = await req.json();
    const validationResult = BatchRoleAssignmentRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { assignments, dryRun, stopOnError } = validationResult.data;

    logger.info(`Batch role assignment started`, {
      userId: user.id,
      organizationId,
      assignmentCount: assignments.length,
      dryRun,
      stopOnError,
    });

    // Process all assignments
    const results: AssignmentResult[] = [];
    let stopProcessing = false;

    for (const assignment of assignments) {
      if (stopProcessing) {
        results.push({
          memberId: assignment.memberId,
          memberName: 'Unknown',
          roleCode: assignment.roleCode,
          success: false,
          skipReason: 'Batch stopped due to previous error',
        });
        continue;
      }

      if (dryRun) {
        // Validate only, don&apos;t execute
        const validation = await validateAssignment(
          assignment,
          user.id,
          user.role,
          organizationId
        );

        results.push({
          memberId: assignment.memberId,
          memberName: 'DRY RUN',
          roleCode: assignment.roleCode,
          success: validation.valid,
          error: validation.error,
          skipReason: validation.skipReason,
        });
      } else {
        // Execute assignment
        const result = await executeAssignment(
          assignment,
          user.id,
          user.role,
          organizationId
        );

        results.push(result);

        // Stop on error if requested
        if (!result.success && stopOnError && !result.skipReason) {
          stopProcessing = true;
        }
      }
    }

    // Calculate summary statistics
    const summary = {
      total: assignments.length,
      successful: results.filter((r) => r.success && !r.skipReason).length,
      skipped: results.filter((r) => r.skipReason).length,
      failed: results.filter((r) => !r.success).length,
      dryRun,
    };

    logger.info(`Batch role assignment completed`, { summary });

    return NextResponse.json({
      success: summary.failed === 0,
      message: dryRun
        ? 'Dry run completed - no changes made'
        : `Batch role assignment completed: ${summary.successful} successful, ${summary.skipped} skipped, ${summary.failed} failed`,
      summary,
      results,
    });
  } catch (error) {
    logger.error('Batch role assignment error', { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const POST = withApiAuth(batchRoleAssignmentHandler);
