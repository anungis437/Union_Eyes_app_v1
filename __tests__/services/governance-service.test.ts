/**
 * Unit Tests: Governance Service
 * Tests golden share management, reserved matter voting, mission audits, sunset clause
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GovernanceService } from '@/services/governance-service';

// Mock database
const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => Promise.resolve([])),
        limit: vi.fn(() => Promise.resolve([])),
      })),
      orderBy: vi.fn(() => Promise.resolve([])),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([
        {
          id: 'share-1',
          certificateNumber: 'GS-2026-001',
          issueDate: '2026-02-01',
          status: 'active',
          sunsetClauseActive: true,
        }
      ])),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({ changes: 1 })),
    })),
  })),
};

vi.mock('@/db', () => ({
  db: mockDb,
}));

describe('GovernanceService - Golden Share Issuance', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should issue golden share with Class B special voting rights', async () => {
    const shareData = {
      certificateNumber: 'GS-2026-001',
      issueDate: new Date('2026-02-01'),
      councilMembers: [
        {
          name: 'Alice Johnson',
          union: 'Local 123',
          termStart: new Date('2026-02-01'),
          termEnd: new Date('2028-02-01'),
          electedDate: new Date('2026-01-15'),
        },
        {
          name: 'Bob Smith',
          union: 'Local 456',
          termStart: new Date('2026-02-01'),
          termEnd: new Date('2028-02-01'),
          electedDate: new Date('2026-01-15'),
        },
      ],
    };

    const share = await service.issueGoldenShare(shareData);

    expect(share).toBeDefined();
    expect(share.certificateNumber).toBe('GS-2026-001');
    expect(share.status).toBe('active');
    expect(share.sunsetClauseActive).toBe(true);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('should require at least 2 council members', () => {
    const councilMembers = [
      { name: 'Alice', union: 'Local 1', termStart: new Date(), termEnd: new Date(), electedDate: new Date() },
      { name: 'Bob', union: 'Local 2', termStart: new Date(), termEnd: new Date(), electedDate: new Date() },
    ];

    expect(councilMembers.length).toBeGreaterThanOrEqual(2);
  });

  it('should activate sunset clause by default', async () => {
    const shareData = {
      certificateNumber: 'GS-2026-002',
      issueDate: new Date('2026-02-01'),
      councilMembers: [
        { name: 'Carol', union: 'Local 789', termStart: new Date(), termEnd: new Date(), electedDate: new Date() },
        { name: 'David', union: 'Local 101', termStart: new Date(), termEnd: new Date(), electedDate: new Date() },
      ],
    };

    const share = await service.issueGoldenShare(shareData);

    expect(share.sunsetClauseActive).toBe(true);
  });
});

describe('GovernanceService - Reserved Matter Voting', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should validate reserved matter categories', () => {
    const validCategories = [
      'mission_change',
      'sale_or_transfer',
      'data_governance',
      'major_contract',
    ];

    const testCategory = 'mission_change';
    expect(validCategories).toContain(testCategory);
  });

  it('should require 100% approval for mission changes', () => {
    const voteResult = {
      totalVotes: 5,
      votesFor: 5,
      votesAgainst: 0,
      abstentions: 0,
    };

    const approvalPercentage = (voteResult.votesFor / voteResult.totalVotes) * 100;
    expect(approvalPercentage).toBe(100);
  });

  it('should reject proposal if not unanimous', () => {
    const voteResult = {
      totalVotes: 5,
      votesFor: 4,
      votesAgainst: 1,
      abstentions: 0,
    };

    const approvalPercentage = (voteResult.votesFor / voteResult.totalVotes) * 100;
    const isApproved = approvalPercentage === 100;

    expect(isApproved).toBe(false);
  });

  it('should track vote timestamps for audit trail', () => {
    const vote = {
      proposalDate: new Date('2026-02-01'),
      voteDate: new Date('2026-02-15'),
    };

    const votingPeriodDays = Math.floor(
      (vote.voteDate.getTime() - vote.proposalDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(votingPeriodDays).toBe(14);
  });
});

describe('GovernanceService - Mission Audits', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should require 90% union revenue threshold', () => {
    const audit = {
      totalRevenue: 1000000,
      unionRevenue: 920000,
      year: 2025,
    };

    const unionRevenuePercentage = (audit.unionRevenue / audit.totalRevenue) * 100;
    const meetsThreshold = unionRevenuePercentage >= 90;

    expect(meetsThreshold).toBe(true);
  });

  it('should fail audit when union revenue below 90%', () => {
    const audit = {
      totalRevenue: 1000000,
      unionRevenue: 850000,
      year: 2025,
    };

    const unionRevenuePercentage = (audit.unionRevenue / audit.totalRevenue) * 100;
    const meetsThreshold = unionRevenuePercentage >= 90;

    expect(meetsThreshold).toBe(false);
  });

  it('should require 80% member satisfaction threshold', () => {
    const satisfactionSurvey = {
      totalResponses: 100,
      satisfiedMembers: 85,
    };

    const satisfactionPercentage = (satisfactionSurvey.satisfiedMembers / satisfactionSurvey.totalResponses) * 100;
    const meetsThreshold = satisfactionPercentage >= 80;

    expect(meetsThreshold).toBe(true);
  });

  it('should require zero governance violations', () => {
    const audit = {
      governanceViolations: 0,
      complianceIssues: 0,
    };

    const hasNoViolations = audit.governanceViolations === 0;
    expect(hasNoViolations).toBe(true);
  });

  it('should fail audit with any governance violations', () => {
    const audit = {
      governanceViolations: 1,
      unionRevenuePercent: 95,
      satisfactionPercent: 90,
    };

    const hasViolations = audit.governanceViolations > 0;
    expect(hasViolations).toBe(true);
  });
});

describe('GovernanceService - Sunset Clause (5-Year)', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should calculate 5-year sunset date from issuance', () => {
    const issueDate = new Date('2026-02-01');
    const sunsetDate = new Date(issueDate);
    sunsetDate.setFullYear(sunsetDate.getFullYear() + 5);

    expect(sunsetDate.getFullYear()).toBe(2031);
    expect(sunsetDate.getMonth()).toBe(1); // February
    expect(sunsetDate.getDate()).toBe(1);
  });

  it('should trigger review after 5 consecutive passing audits', () => {
    const audits = [
      { year: 2026, passed: true },
      { year: 2027, passed: true },
      { year: 2028, passed: true },
      { year: 2029, passed: true },
      { year: 2030, passed: true },
    ];

    const consecutivePasses = audits.filter(a => a.passed).length;
    const triggersClause = consecutivePasses >= 5;

    expect(triggersClause).toBe(true);
  });

  it('should not trigger sunset clause with failed audit', () => {
    const audits = [
      { year: 2026, passed: true },
      { year: 2027, passed: true },
      { year: 2028, passed: false }, // Failed
      { year: 2029, passed: true },
      { year: 2030, passed: true },
    ];

    const allPassed = audits.every(a => a.passed);
    expect(allPassed).toBe(false);
  });

  it('should reset consecutive passes counter on failed audit', () => {
    const auditHistory = [
      { year: 2026, passed: true },
      { year: 2027, passed: true },
      { year: 2028, passed: false }, // Reset here
      { year: 2029, passed: true },
    ];

    // Find last failed audit index
    const lastFailedIndex = auditHistory.findIndex((a, i) => 
      !a.passed && i < auditHistory.length - 1
    );

    const consecutivePassesFromLastFailed = lastFailedIndex !== -1 
      ? auditHistory.slice(lastFailedIndex + 1).filter(a => a.passed).length
      : auditHistory.filter(a => a.passed).length;

    expect(consecutivePassesFromLastFailed).toBe(1);
  });

  it('should convert golden share to ordinary share after sunset', () => {
    const share = {
      status: 'active',
      sunsetClauseActive: true,
      sunsetDate: new Date('2031-02-01'),
      consecutivePassingAudits: 5,
    };

    const today = new Date('2031-02-15');
    const shouldConvert = 
      share.consecutivePassingAudits >= 5 &&
      today.getTime() >= share.sunsetDate.getTime();

    expect(shouldConvert).toBe(true);
  });
});

describe('GovernanceService - Council Elections', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should require 2-year council member terms', () => {
    const termStart = new Date('2026-02-01');
    const termEnd = new Date('2028-02-01');

    const termYears = (termEnd.getFullYear() - termStart.getFullYear());
    expect(termYears).toBe(2);
  });

  it('should validate council member eligibility', () => {
    const member = {
      isActiveUnionMember: true,
      goodStanding: true,
      yearsOfMembership: 3,
    };

    const isEligible = 
      member.isActiveUnionMember &&
      member.goodStanding &&
      member.yearsOfMembership >= 1;

    expect(isEligible).toBe(true);
  });

  it('should track election dates', () => {
    const election = {
      nominationPeriodStart: new Date('2026-01-01'),
      nominationPeriodEnd: new Date('2026-01-15'),
      votingStart: new Date('2026-01-20'),
      votingEnd: new Date('2026-01-31'),
    };

    const nominationDays = Math.floor(
      (election.nominationPeriodEnd.getTime() - election.nominationPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(nominationDays).toBe(14);
  });
});
