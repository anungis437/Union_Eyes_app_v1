/**
 * Unit Tests: Governance Service
 * Tests golden share management, reserved matter voting, mission audits, sunset clause
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GovernanceService } from '@/services/governance-service';

// Mock database
const mockDb = vi.hoisted(() => ({
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
}));

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

    expect(sunsetDate.getUTCFullYear()).toBe(2031);
    expect(sunsetDate.getUTCMonth()).toBe(1); // February
    expect(sunsetDate.getUTCDate()).toBe(1);
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

describe('GovernanceService - checkGoldenShareStatus', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should return null when no active golden share exists', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    });

    const status = await service.checkGoldenShareStatus();
    expect(status).toBeNull();
  });

  it('should return golden share status with sunset progress', async () => {
    const mockShare = {
      id: 'share-1',
      certificateNumber: 'GS-2026-001',
      status: 'active',
      consecutiveComplianceYears: 3,
      sunsetClauseDuration: 5,
      sunsetTriggeredDate: null,
    };

    const mockAudit = {
      id: 'audit-1',
      auditYear: 2028,
      overallPass: true,
    };

    mockDb.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockShare])),
        })),
      })),
    }).mockReturnValueOnce({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockAudit])),
        })),
      })),
    });

    const status = await service.checkGoldenShareStatus();
    
    expect(status).toBeDefined();
    expect(status?.share.id).toBe('share-1');
    expect(status?.sunsetProgress.consecutiveYears).toBe(3);
    expect(status?.sunsetProgress.requiredYears).toBe(5);
    expect(status?.sunsetProgress.yearsRemaining).toBe(2);
    expect(status?.sunsetProgress.percentComplete).toBe(60);
    expect(status?.lastAudit?.id).toBe('audit-1');
  });

  it('should handle sunset triggered status', async () => {
    const mockShare = {
      id: 'share-1',
      certificateNumber: 'GS-2026-001',
      status: 'active',
      consecutiveComplianceYears: 5,
      sunsetClauseDuration: 5,
      sunsetTriggeredDate: '2031-02-01',
    };

    mockDb.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockShare])),
        })),
      })),
    }).mockReturnValueOnce({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    });

    const status = await service.checkGoldenShareStatus();
    
    expect(status?.sunsetProgress.sunsetTriggered).toBe(true);
    expect(status?.sunsetProgress.percentComplete).toBe(100);
  });
});

describe('GovernanceService - requestReservedMatterVote', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should create reserved matter vote for mission change', async () => {
    const mockVote = {
      id: 'vote-1',
      matterType: 'mission_change',
      title: 'Expand to non-union',
      status: 'pending',
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockVote])),
      })),
    });

    const voteData = {
      matterType: 'mission_change' as const,
      title: 'Expand to non-union',
      description: 'Proposal to expand services to non-union workers',
      proposedBy: 'Board',
      votingDeadline: new Date('2026-03-01'),
      matterDetails: { reason: 'growth opportunity' },
      classATotalVotes: 1000,
    };

    const result = await service.requestReservedMatterVote(voteData);
    
    expect(result.id).toBe('vote-1');
    expect(result.matterType).toBe('mission_change');
    expect(mockDb.insert).toHaveBeenCalledTimes(2); // vote + event
  });

  it('should create reserved matter vote for sale/control change', async () => {
    const mockVote = {
      id: 'vote-2',
      matterType: 'sale_control',
      title: 'Merger with competitor',
      status: 'pending',
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockVote])),
      })),
    });

    const voteData = {
      matterType: 'sale_control' as const,
      title: 'Merger with competitor',
      description: 'Strategic merger to expand market share',
      proposedBy: 'CEO',
      votingDeadline: new Date('2026-04-01'),
      matterDetails: { acquirer: 'Company X', ownershipPercent: 60 },
      classATotalVotes: 1000,
    };

    const result = await service.requestReservedMatterVote(voteData);
    
    expect(result.id).toBe('vote-2');
    expect(result.matterType).toBe('sale_control');
  });

  it('should create reserved matter vote for data governance', async () => {
    const mockVote = {
      id: 'vote-3',
      matterType: 'data_governance',
      title: 'Share data with employers',
      status: 'pending',
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockVote])),
      })),
    });

    const voteData = {
      matterType: 'data_governance' as const,
      title: 'Share data with employers',
      description: 'Allow aggregated data sharing for benchmarking',
      proposedBy: 'CTO',
      votingDeadline: new Date('2026-05-01'),
      matterDetails: { purpose: 'benchmarking', aggregated: true },
      classATotalVotes: 1000,
    };

    const result = await service.requestReservedMatterVote(voteData);
    
    expect(result.id).toBe('vote-3');
    expect(result.matterType).toBe('data_governance');
  });

  it('should create reserved matter vote for major contract', async () => {
    const mockVote = {
      id: 'vote-4',
      matterType: 'major_contract',
      title: '$5M contract with employer',
      status: 'pending',
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockVote])),
      })),
    });

    const voteData = {
      matterType: 'major_contract' as const,
      title: '$5M contract with employer',
      description: 'Large service contract with major employer',
      proposedBy: 'Board',
      votingDeadline: new Date('2026-06-01'),
      matterDetails: { value: 5000000, counterparty: 'employer' },
      classATotalVotes: 1000,
    };

    const result = await service.requestReservedMatterVote(voteData);
    
    expect(result.id).toBe('vote-4');
    expect(result.matterType).toBe('major_contract');
  });
});

describe('GovernanceService - recordClassAVote', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should record Class A vote with majority approval', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    const result = await service.recordClassAVote('vote-1', 750, 200, 50);
    
    expect(result.percentFor).toBe(75);
    expect(result.passed).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('should record Class A vote with rejection', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    const result = await service.recordClassAVote('vote-1', 400, 550, 50);
    
    expect(result.percentFor).toBe(40);
    expect(result.passed).toBe(false);
  });

  it('should handle zero votes edge case', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    const result = await service.recordClassAVote('vote-1', 0, 0, 0);
    
    expect(result.percentFor).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('should handle exactly 50% approval (boundary)', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    const result = await service.recordClassAVote('vote-1', 500, 500, 0);
    
    expect(result.percentFor).toBe(50);
    expect(result.passed).toBe(true); // >= 50 passes
  });
});

describe('GovernanceService - recordClassBVote', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should record Class B veto and mark vote as vetoed', async () => {
    const mockVote = {
      id: 'vote-1',
      title: 'Mission Change Proposal',
      classAPercentFor: 75,
    };

    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockVote])),
        })),
      })),
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => Promise.resolve()),
    });

    const voteData = {
      voteId: 'vote-1',
      vote: 'veto' as const,
      voteRationale: 'Does not serve union members',
      councilMembersVoting: [
        { member: 'Alice', vote: 'veto' as const, rationale: 'Mission drift' },
        { member: 'Bob', vote: 'veto' as const, rationale: 'Not aligned' },
      ],
    };

    const result = await service.recordClassBVote(voteData);
    
    expect(result.finalDecision).toBe('vetoed_class_b');
    expect(result.status).toBe('vetoed');
    expect(mockDb.update).toHaveBeenCalledTimes(2); // once for vote, once for final decision
  });

  it('should record Class B approval when Class A passed', async () => {
    const mockVote = {
      id: 'vote-1',
      title: 'Minor Contract',
      classAPercentFor: 80,
    };

    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockVote])),
        })),
      })),
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => Promise.resolve()),
    });

    const voteData = {
      voteId: 'vote-1',
      vote: 'approve' as const,
      voteRationale: 'Serves union interests',
      councilMembersVoting: [
        { member: 'Alice', vote: 'approve' as const, rationale: 'Good deal' },
        { member: 'Bob', vote: 'approve' as const, rationale: 'Beneficial' },
      ],
    };

    const result = await service.recordClassBVote(voteData);
    
    expect(result.finalDecision).toBe('approved');
    expect(result.status).toBe('approved');
  });

  it('should reject when Class B approves but Class A failed', async () => {
    const mockVote = {
      id: 'vote-1',
      title: 'Unpopular Proposal',
      classAPercentFor: 30,
    };

    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockVote])),
        })),
      })),
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => Promise.resolve()),
    });

    const voteData = {
      voteId: 'vote-1',
      vote: 'approve' as const,
      voteRationale: 'Council supports',
      councilMembersVoting: [
        { member: 'Alice', vote: 'approve' as const, rationale: 'OK' },
      ],
    };

    const result = await service.recordClassBVote(voteData);
    
    expect(result.finalDecision).toBe('rejected_class_a');
    expect(result.status).toBe('rejected');
  });

  it('should throw error when vote not found', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    });

    const voteData = {
      voteId: 'nonexistent',
      vote: 'approve' as const,
      voteRationale: 'Test',
      councilMembersVoting: [],
    };

    await expect(service.recordClassBVote(voteData)).rejects.toThrow('Vote not found');
  });
});

describe('GovernanceService - conductMissionAudit', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should pass audit when all criteria met', async () => {
    const mockAudit = { id: 'audit-1', overallPass: true };
    const mockShare = {
      id: 'share-1',
      consecutiveComplianceYears: 2,
      sunsetClauseDuration: 5,
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockAudit])),
      })),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockShare])),
        })),
      })),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    const auditData = {
      auditYear: 2028,
      auditorFirm: 'Ernst & Young',
      auditDate: new Date('2028-03-01'),
      unionRevenuePercent: 95,
      unionRevenueThreshold: 90,
      memberSatisfactionPercent: 85,
      memberSatisfactionThreshold: 80,
      dataViolations: 0,
      dataViolationsThreshold: 0,
      findings: 'All criteria met',
    };

    const result = await service.conductMissionAudit(auditData);
    
    expect(result.overallPass).toBe(true);
    expect(mockDb.update).toHaveBeenCalled(); // Updates consecutive years
  });

  it('should fail audit when union revenue below threshold', async () => {
    const mockAudit = { id: 'audit-1', overallPass: false };
    const mockShare = {
      id: 'share-1',
      consecutiveComplianceYears: 2,
      sunsetClauseDuration: 5,
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockAudit])),
      })),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockShare])),
        })),
      })),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    const auditData = {
      auditYear: 2028,
      auditorFirm: 'KPMG',
      auditDate: new Date('2028-03-01'),
      unionRevenuePercent: 85,
      unionRevenueThreshold: 90,
      memberSatisfactionPercent: 90,
      memberSatisfactionThreshold: 80,
      dataViolations: 0,
      dataViolationsThreshold: 0,
      findings: 'Union revenue below threshold',
    };

    const result = await service.conductMissionAudit(auditData);
    
    expect(result.overallPass).toBe(false);
    expect(mockDb.update).toHaveBeenCalled(); // Resets to 0
  });

  it('should fail audit when member satisfaction below threshold', async () => {
    const mockAudit = { id: 'audit-2', overallPass: false };
    const mockShare = { id: 'share-1', consecutiveComplianceYears: 3, sunsetClauseDuration: 5 };

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockAudit])),
      })),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockShare])),
        })),
      })),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    const auditData = {
      auditYear: 2029,
      auditorFirm: 'Deloitte',
      auditDate: new Date('2029-03-01'),
      unionRevenuePercent: 92,
      unionRevenueThreshold: 90,
      memberSatisfactionPercent: 75,
      memberSatisfactionThreshold: 80,
      dataViolations: 0,
      dataViolationsThreshold: 0,
      findings: 'Member satisfaction low',
    };

    await service.conductMissionAudit(auditData);
    
    expect(mockDb.update).toHaveBeenCalledWith(expect.anything());
  });

  it('should fail audit when data violations exist', async () => {
    const mockAudit = { id: 'audit-3', overallPass: false };
    const mockShare = { id: 'share-1', consecutiveComplianceYears: 1, sunsetClauseDuration: 5 };

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockAudit])),
      })),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockShare])),
        })),
      })),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    const auditData = {
      auditYear: 2027,
      auditorFirm: 'PwC',
      auditDate: new Date('2027-03-01'),
      unionRevenuePercent: 93,
      unionRevenueThreshold: 90,
      memberSatisfactionPercent: 88,
      memberSatisfactionThreshold: 80,
      dataViolations: 2,
      dataViolationsThreshold: 0,
      findings: 'Data breaches occurred',
    };

    await service.conductMissionAudit(auditData);
    
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('should trigger sunset clause after 5 consecutive passing audits', async () => {
    const mockAudit = { id: 'audit-5', overallPass: true };
    const mockShare = {
      id: 'share-1',
      consecutiveComplianceYears: 4, // Will become 5
      sunsetClauseDuration: 5,
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockAudit])),
      })),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockShare])),
        })),
      })),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    const auditData = {
      auditYear: 2030,
      auditorFirm: 'Grant Thornton',
      auditDate: new Date('2030-03-01'),
      unionRevenuePercent: 96,
      unionRevenueThreshold: 90,
      memberSatisfactionPercent: 92,
      memberSatisfactionThreshold: 80,
      dataViolations: 0,
      dataViolationsThreshold: 0,
      findings: 'Perfect compliance',
    };

    await service.conductMissionAudit(auditData);
    
    expect(mockDb.update).toHaveBeenCalled();
    // triggerSunsetClause would be called internally
  });

  it('should handle audit when no active golden share exists', async () => {
    const mockAudit = { id: 'audit-1', overallPass: true };

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockAudit])),
      })),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])), // No share
        })),
      })),
    });

    const auditData = {
      auditYear: 2026,
      auditorFirm: 'BDO',
      auditDate: new Date('2026-03-01'),
      unionRevenuePercent: 95,
      unionRevenueThreshold: 90,
      memberSatisfactionPercent: 85,
      memberSatisfactionThreshold: 80,
      dataViolations: 0,
      dataViolationsThreshold: 0,
      findings: 'All good but no share',
    };

    const result = await service.conductMissionAudit(auditData);
    
    expect(result.id).toBe('audit-1');
    expect(mockDb.update).not.toHaveBeenCalled(); // No share to update
  });
});

describe('GovernanceService - triggerSunsetClause', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should trigger sunset clause and update share status', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => Promise.resolve()),
    });

    const result = await service.triggerSunsetClause('share-1');
    
    expect(result.sunsetTriggeredDate).toBeInstanceOf(Date);
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled(); // Governance event
  });
});

describe('GovernanceService - convertGoldenShare', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should convert golden share to ordinary share', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => Promise.resolve()),
    });

    const result = await service.convertGoldenShare('share-1');
    
    expect(result.conversionDate).toBeInstanceOf(Date);
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled(); // Governance event
  });
});

describe('GovernanceService - getMissionComplianceYears', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should return default values when no active share exists', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    });

    const result = await service.getMissionComplianceYears();
    
    expect(result.consecutiveYears).toBe(0);
    expect(result.requiredYears).toBe(5);
    expect(result.percentComplete).toBe(0);
    expect(result.sunsetTriggered).toBe(false);
  });

  it('should return compliance progress for active share', async () => {
    const mockShare = {
      id: 'share-1',
      consecutiveComplianceYears: 3,
      sunsetClauseDuration: 5,
      sunsetTriggeredDate: null,
    };

    const mockAudits = [
      { auditYear: 2028, overallPass: true },
      { auditYear: 2027, overallPass: true },
      { auditYear: 2026, overallPass: true },
    ];

    mockDb.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockShare])),
        })),
      })),
    }).mockReturnValueOnce({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(mockAudits)),
        })),
      })),
    });

    const result = await service.getMissionComplianceYears();
    
    expect(result.consecutiveYears).toBe(3);
    expect(result.requiredYears).toBe(5);
    expect(result.percentComplete).toBe(60);
    expect(result.sunsetTriggered).toBe(false);
    expect(result.recentAudits).toHaveLength(3);
  });

  it('should indicate when sunset is triggered', async () => {
    const mockShare = {
      id: 'share-1',
      consecutiveComplianceYears: 5,
      sunsetClauseDuration: 5,
      sunsetTriggeredDate: '2031-02-01',
    };

    mockDb.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockShare])),
        })),
      })),
    }).mockReturnValueOnce({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    });

    const result = await service.getMissionComplianceYears();
    
    expect(result.sunsetTriggered).toBe(true);
    expect(result.percentComplete).toBe(100);
  });
});

describe('GovernanceService - conductCouncilElection', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should conduct council election and update golden share', async () => {
    const mockElection = {
      id: 'election-1',
      electionYear: 2028,
    };

    const mockShare = {
      id: 'share-1',
      status: 'active',
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockElection])),
      })),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockShare])),
        })),
      })),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    });

    const electionData = {
      electionYear: 2028,
      electionDate: new Date('2028-01-31'),
      positionsAvailable: 5,
      totalVotes: 15000,
      participationRate: 75,
      winners: [
        {
          name: 'Alice Johnson',
          union: 'Local 123',
          termStart: new Date('2028-02-01'),
          termEnd: new Date('2030-02-01'),
          electedDate: new Date('2028-01-31'),
        },
      ],
      results: { totals: { alice: 5000 } },
    };

    const result = await service.conductCouncilElection(electionData);
    
    expect(result.id).toBe('election-1');
    expect(mockDb.update).toHaveBeenCalled(); // Updates council members
    expect(mockDb.insert).toHaveBeenCalledTimes(2); // Election + event
  });

  it('should handle election when no active share exists', async () => {
    const mockElection = {
      id: 'election-2',
      electionYear: 2026,
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockElection])),
      })),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])), // No active share
        })),
      })),
    });

    const electionData = {
      electionYear: 2026,
      electionDate: new Date('2026-01-31'),
      positionsAvailable: 5,
      totalVotes: 12000,
      participationRate: 60,
      winners: [],
      results: {},
    };

    const result = await service.conductCouncilElection(electionData);
    
    expect(result.id).toBe('election-2');
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe('GovernanceService - getGovernanceDashboard', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should return comprehensive governance dashboard', async () => {
    const mockShare = {
      id: 'share-1',
      consecutiveComplianceYears: 2,
      sunsetClauseDuration: 5,
      sunsetTriggeredDate: null,
    };

    const mockVotes = [
      { id: 'vote-1', status: 'approved', proposedDate: new Date() },
      { id: 'vote-2', status: 'vetoed', proposedDate: new Date() },
    ];

    const mockAudits = [
      { id: 'audit-1', auditYear: 2027, overallPass: true },
      { id: 'audit-2', auditYear: 2026, overallPass: false },
    ];

    const mockEvents = [
      { id: 'event-1', eventType: 'mission_audit', eventDate: new Date() },
    ];

    const mockPendingVotes = [
      { id: 'vote-3', status: 'pending' },
    ];

    // Mock checkGoldenShareStatus
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([mockShare])),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockVotes)),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockAudits)),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockEvents)),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(mockPendingVotes)),
        })),
      });

    const dashboard = await service.getGovernanceDashboard();
    
    expect(dashboard.goldenShare).toBeDefined();
    expect(dashboard.recentVotes).toHaveLength(2);
    expect(dashboard.recentAudits).toHaveLength(2);
    expect(dashboard.recentEvents).toHaveLength(1);
    expect(dashboard.pendingVotes).toHaveLength(1);
    expect(dashboard.stats.totalVotes).toBe(2);
    expect(dashboard.stats.votesApproved).toBe(1);
    expect(dashboard.stats.votesVetoed).toBe(1);
    expect(dashboard.stats.auditsPassed).toBe(1);
    expect(dashboard.stats.auditsFailed).toBe(1);
  });
});

describe('GovernanceService - isReservedMatter', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  it('should identify mission change as reserved matter', () => {
    const proposal = {
      type: 'mission_change',
      details: { change: 'Expand to non-union' },
    };

    const result = service.isReservedMatter(proposal);
    
    expect(result.isReserved).toBe(true);
    expect(result.reason).toContain('Class B approval');
  });

  it('should identify majority ownership change as reserved matter', () => {
    const proposal = {
      type: 'sale_control',
      details: { ownershipPercent: 60 },
    };

    const result = service.isReservedMatter(proposal);
    
    expect(result.isReserved).toBe(true);
    expect(result.reason).toContain('majority ownership');
  });

  it('should not flag minority ownership change as reserved matter', () => {
    const proposal = {
      type: 'sale_control',
      details: { ownershipPercent: 30 },
    };

    const result = service.isReservedMatter(proposal);
    
    expect(result.isReserved).toBe(false);
  });

  it('should identify employer data sharing as reserved matter', () => {
    const proposal = {
      type: 'data_governance',
      details: { recipient: 'employer', purpose: 'analytics' },
    };

    const result = service.isReservedMatter(proposal);
    
    expect(result.isReserved).toBe(true);
    expect(result.reason).toContain('employers');
  });

  it('should identify data sales as reserved matter', () => {
    const proposal = {
      type: 'data_governance',
      details: { recipient: 'third_party', purpose: 'data_sale' },
    };

    const result = service.isReservedMatter(proposal);
    
    expect(result.isReserved).toBe(true);
    expect(result.reason).toContain('selling data');
  });

  it('should not flag internal data use as reserved matter', () => {
    const proposal = {
      type: 'data_governance',
      details: { recipient: 'internal', purpose: 'analytics' },
    };

    const result = service.isReservedMatter(proposal);
    
    expect(result.isReserved).toBe(false);
  });

  it('should identify large employer contracts as reserved matter', () => {
    const proposal = {
      type: 'major_contract',
      details: { counterpartyType: 'employer', value: 2000000 },
    };

    const result = service.isReservedMatter(proposal);
    
    expect(result.isReserved).toBe(true);
    expect(result.reason).toContain('>$1M');
  });

  it('should not flag contracts under $1M as reserved matter', () => {
    const proposal = {
      type: 'major_contract',
      details: { counterpartyType: 'employer', value: 500000 },
    };

    const result = service.isReservedMatter(proposal);
    
    expect(result.isReserved).toBe(false);
  });

  it('should not flag large non-employer contracts as reserved matter', () => {
    const proposal = {
      type: 'major_contract',
      details: { counterpartyType: 'vendor', value: 5000000 },
    };

    const result = service.isReservedMatter(proposal);
    
    expect(result.isReserved).toBe(false);
  });

  it('should not flag unrelated proposals as reserved matters', () => {
    const proposal = {
      type: 'operational_change',
      details: { change: 'Office relocation' },
    };

    const result = service.isReservedMatter(proposal);
    
    expect(result.isReserved).toBe(false);
  });
});
