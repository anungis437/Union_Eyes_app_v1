import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memberCertifications, trainingCourses, members, organizations } from "@/db/schema";
import { and, or, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
// GET /api/education/certifications - List certifications with filters
export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get("organizationId");
      const memberId = searchParams.get("memberId");
      const certificationStatus = searchParams.get("certificationStatus");
      const expiringInDays = searchParams.get("expiringInDays");
      const includeExpired = searchParams.get("includeExpired") === "true";
      const courseId = searchParams.get("courseId");

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'organizationId is required'
    );
      }

      // Build WHERE conditions
      const conditions = [eq(memberCertifications.organizationId, organizationId)];

      if (memberId) {
        conditions.push(eq(memberCertifications.memberId, memberId));
      }

      if (courseId) {
        conditions.push(eq(memberCertifications.courseId, courseId));
      }

      if (certificationStatus) {
        conditions.push(eq(memberCertifications.certificationStatus, certificationStatus as any));
      }

      // Query certifications with member and course details
      const certifications = await db
        .select({
          id: memberCertifications.id,
          organizationId: memberCertifications.organizationId,
          memberId: memberCertifications.memberId,
          firstName: members.firstName,
          lastName: members.lastName,
          email: members.email,
          certificationName: memberCertifications.certificationName,
          certificationType: memberCertifications.certificationType,
          issuedByOrganization: memberCertifications.issuedByOrganization,
          certificationNumber: memberCertifications.certificationNumber,
          issueDate: memberCertifications.issueDate,
          expiryDate: memberCertifications.expiryDate,
          validYears: memberCertifications.validYears,
          certificationStatus: memberCertifications.certificationStatus,
          courseId: memberCertifications.courseId,
          courseName: trainingCourses.courseName,
          courseCode: trainingCourses.courseCode,
          sessionId: memberCertifications.sessionId,
          registrationId: memberCertifications.registrationId,
          renewalRequired: memberCertifications.renewalRequired,
          renewalDate: memberCertifications.renewalDate,
          renewalCourseId: memberCertifications.renewalCourseId,
          verified: memberCertifications.verified,
          verificationDate: memberCertifications.verificationDate,
          verifiedBy: memberCertifications.verifiedBy,
          clcRegistered: memberCertifications.clcRegistered,
          clcRegistrationNumber: memberCertifications.clcRegistrationNumber,
          clcRegistrationDate: memberCertifications.clcRegistrationDate,
          certificateUrl: memberCertifications.certificateUrl,
          digitalBadgeUrl: memberCertifications.digitalBadgeUrl,
          revoked: memberCertifications.revoked,
          revocationDate: memberCertifications.revocationDate,
          revocationReason: memberCertifications.revocationReason,
          notes: memberCertifications.notes,
          createdAt: memberCertifications.createdAt,
          updatedAt: memberCertifications.updatedAt,
        })
        .from(memberCertifications)
        .leftJoin(members, eq(memberCertifications.memberId, members.id))
        .leftJoin(trainingCourses, eq(memberCertifications.courseId, trainingCourses.id))
        .where(and(...conditions))
        .orderBy(memberCertifications.issueDate);

      // Calculate expiry status for each certification
      const enrichedCertifications = certifications.map((cert) => {
        const now = new Date();
        let isExpired = false;
        let isExpiringSoon = false;
        let daysUntilExpiry: number | null = null;

        if (cert.expiryDate) {
          const expiryDate = new Date(cert.expiryDate);
          const diffTime = expiryDate.getTime() - now.getTime();
          daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          isExpired = daysUntilExpiry < 0;
          isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 90;
        }

        return {
          ...cert,
          isExpired,
          isExpiringSoon,
          daysUntilExpiry,
        };
      });

      // Filter by expiry if requested
      let filteredCertifications = enrichedCertifications;

      if (!includeExpired) {
        filteredCertifications = filteredCertifications.filter((cert) => !cert.isExpired);
      }

      if (expiringInDays) {
        const days = parseInt(expiringInDays);
        filteredCertifications = filteredCertifications.filter(
          (cert) => cert.daysUntilExpiry !== null && cert.daysUntilExpiry <= days && cert.daysUntilExpiry >= 0
        );
      }

      logger.info("Certifications retrieved", {
        count: filteredCertifications.length,
        organizationId,
        memberId,
        includeExpired,
      });

      return NextResponse.json({
        certifications: filteredCertifications,
        count: filteredCertifications.length,
        stats: {
          total: filteredCertifications.length,
          active: filteredCertifications.filter((c) => c.certificationStatus === "active").length,
          expiring: filteredCertifications.filter((c) => c.isExpiringSoon).length,
          expired: enrichedCertifications.filter((c) => c.isExpired).length,
        },
      });
    } catch (error) {
      logger.error("Error retrieving certifications", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve certifications',
      error
    );
    }
    })(request);
};

