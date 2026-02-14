import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  courseRegistrations,
  trainingCourses,
  courseSessions,
  members,
  memberCertifications,
} from "@/db/schema";
import { and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { put } from "@vercel/blob";
import { renderToStream } from "@react-pdf/renderer";
import {
  CertificateTemplate,
  createUnionCertificate,
} from "@/components/pdf/certificate-template";
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { organizations } from '@/db/schema-organizations';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
// GET /api/education/certifications/generate?registrationId={id} - Generate certificate PDF
export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const registrationId = searchParams.get("registrationId");
      const download = searchParams.get("download") === "true";

      if (!registrationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'registrationId is required'
    );
      }

      // Fetch registration with course, session, and member details
      const [registration] = await db
        .select({
          registrationId: courseRegistrations.id,
          registrationStatus: courseRegistrations.registrationStatus,
          completionDate: courseRegistrations.completionDate,
          attendanceHours: courseRegistrations.attendanceHours,
          certificateIssued: courseRegistrations.certificateIssued,
          certificateUrl: courseRegistrations.certificateUrl,
          memberId: members.id,
          memberFirstName: members.firstName,
          memberLastName: members.lastName,
          email: members.email,
          courseId: trainingCourses.id,
          courseName: trainingCourses.courseName,
          courseCode: trainingCourses.courseCode,
          durationHours: trainingCourses.durationHours,
          clcApproved: trainingCourses.clcApproved,
          clcCourseCode: trainingCourses.clcCourseCode,
          certificationName: trainingCourses.certificationName,
          certificationValidYears: trainingCourses.certificationValidYears,
          sessionId: courseSessions.id,
          sessionCode: courseSessions.sessionCode,
          startDate: courseSessions.startDate,
          endDate: courseSessions.endDate,
          leadInstructorName: courseSessions.leadInstructorName,
          organizationId: courseRegistrations.organizationId,
        })
        .from(courseRegistrations)
        .leftJoin(members, eq(courseRegistrations.memberId, members.id))
        .leftJoin(trainingCourses, eq(courseRegistrations.courseId, trainingCourses.id))
        .leftJoin(courseSessions, eq(courseRegistrations.sessionId, courseSessions.id))
        .where(eq(courseRegistrations.id, registrationId));

      if (!registration) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Registration not found'
    );
      }

      // Verify completion status
      if (registration.registrationStatus !== "completed") {
        return NextResponse.json(
          { error: "Certificate can only be generated for completed courses" },
          { status: 400 }
        );
      }

      // Check if certification already exists
      const [existingCertification] = await db
        .select()
        .from(memberCertifications)
        .where(
          and(
            eq(memberCertifications.registrationId, registrationId),
            eq(memberCertifications.certificationStatus, "active")
          )
        );

      // If certification exists and has a certificate URL, return that
      if (existingCertification?.certificateUrl && !download) {
        return NextResponse.json({
          certificateUrl: existingCertification.certificateUrl,
          certificationId: existingCertification.id,
          message: "Certificate already generated",
        });
      }

      // Generate certificate number
      const certificateNumber = `CERT-${registration.courseCode || "COURSE"}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Calculate expiry date if certification has validity period (years)
      let expiryDate: Date | undefined;
      if (registration.certificationValidYears && registration.completionDate) {
        expiryDate = new Date(registration.completionDate);
        expiryDate.setFullYear(
          expiryDate.getFullYear() + registration.certificationValidYears
        );
      }

      // Create certificate data
      // Note: members table in db/migrations/schema doesn&apos;t have memberNumber field
      const memberFullName = [registration.memberFirstName, registration.memberLastName]
        .filter(Boolean)
        .join(" ");
      const [organization] = await db
        .select({ name: organizations.name, displayName: organizations.displayName })
        .from(organizations)
        .where(eq(organizations.id, context.organizationId))
        .limit(1);

      const certificateData = createUnionCertificate({
        organizationName: organization?.displayName || organization?.name || "Union Local",
        memberName: memberFullName || "",
        memberNumber: registration.memberId || "", // Use memberId as identifier
        courseName: registration.courseName || "",
        courseCode: registration.courseCode || undefined,
        courseHours: registration.durationHours ? parseFloat(registration.durationHours) : undefined,
        certificationName: registration.certificationName || undefined,
        certificateNumber,
        issueDate: new Date(),
        expiryDate,
        completionDate: registration.completionDate ? new Date(registration.completionDate) : new Date(),
        clcApproved: registration.clcApproved || false,
        clcCourseCode: registration.clcCourseCode || undefined,
        sessionCode: registration.sessionCode || undefined,
        instructorName: registration.leadInstructorName || undefined,
      });

      // Generate PDF stream
      const pdfStream = await (renderToStream as any)(
        CertificateTemplate(certificateData)
      );

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = pdfStream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      const pdfBuffer = Buffer.concat(chunks);

      // If download=true, return PDF directly
      if (download) {
        return new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="certificate-${certificateNumber}.pdf"`,
          },
        });
      }

      // Upload to Vercel Blob
      const filename = `certificates/${registration.organizationId}/${registration.memberId}/${certificateNumber}.pdf`;
      const blob = await put(filename, pdfBuffer, {
        access: "public",
        contentType: "application/pdf",
      });

      // Create or update certification record
      let certificationId: string;

      if (existingCertification) {
        // Update existing certification
        const [updatedCertification] = await db
          .update(memberCertifications)
          .set({
            certificateUrl: blob.url,
            certificationNumber: certificateNumber,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(memberCertifications.id, existingCertification.id))
          .returning();

        certificationId = updatedCertification.id;
      } else {
        // Create new certification
        const [newCertification] = await db
          .insert(memberCertifications)
          .values({
            organizationId: registration.organizationId!,
            memberId: registration.memberId!,
            certificationName:
              registration.certificationName || registration.courseName || "",
            certificationNumber: certificateNumber,
            issueDate: new Date().toISOString().split('T')[0], // date field expects YYYY-MM-DD
            expiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : null,
            certificationStatus: "active",
            courseId: registration.courseId,
            sessionId: registration.sessionId,
            registrationId: registrationId,
            certificateUrl: blob.url,
            clcRegistered: registration.clcApproved || false,
            clcRegistrationNumber: registration.clcCourseCode || null,
          })
          .returning();

        certificationId = newCertification.id;
      }

      // Update registration record
      await db
        .update(courseRegistrations)
        .set({
          certificateIssued: true,
          certificateUrl: blob.url,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(courseRegistrations.id, registrationId));

      logger.info("Certificate generated and uploaded", {
        registrationId,
        certificationId,
        certificateNumber,
        certificateUrl: blob.url,
      });

      return NextResponse.json({
        certificateUrl: blob.url,
        certificationId,
        certificateNumber,
        message: "Certificate generated successfully",
      });
    } catch (error) {
      logger.error("Error generating certificate", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to generate certificate',
      error
    );
    }
    })(request);
};

