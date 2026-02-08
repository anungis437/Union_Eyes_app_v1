import { describe, it, expect, beforeAll } from "vitest";

const API_BASE_URL =
  process.env.INTEGRATION_API_BASE_URL || "http://localhost:3000";
const hasApiServer =
  process.env.RUN_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.INTEGRATION_API_BASE_URL) &&
  !(globalThis.fetch as unknown as { mock?: unknown })?.mock;
const describeIf = hasApiServer ? describe : describe.skip;

// Test environment variables (set these in your test environment)
const TEST_ORGANIZATION_ID =
  process.env.TEST_ORGANIZATION_ID || "test-org-123";
const TEST_MEMBER_ID = process.env.TEST_MEMBER_ID || "test-member-123";
const TEST_COURSE_ID_1 = process.env.TEST_COURSE_ID_1 || "test-course-1";
const TEST_COURSE_ID_2 = process.env.TEST_COURSE_ID_2 || "test-course-2";

let testProgramId: string;
let testEnrollmentId: string;

describeIf("Training Programs API", () => {
  describe("Program CRUD Operations", () => {
    it("should create a new training program", async () => {
      const response = await fetch(`${API_BASE_URL}/api/education/programs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: TEST_ORGANIZATION_ID,
          programName: "Electrical Apprenticeship Test Program",
          programType: "apprenticeship",
          description: "Comprehensive electrical apprenticeship training",
          durationMonths: 48,
          totalRequiredHours: 8000,
          certificationAwarded: "Journeyman Electrician",
          apprenticeshipLevel: "level_1",
          clcApproved: true,
          requiredCourses: [TEST_COURSE_ID_1, TEST_COURSE_ID_2],
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.program).toBeDefined();
      expect(data.program.programCode).toMatch(/^PROG-APP-/);
      expect(data.program.programStatus).toBe("active");
      expect(data.program.programName).toBe(
        "Electrical Apprenticeship Test Program"
      );

      testProgramId = data.program.id;
    });

    it("should list training programs with statistics", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs?organizationId=${TEST_ORGANIZATION_ID}`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.programs).toBeInstanceOf(Array);
      expect(data.programs.length).toBeGreaterThan(0);

      const program = data.programs.find((p: any) => p.id === testProgramId);
      expect(program).toBeDefined();
      expect(program.stats).toBeDefined();
      expect(program.stats.totalEnrolled).toBeDefined();
      expect(program.stats.activeEnrolled).toBeDefined();
      expect(program.stats.completed).toBeDefined();
    });

    it("should filter programs by type", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs?organizationId=${TEST_ORGANIZATION_ID}&programType=apprenticeship`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.programs).toBeInstanceOf(Array);
      data.programs.forEach((program: any) => {
        expect(program.programType).toBe("apprenticeship");
      });
    });

    it("should update program details", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs?id=${testProgramId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Updated comprehensive electrical apprenticeship",
            totalRequiredHours: 8500,
            programCapacity: 50,
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.program.description).toBe(
        "Updated comprehensive electrical apprenticeship"
      );
      expect(data.program.totalRequiredHours).toBe(8500);
      expect(data.program.programCapacity).toBe(50);
    });
  });

  describe("Program Enrollments", () => {
    it("should enroll a member in a program", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: TEST_MEMBER_ID,
            currentLevel: "orientation",
            startDate: new Date().toISOString(),
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.enrollment).toBeDefined();
      expect(data.enrollment.programId).toBe(testProgramId);
      expect(data.enrollment.memberId).toBe(TEST_MEMBER_ID);
      expect(data.enrollment.enrollmentStatus).toBe("active");
      expect(data.enrollment.completionPercentage).toBe(0);
      expect(data.enrollment.currentLevel).toBe("orientation");

      testEnrollmentId = data.enrollment.id;
    });

    it("should prevent duplicate enrollment", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: TEST_MEMBER_ID,
            currentLevel: "level_1",
          }),
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("already enrolled");
    });

    it("should list program enrollments with progress", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments?includeProgress=true`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.enrollments).toBeInstanceOf(Array);
      expect(data.stats).toBeDefined();
      expect(data.program).toBeDefined();

      const enrollment = data.enrollments.find(
        (e: any) => e.id === testEnrollmentId
      );
      expect(enrollment).toBeDefined();
      expect(enrollment.progress).toBeDefined();
      expect(enrollment.progress.totalRequiredCourses).toBe(2);
    });

    it("should filter enrollments by status", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments?enrollmentStatus=active`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.enrollments).toBeInstanceOf(Array);
      data.enrollments.forEach((enrollment: any) => {
        expect(enrollment.enrollmentStatus).toBe("active");
      });
    });

    it("should update enrollment progress", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments?enrollmentId=${testEnrollmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentLevel: "level_1",
            completionPercentage: 25,
            hoursCompleted: 2000,
            coursesCompleted: 1,
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.enrollment.currentLevel).toBe("level_1");
      expect(data.enrollment.completionPercentage).toBe(25);
      expect(data.enrollment.hoursCompleted).toBe(2000);
      expect(data.enrollment.coursesCompleted).toBe(1);
    });

    it("should suspend enrollment", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments?enrollmentId=${testEnrollmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enrollmentStatus: "suspended",
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.enrollment.enrollmentStatus).toBe("suspended");
    });

    it("should complete enrollment", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments?enrollmentId=${testEnrollmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enrollmentStatus: "completed",
            completionPercentage: 100,
            coursesCompleted: 2,
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.enrollment.enrollmentStatus).toBe("completed");
      expect(data.enrollment.completionPercentage).toBe(100);
      expect(data.enrollment.actualCompletionDate).toBeDefined();
    });
  });

  describe("Program Statistics", () => {
    it("should calculate enrollment statistics correctly", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.stats).toBeDefined();
      expect(data.stats.total).toBeGreaterThan(0);
      expect(data.stats.completed).toBeGreaterThan(0);
      expect(
        data.stats.total >=
          data.stats.active +
            data.stats.completed +
            data.stats.suspended +
            data.stats.withdrawn
      ).toBe(true);
    });

    it("should reflect enrollment completion in program stats", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs?organizationId=${TEST_ORGANIZATION_ID}`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      const program = data.programs.find((p: any) => p.id === testProgramId);
      expect(program.stats.completed).toBeGreaterThan(0);
    });
  });

  describe("Progress Calculation", () => {
    it("should calculate completion percentage based on courses", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments?includeProgress=true`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      const enrollment = data.enrollments.find(
        (e: any) => e.id === testEnrollmentId
      );

      expect(enrollment.progress).toBeDefined();
      const expectedPercentage = Math.round(
        (enrollment.progress.coursesCompletedCount /
          enrollment.progress.totalRequiredCourses) *
          100
      );
      expect(enrollment.progress.progressPercentage).toBe(expectedPercentage);
    });

    it("should track remaining courses", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments?includeProgress=true`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      const enrollment = data.enrollments.find(
        (e: any) => e.id === testEnrollmentId
      );

      const expectedRemaining =
        enrollment.progress.totalRequiredCourses -
        enrollment.progress.coursesCompletedCount;
      expect(enrollment.progress.remainingCourses).toBe(expectedRemaining);
    });
  });

  describe("Mentor Assignment", () => {
    it("should assign mentor to enrollment", async () => {
      const mentorId = "test-mentor-123";

      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments?enrollmentId=${testEnrollmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mentorId: mentorId,
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.enrollment.mentorId).toBe(mentorId);
    });
  });

  describe("Program Capacity", () => {
    it("should prevent enrollment when program is at capacity", async () => {
      // First, set program capacity to 1
      await fetch(`${API_BASE_URL}/api/education/programs?id=${testProgramId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programCapacity: 1,
        }),
      });

      // Try to enroll another member
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: "another-member-123",
            currentLevel: "orientation",
          }),
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("capacity");
    });
  });

  describe("Program Deactivation", () => {
    it("should prevent deactivation with active enrollments", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs?id=${testProgramId}`,
        {
          method: "DELETE",
        }
      );

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toContain("active enrollment");
    });

    it("should deactivate program without active enrollments", async () => {
      // First, complete or withdraw all enrollments
      const enrollmentsResponse = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments`
      );
      const enrollmentsData = await enrollmentsResponse.json();

      for (const enrollment of enrollmentsData.enrollments) {
        if (enrollment.enrollmentStatus === "active") {
          await fetch(
            `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments?enrollmentId=${enrollment.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                enrollmentStatus: "withdrawn",
                withdrawalReason: "Test cleanup",
              }),
            }
          );
        }
      }

      // Now deactivate the program
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs?id=${testProgramId}`,
        {
          method: "DELETE",
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.program.programStatus).toBe("inactive");
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for non-existent program", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/non-existent-id/enrollments`
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });

    it("should return 400 when missing required fields", async () => {
      const response = await fetch(`${API_BASE_URL}/api/education/programs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: TEST_ORGANIZATION_ID,
          // Missing programName and programType
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it("should return 404 when updating non-existent enrollment", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments?enrollmentId=non-existent`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completionPercentage: 50,
          }),
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });

    it("should return 400 when enrolling in inactive program", async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/education/programs/${testProgramId}/enrollments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: "new-member-123",
            currentLevel: "orientation",
          }),
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("inactive");
    });
  });
});
