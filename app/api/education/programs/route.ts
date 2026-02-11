import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainingPrograms, trainingCourses } from "@/db/migrations/schema";
import { eq, and, or, inArray, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

// GET /api/education/programs - List training programs with filters
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get("organizationId");
      const programCategory = searchParams.get("programCategory");
      const includeInactive = searchParams.get("includeInactive") === "true";
      const search = searchParams.get("search");

      if (!organizationId) {
        return NextResponse.json(
          { error: "organizationId is required" },
          { status: 400 }
        );
      }

      // Build WHERE conditions
      const conditions = [eq(trainingPrograms.organizationId, organizationId)];

      if (programCategory) {
        conditions.push(eq(trainingPrograms.programCategory, programCategory));
      }

      if (!includeInactive) {
        conditions.push(eq(trainingPrograms.isActive, true));
      }

      // Query programs
      let programs = await db
        .select()
        .from(trainingPrograms)
        .where(and(...conditions))
        .orderBy(trainingPrograms.programName);

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        programs = programs.filter(
          (p) =>
            p.programName.toLowerCase().includes(searchLower) ||
            p.programCode?.toLowerCase().includes(searchLower) ||
            p.programDescription?.toLowerCase().includes(searchLower)
        );
      }

      // Get enrollment counts for each program
      const programsWithStats = await Promise.all(
        programs.map(async (program) => {
          const [stats] = await db.execute(sql`
          SELECT 
            COUNT(*) as total_enrolled,
            COUNT(CASE WHEN enrollment_status = 'active' THEN 1 END) as active_enrolled,
            COUNT(CASE WHEN enrollment_status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN enrollment_status = 'withdrawn' THEN 1 END) as withdrawn,
            AVG(CASE WHEN progress_percentage IS NOT NULL THEN progress_percentage ELSE 0 END) as avg_progress_percentage
          FROM program_enrollments
          WHERE program_id = ${program.id}
        `) as unknown as [Record<string, unknown>];

          return {
            ...program,
            stats: {
              totalEnrolled: Number((stats as Record<string, unknown>).total_enrolled) || 0,
              activeEnrolled: Number((stats as Record<string, unknown>).active_enrolled) || 0,
              completed: Number((stats as Record<string, unknown>).completed) || 0,
              withdrawn: Number((stats as Record<string, unknown>).withdrawn) || 0,
              avgProgressPercentage: Number((stats as Record<string, unknown>).avg_progress_percentage) || 0,
            },
          };
        })
      );

      logger.info("Programs retrieved", {
        count: programsWithStats.length,
        organizationId,
        includeInactive,
      });

      return NextResponse.json({
        programs: programsWithStats,
        count: programsWithStats.length,
      });
    } catch (error) {
      logger.error("Error retrieving programs", { error });
      return NextResponse.json(
        { error: "Failed to retrieve programs" },
        { status: 500 }
      );
    }
    })(request);
};