// POST /api/education/certifications/generate - Generate certificate for completed registration

const educationCertificationsGenerateSchema = z.object({
  registrationId: z.string().uuid('Invalid registrationId'),
  sendEmail: z.boolean().optional().default(false),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();
    // Validate request body
    const validation = educationCertificationsGenerateSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { registrationId, sendEmail = false } = validation.data;
      const { registrationId, sendEmail = false } = body;

      if (!registrationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'registrationId is required'
    );
      }

      // Use GET endpoint logic by redirecting
      const response = await GET(
        new NextRequest(
          new URL(
            `/api/education/certifications/generate?registrationId=${registrationId}`,
            request.url
          )
        )
      );

      if (!response.ok) {
        return response;
      }

      const certificateData = await response.json();

      // If sendEmail=true, send email notification with certificate
      if (sendEmail && certificateData.certificateUrl) {
        try {
          const { sendEmail: sendEmailFn } = await import('@/lib/email-service');
          
          // Fetch member details for email
          const [registration] = await db
            .select({
              email: members.email,
              firstName: members.firstName,
              lastName: members.lastName,
              courseName: trainingCourses.courseName,
              completionDate: courseRegistrations.completionDate,
            })
            .from(courseRegistrations)
            .innerJoin(members, eq(courseRegistrations.memberId, members.id))
            .innerJoin(trainingCourses, eq(courseRegistrations.courseId, trainingCourses.id))
            .where(eq(courseRegistrations.id, registrationId))
            .limit(1);

          if (registration?.email) {
            const emailContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Congratulations on Your Certification!</h2>
                
                <p>Dear ${registration.firstName} ${registration.lastName},</p>
                
                <p>We are pleased to inform you that you have successfully completed your training and earned your certification!</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Course:</strong> ${registration.courseName}</p>
                  <p style="margin: 5px 0;"><strong>Certificate Number:</strong> ${certificateData.certificateNumber}</p>
                  <p style="margin: 5px 0;"><strong>Completion Date:</strong> ${new Date(registration.completionDate).toLocaleDateString()}</p>
                </div>
                
                <p>Your certificate is attached to this email and can also be accessed at:</p>
                <p><a href="${certificateData.certificateUrl}" style="color: #2563eb;">Download Certificate</a></p>
                
                <p>Keep this certificate for your records and share it with pride!</p>
                
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                  Congratulations again on this achievement!
                </p>
              </div>
            `;

            await sendEmailFn({
              to: [{ 
                email: registration.email, 
                name: `${registration.firstName} ${registration.lastName}` 
              }],
              subject: `Your Training Certificate - ${registration.courseName}`,
              html: emailContent,
            });

            logger.info("Certificate email sent", { registrationId, email: registration.email });
          }
        } catch (emailError) {
          logger.error("Failed to send certificate email", { error: emailError, registrationId });
          // Don&apos;t fail the entire request if email fails
        }
      }

      return NextResponse.json(certificateData);
    } catch (error) {
      logger.error("Error generating certificate via POST", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to generate certificate',
      error
    );
    }
    })(request);
};

