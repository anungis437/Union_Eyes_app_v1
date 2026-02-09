import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getDashboard } from "@/app/api/governance/dashboard/route";
import { GET as getGoldenShare, POST as postGoldenShare } from "@/app/api/governance/golden-share/route";
import { POST as postReservedMatter } from "@/app/api/governance/reserved-matters/route";
import { PATCH as patchClassA } from "@/app/api/governance/reserved-matters/[id]/route";
import { POST as postClassB } from "@/app/api/governance/reserved-matters/[id]/class-b-vote/route";

const mockGovernanceService = vi.hoisted(() => ({
  getGovernanceDashboard: vi.fn(),
  checkGoldenShareStatus: vi.fn(),
  issueGoldenShare: vi.fn(),
  requestReservedMatterVote: vi.fn(),
  recordClassAVote: vi.fn(),
  recordClassBVote: vi.fn(),
  conductMissionAudit: vi.fn(),
  conductCouncilElection: vi.fn(),
}));

vi.mock("@/services/governance-service", () => ({
  governanceService: mockGovernanceService,
}));

type EnhancedHandler = (
  request: NextRequest,
  context: { userId: string; organizationId: string; role: string; roleLevel: number },
  routeParams?: { params?: Record<string, string> }
) => Promise<Response> | Response;

vi.mock("@/lib/api-auth-guard", () => ({
  withEnhancedRoleAuth: (_minLevel: number, handler: EnhancedHandler) => {
    return async (request: NextRequest, routeParams?: { params?: Record<string, string> }) => {
      const mockContext = {
        userId: "user-123",
        organizationId: "org-123",
        role: "admin",
        roleLevel: 100,
      };
      return handler(request, mockContext, routeParams);
    };
  },
}));

vi.mock("@/lib/middleware/api-security", () => ({
  logApiAuditEvent: vi.fn(),
}));

describe("Governance API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/governance/dashboard returns dashboard", async () => {
    mockGovernanceService.getGovernanceDashboard.mockResolvedValue({
      recentVotes: [],
      pendingVotes: [],
      recentAudits: [],
      recentEvents: [],
      stats: { totalVotes: 0, votesApproved: 0, votesVetoed: 0, auditsPassed: 0, auditsFailed: 0 },
    });

    const request = new NextRequest("http://localhost/api/governance/dashboard");
    const response = await getDashboard(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("GET /api/governance/golden-share returns current status", async () => {
    mockGovernanceService.checkGoldenShareStatus.mockResolvedValue({ share: null });

    const request = new NextRequest("http://localhost/api/governance/golden-share");
    const response = await getGoldenShare(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("POST /api/governance/golden-share issues share", async () => {
    mockGovernanceService.issueGoldenShare.mockResolvedValue({ id: "share-1" });

    const request = new NextRequest("http://localhost/api/governance/golden-share", {
      method: "POST",
      body: JSON.stringify({
        certificateNumber: "GS-2026-001",
        issueDate: "2026-02-01",
        councilMembers: [
          {
            name: "Alice",
            union: "Local 1",
            termStart: "2026-02-01",
            termEnd: "2028-02-01",
            electedDate: "2026-01-15",
          },
          {
            name: "Bob",
            union: "Local 2",
            termStart: "2026-02-01",
            termEnd: "2028-02-01",
            electedDate: "2026-01-15",
          },
        ],
      }),
    });

    const response = await postGoldenShare(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(mockGovernanceService.issueGoldenShare).toHaveBeenCalled();
  });

  it("POST /api/governance/reserved-matters validates body", async () => {
    const request = new NextRequest("http://localhost/api/governance/reserved-matters", {
      method: "POST",
      body: JSON.stringify({ title: "Missing fields" }),
    });

    const response = await postReservedMatter(request);
    expect(response.status).toBe(400);
  });

  it("POST /api/governance/reserved-matters creates record", async () => {
    mockGovernanceService.requestReservedMatterVote.mockResolvedValue({ id: "vote-1" });

    const request = new NextRequest("http://localhost/api/governance/reserved-matters", {
      method: "POST",
      body: JSON.stringify({
        matterType: "mission_change",
        title: "Mission Update",
        description: "Update mission statement",
        proposedBy: "Board",
        votingDeadline: "2026-03-01T10:00",
        classATotalVotes: 10,
        matterDetails: { rationale: "Union focus" },
      }),
    });

    const response = await postReservedMatter(request);
    expect(response.status).toBe(201);
  });

  it("PATCH /api/governance/reserved-matters/[id] records Class A vote", async () => {
    mockGovernanceService.recordClassAVote.mockResolvedValue({ percentFor: 60, passed: true });

    const request = new NextRequest("http://localhost/api/governance/reserved-matters/vote-1", {
      method: "PATCH",
      body: JSON.stringify({ votesFor: 6, votesAgainst: 4, abstain: 0 }),
    });

    const response = await patchClassA(request, { params: { id: "vote-1" } });
    expect(response.status).toBe(200);
  });

  it("POST /api/governance/reserved-matters/[id]/class-b-vote records council vote", async () => {
    mockGovernanceService.recordClassBVote.mockResolvedValue({ finalDecision: "approved" });

    const request = new NextRequest(
      "http://localhost/api/governance/reserved-matters/vote-1/class-b-vote",
      {
        method: "POST",
        body: JSON.stringify({
          vote: "approve",
          voteRationale: "Mission aligned",
          councilMembersVoting: [{ member: "Alice", vote: "approve", rationale: "OK" }],
        }),
      }
    );

    const response = await postClassB(request, { params: { id: "vote-1" } });
    expect(response.status).toBe(200);
  });
});