// POST /api/education/certifications - Issue new certification

const educationCertificationsSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  memberId: z.string().uuid('Invalid memberId'),
  certificationName: z.string().min(1, 'certificationName is required'),
  certificationType: z.unknown().optional(),
  issuedByOrganization: z.boolean().optional(),
  issueDate: z.boolean().optional(),
  expiryDate: z.string().datetime().optional(),
  validYears: z.string().uuid('Invalid validYears'),
  courseId: z.string().uuid('Invalid courseId'),
  sessionId: z.string().uuid('Invalid sessionId'),
  registrationId: z.string().uuid('Invalid registrationId'),
  renewalRequired: z.unknown().optional(),
  renewalCourseId: z.string().uuid('Invalid renewalCourseId'),
  clcRegistered: z.boolean().optional(),
  clcRegistrationNumber: z.boolean().optional(),
  certificateUrl: z.string().url('Invalid URL'),
  notes: z.string().optional(),
  certificationStatus: z.unknown().optional(),
  renewalDate: z.string().datetime().optional(),
  clcRegistrationDate: z.boolean().optional(),
  digitalBadgeUrl: z.string().url('Invalid URL'),
  revocationReason: z.unknown().optional(),
  revocationDate: z.string().datetime().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();
    // Validate request body
    const validation = educationCertificationsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
      // DUPLICATE REMOVED:     const { organizationId, memberId, certificationName, certificationType, issuedByOrganization, issueDate, expiryDate, validYears, courseId, sessionId, registrationId, renewalRequired, renewalCourseId, clcRegistered, clcRegistrationNumber, certificateUrl, notes, certificationStatus, renewalDate, clcRegistrationDate, digitalBadgeUrl, revocationReason, revocationDate } = validation.data;
      const {
        organizationId,
        memberId,
        certificationName,
        certificationType,
        issuedByOrganization,
        issueDate,
        expiryDate,
        validYears,
        courseId,
        sessionId,
        registrationId,
        renewalRequired,
        renewalCourseId,
        clcRegistered,
        clcRegistrationNumber,
        certificateUrl,
        notes,
      } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      // Validate required fields
      if (!organizationId || !memberId || !certificationName || !issueDate) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields: organizationId, memberId, certificationName, issueDate'
      // TODO: Migrate additional details: memberId, certificationName, issueDate"
    );
      }

      // Generate certification number
      const certificationNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Determine certification status based on expiry
      let certificationStatus = "active";
      if (expiryDate) {
        const now = new Date();
        const expiry = new Date(expiryDate);
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
          certificationStatus = "expired";
        } else if (daysUntilExpiry <= 90) {
          certificationStatus = "expiring_soon";
        }
      }

      // Calculate renewal date (30 days before expiry)
      let renewalDate: string | null = null;
      if (renewalRequired && expiryDate) {
        const renewalDateObj = new Date(expiryDate);
        renewalDateObj.setDate(renewalDateObj.getDate() - 30);
        renewalDate = renewalDateObj.toISOString().split('T')[0];
      }

      // Create certification
      const [newCertification] = await db
        .insert(memberCertifications)
        .values({
          organizationId,
          memberId,
          certificationName,
          certificationType: certificationType || null,
          issuedByOrganization: issuedByOrganization || null,
          certificationNumber,
          issueDate: new Date(issueDate).toISOString().split('T')[0],
          expiryDate: expiryDate ? new Date(expiryDate).toISOString().split('T')[0] : null,
          validYears: validYears || null,
          certificationStatus,
          courseId: courseId || null,
          sessionId: sessionId || null,
          registrationId: registrationId || null,
          renewalRequired: renewalRequired || false,
          renewalDate,
          renewalCourseId: renewalCourseId || null,
          clcRegistered: clcRegistered || false,
          clcRegistrationNumber: clcRegistrationNumber || null,
          certificateUrl: certificateUrl || null,
          notes: notes || null,
        })
        .returning();

      logger.info("Certification issued", {
        certificationId: newCertification.id,
        certificationNumber,
        memberId,
        organizationId,
      });

      return standardSuccessResponse(
      { 
          certification: newCertification,
          message: "Certification issued successfully",
         },
      undefined,
      201
    );
    } catch (error) {
      logger.error("Error issuing certification", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to issue certification',
      error
    );
    }
    })(request);
};

