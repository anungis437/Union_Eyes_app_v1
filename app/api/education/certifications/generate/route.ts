import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  courseRegistrations,
  trainingCourses,
  courseSessions,
  members,
  memberCertifications,
} from "@/db/migrations/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { put } from "@vercel/blob";
import { renderToStream } from "@react-pdf/renderer";
import {
  CertificateTemplate,
  createUnionCertificate,
} from "@/components/pdf/certificate-template";

// GET /api/education/certifications/generate?registrationId={id} - Generate certificate PDF
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registrationId");
    const download = searchParams.get("download") === "true";

    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId is required" },
        { status: 400 }
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
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
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
    // Note: members table in db/migrations/schema doesn't have memberNumber field
    const memberFullName = [registration.memberFirstName, registration.memberLastName]
      .filter(Boolean)
      .join(" ");
    const certificateData = createUnionCertificate({
      organizationName: "Union Local", // TODO: Get from organization table
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
    return NextResponse.json(
      { error: "Failed to generate certificate" },
      { status: 500 }
    );
  }
}

// POST /api/education/certifications/generate - Generate certificate for completed registration
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { registrationId, sendEmail = false } = body;

    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId is required" },
        { status: 400 }
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

    // TODO: If sendEmail=true, send email notification with certificate
    if (sendEmail) {
      logger.info("Email notification requested", { registrationId });
      // Implement email sending using Resend
    }

    return response;
  } catch (error) {
    logger.error("Error generating certificate via POST", { error });
    return NextResponse.json(
      { error: "Failed to generate certificate" },
      { status: 500 }
    );
  }
}
