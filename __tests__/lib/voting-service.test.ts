/**
 * Voting Service Tests
 * 
 * Tests for comprehensive voting system including:
 * - Voting session management (CRUD)
 * - Voting options (add, update, delete)
 * - Voter eligibility management
 * - Vote casting and verification
 * - Results calculation (standard and ranked choice)
 * - Proxy voting
 * - Session statistics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getVotingSessionById,
  listVotingSessions,
  createVotingSession,
  updateVotingSession,
  deleteVotingSession,
  addVotingOption,
  updateVotingOption,
  deleteVotingOption,
  addVoterEligibility,
  checkVoterEligibility,
  castVote,
  hasVoted,
  calculateResults,
  type NewVotingSession,
  type VotingSession,
} from '@/lib/services/voting-service';

// Mock database
vi.mock('@/db/db', () => ({
  db: {
    query: {
      votingSessions: {
        findFirst: vi.fn(),
      },
      votes: {
        findFirst: vi.fn(),
      },
      voterEligibility: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({ rowCount: 0 })),
    })),
  },
}));

vi.mock('@/db/schema', () => ({
  votingSessions: {
    id: 'id',
    title: 'title',
    organizationId: 'organizationId',
    status: 'status',
    _: { name: 'voting_sessions' },
  },
  votingOptions: {
    id: 'id',
    sessionId: 'sessionId',
    text: 'text',
    _: { name: 'voting_options' },
  },
  votes: {
    id: 'id',
    sessionId: 'sessionId',
    voterId: 'voterId',
    _: { name: 'votes' },
  },
  voterEligibility: {
    id: 'id',
    sessionId: 'sessionId',
    memberId: 'memberId',
    _: { name: 'voter_eligibility' },
  },
  votingNotifications: {
    id: 'id',
    _: { name: 'voting_notifications' },
  },
}));

vi.mock('@/lib/config/env-validation', () => ({
  env: {
    VOTING_SECRET: 'x'.repeat(32),
  },
  validateEnvironment: vi.fn(),
}));

// Mock crypto service
vi.mock('@/lib/services/voting-crypto-service', () => ({
  deriveVotingSessionKey: vi.fn().mockReturnValue(Buffer.from('x'.repeat(32))),
  signVote: vi.fn().mockResolvedValue('mock-signature'),
  verifyVoteSignature: vi.fn().mockResolvedValue(true),
  generateVoteReceipt: vi.fn().mockResolvedValue('mock-receipt'),
  createVotingAuditLog: vi.fn().mockResolvedValue(undefined),
  verifyElectionIntegrity: vi.fn().mockResolvedValue({ valid: true }),
}));

// Import after mocks
import { db } from '@/db/db';

describe('Voting Service - Session Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVotingSessionById()', () => {
    it('should get voting session by ID', async () => {
      const mockSession: VotingSession = {
        id: 'session-123',
        title: 'Board Election 2024',
        organizationId: 'org-1',
        description: 'Annual board election',
        status: 'active',
        votingType: 'single-choice',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-22'),
        quorumRequired: 50,
        anonymousVoting: true,
        allowProxyVoting: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as VotingSession;

      (db.query.votingSessions.findFirst as any).mockResolvedValue(mockSession);

      const result = await getVotingSessionById('session-123');

      expect(result).toEqual(mockSession);
      expect(db.query.votingSessions.findFirst).toHaveBeenCalled();
    });

    it('should return null if session not found', async () => {
      (db.query.votingSessions.findFirst as any).mockResolvedValue(null);

      const result = await getVotingSessionById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      (db.query.votingSessions.findFirst as any).mockRejectedValue(
        new Error('DB error')
      );

      await expect(getVotingSessionById('session-123')).rejects.toThrow(
        'Failed to fetch voting session'
      );
    });
  });

  describe('createVotingSession()', () => {
    it('should create a new voting session', async () => {
      const newSession: NewVotingSession = {
        title: 'Board Election 2024',
        organizationId: 'org-1',
        description: 'Annual board election',
        status: 'draft',
        votingType: 'single-choice',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-22'),
        quorumRequired: 50,
      };

      const createdSession: VotingSession = {
        ...newSession,
        id: 'session-123',
        anonymousVoting: true,
        allowProxyVoting: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as VotingSession;

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdSession]),
        }),
      });
      (db.insert as any) = mockInsert;

      const result = await createVotingSession(newSession);

      expect(result).toEqual(createdSession);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('updateVotingSession()', () => {
    it('should update voting session', async () => {
      const updates = { title: 'Updated Title', status: 'active' };
      const updatedSession: VotingSession = {
        id: 'session-123',
        title: 'Updated Title',
        status: 'active',
      } as VotingSession;

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedSession]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await updateVotingSession('session-123', updates);

      expect(result).toEqual(updatedSession);
    });

    it('should return null if session not found', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await updateVotingSession('nonexistent', { title: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('deleteVotingSession()', () => {
    it('should delete voting session', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });
      (db.delete as any) = mockDelete;

      const result = await deleteVotingSession('session-123');

      expect(result).toBe(true);
    });

    it('should handle deletion errors', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('DB error')),
      });
      (db.delete as any) = mockDelete;

      await expect(deleteVotingSession('session-123')).rejects.toThrow(
        'Failed to delete voting session'
      );
    });
  });
});

describe('Voting Service - Options Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addVotingOption()', () => {
    it('should add voting option', async () => {
      const newOption = {
        sessionId: 'session-123',
        text: 'Option A',
        description: 'First option',
      };

      const createdOption = {
        ...newOption,
        id: 'option-1',
        displayOrder: 1,
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdOption]),
        }),
      });
      (db.insert as any) = mockInsert;

      const result = await addVotingOption(newOption);

      expect(result.text).toBe('Option A');
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('updateVotingOption()', () => {
    it('should update voting option', async () => {
      const updates = { text: 'Updated Option' };
      const updated = {
        id: 'option-1',
        text: 'Updated Option',
      };

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await updateVotingOption('option-1', updates);

      expect(result?.text).toBe('Updated Option');
    });
  });

  describe('deleteVotingOption()', () => {
    it('should delete voting option', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });
      (db.delete as any) = mockDelete;

      const result = await deleteVotingOption('option-1');

      expect(result).toBe(true);
    });
  });
});

describe('Voting Service - Voter Eligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addVoterEligibility()', () => {
    it('should add voter eligibility', async () => {
      const eligibility = {
        sessionId: 'session-123',
        voterId: 'voter-1',
        eligibilityType: 'member',
      };

      const created = {
        ...eligibility,
        id: 'elig-1',
        isEligible: true,
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([created]),
        }),
      });
      (db.insert as any) = mockInsert;

      const result = await addVoterEligibility(eligibility);

      expect(result.voterId).toBe('voter-1');
    });
  });

  describe('checkVoterEligibility()', () => {
    it('should return true if voter is eligible', async () => {
      const mockEligibility = {
        id: 'elig-1',
        sessionId: 'session-123',
        voterId: 'voter-1',
        isEligible: true,
      };

      (db.query.voterEligibility.findFirst as any).mockResolvedValue(mockEligibility);

      const result = await checkVoterEligibility('session-123', 'voter-1');

      expect(result?.isEligible).toBe(true);
    });

    it('should return false if voter not eligible', async () => {
      const mockEligibility = {
        id: 'elig-1',
        isEligible: false,
      };

      (db.query.voterEligibility.findFirst as any).mockResolvedValue(mockEligibility);

      const result = await checkVoterEligibility('session-123', 'voter-1');

      expect(result?.isEligible).toBe(false);
    });

    it('should return false if no eligibility record', async () => {
      (db.query.voterEligibility.findFirst as any).mockResolvedValue(null);

      const result = await checkVoterEligibility('session-123', 'voter-1');

      expect(result).toBeNull();
    });
  });
});

describe('Voting Service - Voting Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('castVote()', () => {
    it('should cast vote successfully', async () => {
      // Mock voter is eligible
      (db.query.voterEligibility.findFirst as any).mockResolvedValue({
        isEligible: true,
      });

      // Mock voter hasn't voted
      (db.query.votes.findFirst as any).mockResolvedValue(null);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'vote-1',
              sessionId: 'session-123',
              voterId: 'voter-1',
              optionId: 'option-1',
            },
          ]),
        }),
      });
      (db.insert as any) = mockInsert;

      const result = await castVote('session-123', 'option-1', 'voter-1');

      expect(result.id).toBe('vote-1');
    });

    it('should reject vote if eligibility missing', async () => {
      (db.query.voterEligibility.findFirst as any).mockResolvedValue(null);

      await expect(castVote('session-123', 'option-1', 'voter-1')).rejects.toThrow(
        'Voter is not eligible'
      );
    });

    it('should reject vote if voter not eligible', async () => {
      (db.query.voterEligibility.findFirst as any).mockResolvedValue({
        isEligible: false,
      });

      await expect(castVote('session-123', 'option-1', 'voter-1')).rejects.toThrow(
        'Voter is not eligible'
      );
    });

    it('should reject duplicate vote', async () => {
      (db.query.voterEligibility.findFirst as any).mockResolvedValue({
        isEligible: true,
      });

      // Mock voter already voted
      (db.query.votes.findFirst as any).mockResolvedValue({
        id: 'vote-1',
        voterId: 'voter-1',
      });

      await expect(castVote('session-123', 'option-1', 'voter-1')).rejects.toThrow(
        'Vote already cast'
      );
    });
  });

  describe('hasVoted()', () => {
    it('should return true if voter has voted', async () => {
      (db.query.votes.findFirst as any).mockResolvedValue({
        id: 'vote-1',
        voterId: 'voter-1',
      });

      const result = await hasVoted('session-123', 'voter-1');

      expect(result).toBe(true);
    });

    it('should return false if voter has not voted', async () => {
      (db.query.votes.findFirst as any).mockResolvedValue(null);

      const result = await hasVoted('session-123', 'voter-1');

      expect(result).toBe(false);
    });
  });
});

describe('Voting Service - Results Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateResults()', () => {
    it('should calculate voting results', async () => {
      (db.query.votingSessions.findFirst as any).mockResolvedValue({
        id: 'session-123',
        totalEligibleVoters: 100,
        requiresQuorum: true,
        quorumThreshold: 50,
      });

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                { id: 'option-1', text: 'Option A' },
                { id: 'option-2', text: 'Option B' },
              ]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 75 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                { optionId: 'option-1', count: 50 },
                { optionId: 'option-2', count: 25 },
              ]),
            }),
          }),
        });

      (db.select as any) = mockSelect;

      const result = await calculateResults('session-123');

      expect(result.totalVotes).toBe(75);
      expect(result.options).toHaveLength(2);
      expect(result.options[0].voteCount).toBe(50);
      expect(result.quorumMet).toBe(true);
      expect(result.winner).toBe('option-1');
    });
  });
});