// PATCH /api/education/certifications?id={certificationId} - Update certification
export const PATCH = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const certificationId = searchParams.get("id");

      if (!certificationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Certification ID is required'
    );
      }

      const body = await request.json();
      const {
        certificationStatus,
        expiryDate,
        renewalRequired,
        renewalCourseId,
        renewalDate,
        clcRegistered,
        clcRegistrationNumber,
        clcRegistrationDate,
        certificateUrl,
        digitalBadgeUrl,
        revocationReason,
        revocationDate,
        notes,
      } = body;

      // Build update object
      const updateData = {
        updatedAt: new Date().toISOString(),
      };

      if (certificationStatus !== undefined) {
        updateData.certificationStatus = certificationStatus;
        
        // Handle revocation
        if (certificationStatus === "revoked") {
          updateData.revoked = true;
          updateData.revocationReason = revocationReason || "Revoked by administrator";
          updateData.revocationDate = revocationDate ? new Date(revocationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        }
      }

      if (expiryDate !== undefined) updateData.expiryDate = new Date(expiryDate).toISOString().split('T')[0];
      if (renewalRequired !== undefined) updateData.renewalRequired = renewalRequired;
      if (renewalCourseId !== undefined) updateData.renewalCourseId = renewalCourseId;
      if (renewalDate !== undefined) updateData.renewalDate = new Date(renewalDate).toISOString().split('T')[0];
      if (clcRegistered !== undefined) updateData.clcRegistered = clcRegistered;
      if (clcRegistrationNumber !== undefined) updateData.clcRegistrationNumber = clcRegistrationNumber;
      if (clcRegistrationDate !== undefined) updateData.clcRegistrationDate = new Date(clcRegistrationDate).toISOString().split('T')[0];
      if (certificateUrl !== undefined) updateData.certificateUrl = certificateUrl;
      if (digitalBadgeUrl !== undefined) updateData.digitalBadgeUrl = digitalBadgeUrl;
      if (notes !== undefined) updateData.notes = notes;

      const [updatedCertification] = await db
        .update(memberCertifications)
        .set(updateData)
        .where(eq(memberCertifications.id, certificationId))
        .returning();

      if (!updatedCertification) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Certification not found'
    );
      }

      logger.info("Certification updated", {
        certificationId,
        updates: Object.keys(updateData),
      });

      return NextResponse.json({
        certification: updatedCertification,
        message: "Certification updated successfully",
      });
    } catch (error) {
      logger.error("Error updating certification", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update certification',
      error
    );
    }
    })(request);
};

// DELETE /api/education/certifications?id={certificationId} - Revoke certification
export const DELETE = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId } = context;

  try {
      const { searchParams } = new URL(request.url);
      const certificationId = searchParams.get("id");
      const reason = searchParams.get("reason");

      if (!certificationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Certification ID is required'
    );
      }

      // Revoke certification (soft delete)
      const [revokedCertification] = await db
        .update(memberCertifications)
        .set({
          certificationStatus: "revoked",
          revoked: true,
          revocationReason: reason || "Revoked by administrator",
          revocationDate: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString(),
        })
        .where(eq(memberCertifications.id, certificationId))
        .returning();

      if (!revokedCertification) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Certification not found'
    );
      }

      logger.info("Certification revoked", {
        certificationId,
        reason,
        revokedBy: userId,
      });

      return NextResponse.json({
        message: "Certification revoked successfully",
        certification: revokedCertification,
      });
    } catch (error) {
      logger.error("Error revoking certification", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to revoke certification',
      error
    );
    }
    })(request);
};

