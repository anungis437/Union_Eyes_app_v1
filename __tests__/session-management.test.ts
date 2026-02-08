import { describe, it, expect, beforeAll, afterAll } from "vitest";

const hasApiServer =
  process.env.RUN_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.INTEGRATION_API_BASE_URL) &&
  !(globalThis.fetch as unknown as { mock?: unknown })?.mock;
const apiBaseUrl = process.env.INTEGRATION_API_BASE_URL || "http://localhost:3000";
const describeIf = hasApiServer ? describe : describe.skip;

describeIf("Phase 1: Session Management & Attendance Tracking", () => {
  let organizationId: string;
  let courseId: string;
  let sessionId: string;
  let memberId: string;
  let registrationId: string;

  // Setup test data
  beforeAll(async () => {
    // These would come from your test database setup
    // For now, using placeholders - replace with actual test data
    organizationId = process.env.TEST_ORGANIZATION_ID || "test-org-id";
    courseId = process.env.TEST_COURSE_ID || "test-course-id";
    memberId = process.env.TEST_MEMBER_ID || "test-member-id";
  });

  describe("Session Scheduling API", () => {
    it("should create a new course session", async () => {
      const response = await fetch(`${apiBaseUrl}/api/education/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          courseId,
          sessionName: "Test Steward Training Session - Winter 2024",
          startDate: "2024-12-15",
          endDate: "2024-12-17",
          deliveryMethod: "in_person",
          venueName: "Union Hall Main Room",
          venueAddress: "123 Labor Street",
          venueCity: "San Francisco",
          venueState: "CA",
          venueZipCode: "94102",
          registrationCapacity: 30,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.session).toBeDefined();
      expect(data.session.sessionName).toBe("Test Steward Training Session - Winter 2024");
      expect(data.session.sessionStatus).toBe("scheduled");
      expect(data.session.enrolledCount).toBe(0);
      
      sessionId = data.session.id;
    });

    it("should list sessions with filters", async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions?organizationId=${organizationId}&sessionStatus=scheduled`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessions).toBeDefined();
      expect(Array.isArray(data.sessions)).toBe(true);
      expect(data.count).toBeGreaterThanOrEqual(1);
    });

    it("should update session details", async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions?id=${sessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionStatus: "registration_open",
            registrationDeadline: "2024-12-10",
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.session.sessionStatus).toBe("registration_open");
    });

    it("should list sessions by course", async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions?organizationId=${organizationId}&courseId=${courseId}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessions).toBeDefined();
      expect(data.sessions.every((s: any) => s.courseId === courseId)).toBe(true);
    });
  });

  describe("Course Registration Integration", () => {
    it("should register member for session", async () => {
      const response = await fetch(`${apiBaseUrl}/api/education/registrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          memberId,
          courseId,
          sessionId,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.registration).toBeDefined();
      expect(data.registration.sessionId).toBe(sessionId);
      expect(data.registration.registrationStatus).toBe("registered");
      
      registrationId = data.registration.id;
    });

    it("should increment enrolled count after registration", async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions?organizationId=${organizationId}&courseId=${courseId}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      const session = data.sessions.find((s: any) => s.id === sessionId);
      expect(session).toBeDefined();
      expect(session.enrolledCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Attendance Tracking API", () => {
    it("should get attendance records for session", async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions/${sessionId}/attendance`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.session).toBeDefined();
      expect(data.registrations).toBeDefined();
      expect(Array.isArray(data.registrations)).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.total).toBeGreaterThanOrEqual(1);
      expect(data.stats.attended).toBe(0); // No attendance marked yet
    });

    it("should mark single member attendance", async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions/${sessionId}/attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberId,
            attended: true,
            attendanceDate: "2024-12-15",
            attendanceHours: 8,
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain("successfully");
    });

    it("should update session attended count", async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions/${sessionId}/attendance`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.stats.attended).toBe(1);
      expect(data.session.attendedCount).toBe(1);
    });

    it("should mark bulk attendance", async () => {
      // This test assumes multiple registrations exist
      const getResponse = await fetch(
        `${apiBaseUrl}/api/education/sessions/${sessionId}/attendance`
      );
      const getData = await getResponse.json();
      const registrationIds = getData.registrations
        .filter((r: any) => !r.attended)
        .map((r: any) => r.id)
        .slice(0, 3); // Mark up to 3 members

      if (registrationIds.length > 0) {
        const response = await fetch(
          `${apiBaseUrl}/api/education/sessions/${sessionId}/attendance`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              registrationIds,
              attended: true,
              attendanceDate: "2024-12-15",
            }),
          }
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.successCount).toBe(registrationIds.length);
      }
    });

    it("should update attendance record", async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions/${sessionId}/attendance`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            registrationId,
            attendanceHours: 16, // Update to full 2-day attendance
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.registration).toBeDefined();
    });
  });

  describe("Session Status Workflow", () => {
    it("should update session to in_progress", async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions?id=${sessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionStatus: "in_progress",
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.session.sessionStatus).toBe("in_progress");
    });

    it("should update session to completed", async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions?id=${sessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionStatus: "completed",
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.session.sessionStatus).toBe("completed");
    });
  });

  describe("Session Cancellation", () => {
    it("should cancel a session", async () => {
      // Create a new session to cancel
      const createResponse = await fetch(`${apiBaseUrl}/api/education/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          courseId,
          sessionName: "Test Session to Cancel",
          startDate: "2024-12-20",
          endDate: "2024-12-21",
          deliveryMethod: "virtual_live",
          registrationCapacity: 20,
        }),
      });

      const createData = await createResponse.json();
      const cancelSessionId = createData.session.id;

      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions?id=${cancelSessionId}&reason=${encodeURIComponent("Instructor unavailable")}`,
        {
          method: "DELETE",
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain("cancelled");
      expect(data.session.sessionStatus).toBe("cancelled");
      expect(data.session.cancellationReason).toBe("Instructor unavailable");
    });
  });

  describe("Error Handling", () => {
    it("should return 400 for missing required fields", async () => {
      const response = await fetch(`${apiBaseUrl}/api/education/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          // Missing courseId, startDate, endDate
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("required");
    });

    it("should return 404 for non-existent session", async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions/non-existent-id/attendance`
      );

      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid attendance data", async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/education/sessions/${sessionId}/attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Missing required fields: registrationIds or memberId
          }),
        }
      );

      expect(response.status).toBe(400);
    });
  });

  // Cleanup
  afterAll(async () => {
    // Clean up test data if needed
    console.log("Session management tests completed");
  });
});
