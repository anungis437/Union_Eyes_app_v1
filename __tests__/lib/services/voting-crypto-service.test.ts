import { describe, it, expect } from 'vitest';
import {
  createVotingAuditLog,
  deriveVotingSessionKey,
  generateVoteReceipt,
  signVote,
  verifyElectionIntegrity,
  verifyVoteReceipt,
  verifyVoteSignature,
} from '@/lib/services/voting-crypto-service';

describe('voting-crypto-service', () => {
  it('exports crypto helpers', () => {
    expect(deriveVotingSessionKey).toBeDefined();
    expect(signVote).toBeDefined();
    expect(verifyVoteSignature).toBeDefined();
    expect(generateVoteReceipt).toBeDefined();
    expect(verifyVoteReceipt).toBeDefined();
    expect(createVotingAuditLog).toBeDefined();
    expect(verifyElectionIntegrity).toBeDefined();
  });
});