// POST /api/education/programs - Create new training program
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();
      const {
        organizationId,
        programName,
        programCategory,
        programDescription,
        programDurationMonths,
        requiredCourses,
        electiveCourses,
        electivesRequiredCount,
        totalHoursRequired,
        providesCertification,
        certificationName,
        entryRequirements,
        timeCommitment,
        clcApproved,
        notes,
      } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      // Validate required fields
      if (!organizationId || !programName) {
        return NextResponse.json(
          {
            error:
              "Missing required fields: organizationId, programName",
          },
          { status: 400 }
        );
      }

      // Generate program code
      const categoryPrefix = programCategory?.toUpperCase().substring(0, 3) || 'GEN';
      const programCode = `PROG-${categoryPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Create program
      const [newProgram] = await db
        .insert(trainingPrograms)
        .values({
          organizationId,
          programName,
          programCode,
          programCategory: programCategory || null,
          programDescription: programDescription || null,
          programDurationMonths: programDurationMonths || null,
          requiredCourses: requiredCourses || [],
          electiveCourses: electiveCourses || [],
          electivesRequiredCount: electivesRequiredCount || 0,
          totalHoursRequired: totalHoursRequired?.toString() || null,
          providesCertification: providesCertification || false,
          certificationName: certificationName || null,
          entryRequirements: entryRequirements || null,
          timeCommitment: timeCommitment || null,
          clcApproved: clcApproved || false,
          isActive: true,
          notes: notes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      logger.info("Program created", {
        programId: newProgram.id,
        programCode,
        programName,
        organizationId,
      });

      return NextResponse.json(
        {
          program: newProgram,
          message: "Program created successfully",
        },
        { status: 201 }
      );
    } catch (error) {
      logger.error("Error creating program", { error });
      return NextResponse.json(
        { error: "Failed to create program" },
        { status: 500 }
      );
    }
    })(request);
};

// PATCH /api/education/programs?id={programId} - Update program
export const PATCH = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const programId = searchParams.get("id");

      if (!programId) {
        return NextResponse.json(
          { error: "Program ID is required" },
          { status: 400 }
        );
      }

      const body = await request.json();
      const {
        programName,
        programCategory,
        programDescription,
        programDurationMonths,
        requiredCourses,
        electiveCourses,
        electivesRequiredCount,
        totalHoursRequired,
        providesCertification,
        certificationName,
        entryRequirements,
        timeCommitment,
        clcApproved,
        isActive,
        notes,
      } = body;

      // Build update object
      const updateData: any = {
        updatedAt: new Date().toISOString(),
      };

      if (programName !== undefined) updateData.programName = programName;
      if (programCategory !== undefined) updateData.programCategory = programCategory;
      if (programDescription !== undefined) updateData.programDescription = programDescription;
      if (programDurationMonths !== undefined) updateData.programDurationMonths = programDurationMonths;
      if (requiredCourses !== undefined) updateData.requiredCourses = requiredCourses;
      if (electiveCourses !== undefined) updateData.electiveCourses = electiveCourses;
      if (electivesRequiredCount !== undefined) updateData.electivesRequiredCount = electivesRequiredCount;
      if (totalHoursRequired !== undefined) updateData.totalHoursRequired = totalHoursRequired?.toString();
      if (providesCertification !== undefined) updateData.providesCertification = providesCertification;
      if (certificationName !== undefined) updateData.certificationName = certificationName;
      if (entryRequirements !== undefined) updateData.entryRequirements = entryRequirements;
      if (timeCommitment !== undefined) updateData.timeCommitment = timeCommitment;
      if (clcApproved !== undefined) updateData.clcApproved = clcApproved;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (notes !== undefined) updateData.notes = notes;

      const [updatedProgram] = await db
        .update(trainingPrograms)
        .set(updateData)
        .where(eq(trainingPrograms.id, programId))
        .returning();

      if (!updatedProgram) {
        return NextResponse.json({ error: "Program not found" }, { status: 404 });
      }

      logger.info("Program updated", {
        programId,
        updates: Object.keys(updateData),
      });

      return NextResponse.json({
        program: updatedProgram,
        message: "Program updated successfully",
      });
    } catch (error) {
      logger.error("Error updating program", { error });
      return NextResponse.json(
        { error: "Failed to update program" },
        { status: 500 }
      );
    }
    })(request);
};

// DELETE /api/education/programs?id={programId} - Deactivate program
export const DELETE = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const programId = searchParams.get("id");

      if (!programId) {
        return NextResponse.json(
          { error: "Program ID is required" },
          { status: 400 }
        );
      }

      // Check for active enrollments
      const [enrollmentCheck] = await db.execute(sql`
      SELECT COUNT(*) as active_count
      FROM program_enrollments
      WHERE program_id = ${programId}
        AND enrollment_status = 'active'
    `) as unknown as [Record<string, unknown>];

      const activeCount = Number((enrollmentCheck as Record<string, unknown>).active_count) || 0;

      if (activeCount > 0) {
        return NextResponse.json(
          {
            error: `Cannot deactivate program with ${activeCount} active enrollment(s)`,
            activeEnrollments: activeCount,
          },
          { status: 400 }
        );
      }

      // Deactivate program (soft delete)
      const [deactivatedProgram] = await db
        .update(trainingPrograms)
        .set({
          isActive: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(trainingPrograms.id, programId))
        .returning();

      if (!deactivatedProgram) {
        return NextResponse.json({ error: "Program not found" }, { status: 404 });
      }

      logger.info("Program deactivated", { programId });

      return NextResponse.json({
        message: "Program deactivated successfully",
        program: deactivatedProgram,
      });
    } catch (error) {
      logger.error("Error deactivating program", { error });
      return NextResponse.json(
        { error: "Failed to deactivate program" },
        { status: 500 }
      );
    }
    })(request);
};

