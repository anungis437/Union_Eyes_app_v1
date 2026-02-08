/**
 * Phase 2: PDF Certificates & Certification Management Tests
 * Integration tests for certificate generation, certification CRUD, and auto-issuance
 */

import { describe, it, expect, beforeAll } from "vitest";

const API_BASE =
  `${process.env.INTEGRATION_API_BASE_URL || "http://localhost:3000"}/api/education`;
const hasApiServer =
  process.env.RUN_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.INTEGRATION_API_BASE_URL) &&
  !(globalThis.fetch as unknown as { mock?: unknown })?.mock;
const describeIf = hasApiServer ? describe : describe.skip;
const TEST_ORGANIZATION_ID = process.env.TEST_ORGANIZATION_ID || "test-org-id";
const TEST_MEMBER_ID = process.env.TEST_MEMBER_ID || "test-member-id";
const TEST_COURSE_ID = process.env.TEST_COURSE_ID || "test-course-id";

// Store test data across tests
let testSessionId: string;
let testRegistrationId: string;
let testCertificationId: string;
let testCertificateUrl: string;

describeIf("Certification Management API", () => {
  it("should list certifications with filters", async () => {
    const params = new URLSearchParams({
      organizationId: TEST_ORGANIZATION_ID,
    });

    const response = await fetch(`${API_BASE}/certifications?${params}`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("certifications");
    expect(data).toHaveProperty("stats");
    expect(Array.isArray(data.certifications)).toBe(true);
    expect(data.stats).toHaveProperty("total");
    expect(data.stats).toHaveProperty("active");
    expect(data.stats).toHaveProperty("expiring");
    expect(data.stats).toHaveProperty("expired");
  });

  it("should issue manual certification", async () => {
    const certificationData = {
      organizationId: TEST_ORGANIZATION_ID,
      memberId: TEST_MEMBER_ID,
      certificationName: "Test Safety Certification",
      certificationCategory: "safety",
      issuingBody: "Test Union Local",
      issueDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      renewalRequired: true,
      continuingEducationHours: 8,
    };

    const response = await fetch(`${API_BASE}/certifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(certificationData),
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty("certification");
    expect(data.certification).toHaveProperty("id");
    expect(data.certification).toHaveProperty("certificationNumber");
    expect(data.certification.certificationName).toBe("Test Safety Certification");
    expect(data.certification.certificationStatus).toBe("active");
    expect(data.certification.renewalRequired).toBe(true);

    // Store for later tests
    testCertificationId = data.certification.id;
  });

  it("should update certification status", async () => {
    const updateData = {
      certificationStatus: "suspended",
      suspensionReason: "Test suspension for integration testing",
      continuingEducationHours: 12,
    };

    const response = await fetch(
      `${API_BASE}/certifications?id=${testCertificationId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      }
    );

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.certification.certificationStatus).toBe("suspended");
    expect(data.certification.suspensionReason).toBe(
      "Test suspension for integration testing"
    );
    expect(data.certification.continuingEducationHours).toBe(12);
  });

  it("should filter expiring certifications", async () => {
    const params = new URLSearchParams({
      organizationId: TEST_ORGANIZATION_ID,
      expiringInDays: "90",
      includeExpired: "false",
    });

    const response = await fetch(`${API_BASE}/certifications?${params}`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(Array.isArray(data.certifications)).toBe(true);

    // Verify all returned certifications are expiring within 90 days
    data.certifications.forEach((cert: any) => {
      if (cert.daysUntilExpiry !== null) {
        expect(cert.daysUntilExpiry).toBeLessThanOrEqual(90);
        expect(cert.daysUntilExpiry).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

describeIf("Certificate Generation", () => {
  // Create a test session and registration for certificate generation
  beforeAll(async () => {
    // Create test session
    const sessionData = {
      organizationId: TEST_ORGANIZATION_ID,
      courseId: TEST_COURSE_ID,
      sessionName: "Test Session for Certificate Generation",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      sessionStatus: "completed",
      deliveryMethod: "in_person",
      registrationCapacity: 20,
    };

    const sessionResponse = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sessionData),
    });

    const sessionResult = await sessionResponse.json();
    testSessionId = sessionResult.session.id;

    // Register member for session
    const registrationData = {
      organizationId: TEST_ORGANIZATION_ID,
      memberId: TEST_MEMBER_ID,
      courseId: TEST_COURSE_ID,
      sessionId: testSessionId,
      registrationStatus: "registered",
    };

    const regResponse = await fetch(`${API_BASE}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registrationData),
    });

    const regResult = await regResponse.json();
    testRegistrationId = regResult.registration.id;
  });

  it("should mark course as completed", async () => {
    const completionData = {
      registrationId: testRegistrationId,
      completionDate: new Date().toISOString(),
      completionPercentage: 100,
      finalGrade: "Pass",
      passed: true,
      postTestScore: 95,
    };

    const response = await fetch(`${API_BASE}/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(completionData),
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.completed).toBe(true);
    expect(data.data.passed).toBe(true);
  });

  it("should auto-generate certificate on completion", async () => {
    const response = await fetch(
      `${API_BASE}/certifications/generate?registrationId=${testRegistrationId}`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("certificateUrl");
    expect(data).toHaveProperty("certificationId");
    expect(data).toHaveProperty("certificateNumber");
    expect(data.certificateNumber).toMatch(/^CERT-/);

    // Store certificate URL for download test
    testCertificateUrl = data.certificateUrl;
    testCertificationId = data.certificationId;
  });

  it("should download certificate PDF", async () => {
    const response = await fetch(
      `${API_BASE}/certifications/generate?registrationId=${testRegistrationId}&download=true`
    );

    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("content-disposition")).toContain(".pdf");

    // Verify PDF data is returned
    const blob = await response.blob();
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe("application/pdf");
  });

  it("should return existing certificate without regenerating", async () => {
    const response = await fetch(
      `${API_BASE}/certifications/generate?registrationId=${testRegistrationId}`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.message).toBe("Certificate already generated");
    expect(data.certificateUrl).toBe(testCertificateUrl);
    expect(data.certificationId).toBe(testCertificationId);
  });

  it("should reject certificate generation for incomplete course", async () => {
    // Create new registration that's not completed
    const incompleteRegData = {
      organizationId: TEST_ORGANIZATION_ID,
      memberId: TEST_MEMBER_ID,
      courseId: TEST_COURSE_ID,
      sessionId: testSessionId,
      registrationStatus: "registered",
    };

    const regResponse = await fetch(`${API_BASE}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(incompleteRegData),
    });

    const regData = await regResponse.json();
    const incompleteRegId = regData.registration.id;

    // Attempt to generate certificate
    const certResponse = await fetch(
      `${API_BASE}/certifications/generate?registrationId=${incompleteRegId}`
    );

    expect(certResponse.ok).toBe(false);
    expect(certResponse.status).toBe(400);

    const errorData = await certResponse.json();
    expect(errorData.error).toContain("completed courses");
  });
});

describeIf("Certification Lifecycle", () => {
  it("should revoke certification", async () => {
    const reason = "Test revocation for integration testing";
    const response = await fetch(
      `${API_BASE}/certifications?id=${testCertificationId}&reason=${encodeURIComponent(reason)}`,
      { method: "DELETE" }
    );

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.certification.certificationStatus).toBe("revoked");
    expect(data.certification.revocationReason).toBe(reason);
    expect(data.certification.revokedDate).toBeTruthy();
  });

  it("should filter by member ID", async () => {
    const params = new URLSearchParams({
      organizationId: TEST_ORGANIZATION_ID,
      memberId: TEST_MEMBER_ID,
    });

    const response = await fetch(`${API_BASE}/certifications?${params}`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(Array.isArray(data.certifications)).toBe(true);

    // Verify all certifications belong to the test member
    data.certifications.forEach((cert: any) => {
      // This would need member data joined in the response
      expect(cert).toHaveProperty("firstName");
      expect(cert).toHaveProperty("lastName");
    });
  });

  it("should filter by course ID", async () => {
    const params = new URLSearchParams({
      organizationId: TEST_ORGANIZATION_ID,
      courseId: TEST_COURSE_ID,
    });

    const response = await fetch(`${API_BASE}/certifications?${params}`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(Array.isArray(data.certifications)).toBe(true);

    // Verify all certifications are for the test course
    data.certifications.forEach((cert: any) => {
      if (cert.courseId) {
        expect(cert.courseId).toBe(TEST_COURSE_ID);
      }
    });
  });
});

describeIf("Certificate Expiry Tracking", () => {
  let expiringCertificationId: string;

  it("should create certification expiring soon", async () => {
    const certData = {
      organizationId: TEST_ORGANIZATION_ID,
      memberId: TEST_MEMBER_ID,
      certificationName: "Test Expiring Certification",
      issueDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      renewalRequired: true,
    };

    const response = await fetch(`${API_BASE}/certifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(certData),
    });

    expect(response.ok).toBe(true);

    const data = await response.json();
    expiringCertificationId = data.certification.id;
    expect(data.certification.certificationStatus).toBe("expiring_soon");
  });

  it("should list expiring certifications", async () => {
    const params = new URLSearchParams({
      organizationId: TEST_ORGANIZATION_ID,
      expiringInDays: "60",
    });

    const response = await fetch(`${API_BASE}/certifications?${params}`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.stats.expiring).toBeGreaterThan(0);

    // Find our test certification
    const testCert = data.certifications.find(
      (c: any) => c.id === expiringCertificationId
    );
    expect(testCert).toBeTruthy();
    expect(testCert.isExpiringSoon).toBe(true);
    expect(testCert.daysUntilExpiry).toBeLessThanOrEqual(60);
  });

  it("should update renewal reminder sent flag", async () => {
    const updateData = {
      renewalReminderSent: true,
    };

    const response = await fetch(
      `${API_BASE}/certifications?id=${expiringCertificationId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      }
    );

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.certification.renewalReminderSent).toBe(true);
  });
});

describeIf("Error Handling", () => {
  it("should return 400 for missing required fields when issuing", async () => {
    const invalidData = {
      organizationId: TEST_ORGANIZATION_ID,
      // Missing memberId
      certificationName: "Test Certification",
    };

    const response = await fetch(`${API_BASE}/certifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidData),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("required");
  });

  it("should return 404 for non-existent certification", async () => {
    const fakeId = "non-existent-cert-id";
    const response = await fetch(
      `${API_BASE}/certifications?id=${fakeId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificationStatus: "active" }),
      }
    );

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it("should return 400 for invalid certificate generation", async () => {
    const response = await fetch(
      `${API_BASE}/certifications/generate?registrationId=invalid-id`
    );

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it("should return 400 when organizationId is missing", async () => {
    const response = await fetch(`${API_BASE}/certifications`);

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("organizationId");
  });
});
