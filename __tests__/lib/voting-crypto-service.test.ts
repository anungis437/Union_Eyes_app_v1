import { describe, it, expect } from 'vitest';
import {
  deriveVotingSessionKey,
  signVote,
  verifyVoteSignature,
  generateVoteReceipt,
  verifyVoteReceipt
} from '@/lib/services/voting-crypto-service';

describe('voting-crypto-service', () => {
  describe('deriveVotingSessionKey', () => {
    it('should throw when session secret is missing', () => {
      expect(() => deriveVotingSessionKey('session-1', undefined)).toThrow(
        'VOTING_SECRET environment variable must be set for production'
      );
    });

    it('should produce a deterministic 32-byte key', () => {
      const key1 = deriveVotingSessionKey('session-1', 'super-secret');
      const key2 = deriveVotingSessionKey('session-1', 'super-secret');

      expect(key1).toBeInstanceOf(Buffer);
      expect(key1.length).toBe(32);
      expect(key1.equals(key2)).toBe(true);
    });
  });

  describe('signVote and verifyVoteSignature', () => {
    it('should verify a valid signature', () => {
      const sessionKey = deriveVotingSessionKey('session-2', 'super-secret');
      const timestamp = Math.floor(Date.now() / 1000);
      const voteData = {
        sessionId: 'session-2',
        optionId: 'option-a',
        memberId: 'member-1',
        timestamp
      };

      const signature = signVote(voteData, sessionKey);
      const valid = verifyVoteSignature(voteData, signature, sessionKey);

      expect(valid).toBe(true);
    });

    it('should reject expired signatures', () => {
      const sessionKey = deriveVotingSessionKey('session-3', 'super-secret');
      const timestamp = Math.floor(Date.now() / 1000) - 1000;
      const voteData = {
        sessionId: 'session-3',
        optionId: 'option-a',
        memberId: 'member-1',
        timestamp
      };

      const signature = signVote(voteData, sessionKey);
      const valid = verifyVoteSignature(voteData, signature, sessionKey, 300);

      expect(valid).toBe(false);
    });

    it('should reject signatures when data is tampered', () => {
      const sessionKey = deriveVotingSessionKey('session-4', 'super-secret');
      const timestamp = Math.floor(Date.now() / 1000);
      const voteData = {
        sessionId: 'session-4',
        optionId: 'option-a',
        memberId: 'member-1',
        timestamp
      };

      const signature = signVote(voteData, sessionKey);
      const tampered = { ...voteData, optionId: 'option-b' };
      const valid = verifyVoteSignature(tampered, signature, sessionKey);

      expect(valid).toBe(false);
    });
  });

  describe('generateVoteReceipt and verifyVoteReceipt', () => {
    it('should generate a receipt with verification code', () => {
      const sessionKey = deriveVotingSessionKey('session-5', 'super-secret');
      const timestamp = Math.floor(Date.now() / 1000);
      const voteData = {
        sessionId: 'session-5',
        optionId: 'option-a',
        memberId: 'member-1',
        timestamp
      };

      const signature = signVote(voteData, sessionKey);
      const receipt = generateVoteReceipt(
        {
          sessionId: voteData.sessionId,
          optionId: voteData.optionId,
          memberId: voteData.memberId,
          isAnonymous: true
        },
        signature,
        null
      );

      expect(receipt.receiptId).toMatch(/^[a-f0-9]{32}$/);
      expect(receipt.verificationCode).toMatch(/^\d{6}$/);
      expect(receipt.auditHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should reflect previous audit hash in the chain', () => {
      const sessionKey = deriveVotingSessionKey('session-6', 'super-secret');
      const timestamp = Math.floor(Date.now() / 1000);
      const voteData = {
        sessionId: 'session-6',
        optionId: 'option-a',
        memberId: 'member-1',
        timestamp
      };

      const signature = signVote(voteData, sessionKey);
      const receiptA = generateVoteReceipt(
        {
          sessionId: voteData.sessionId,
          optionId: voteData.optionId,
          memberId: voteData.memberId,
          isAnonymous: true
        },
        signature,
        null
      );
      const receiptB = generateVoteReceipt(
        {
          sessionId: voteData.sessionId,
          optionId: voteData.optionId,
          memberId: voteData.memberId,
          isAnonymous: true
        },
        signature,
        receiptA.auditHash
      );

      expect(receiptB.auditHash).not.toBe(receiptA.auditHash);
    });

    it('should verify receipt when code and data match', () => {
      const sessionKey = deriveVotingSessionKey('session-7', 'super-secret');
      const timestamp = Math.floor(Date.now() / 1000);
      const voteData = {
        sessionId: 'session-7',
        optionId: 'option-a',
        memberId: 'member-1',
        timestamp
      };

      const signature = signVote(voteData, sessionKey);
      const receipt = generateVoteReceipt(
        {
          sessionId: voteData.sessionId,
          optionId: voteData.optionId,
          memberId: voteData.memberId,
          isAnonymous: false
        },
        signature,
        null
      );

      const result = verifyVoteReceipt(
        receipt,
        receipt.verificationCode,
        voteData,
        sessionKey
      );

      expect(result.valid).toBe(true);
      expect(result.matchesOption).toBe(true);
    });

    it('should reject receipt when verification code mismatches', () => {
      const sessionKey = deriveVotingSessionKey('session-8', 'super-secret');
      const timestamp = Math.floor(Date.now() / 1000);
      const voteData = {
        sessionId: 'session-8',
        optionId: 'option-a',
        memberId: 'member-1',
        timestamp
      };

      const signature = signVote(voteData, sessionKey);
      const receipt = generateVoteReceipt(
        {
          sessionId: voteData.sessionId,
          optionId: voteData.optionId,
          memberId: voteData.memberId,
          isAnonymous: false
        },
        signature,
        null
      );

      const result = verifyVoteReceipt(
        receipt,
        '000000',
        voteData,
        sessionKey
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Verification code');
    });

    it('should reject receipt when vote hash mismatches', () => {
      const sessionKey = deriveVotingSessionKey('session-9', 'super-secret');
      const timestamp = Math.floor(Date.now() / 1000);
      const voteData = {
        sessionId: 'session-9',
        optionId: 'option-a',
        memberId: 'member-1',
        timestamp
      };

      const signature = signVote(voteData, sessionKey);
      const receipt = generateVoteReceipt(
        {
          sessionId: voteData.sessionId,
          optionId: voteData.optionId,
          memberId: voteData.memberId,
          isAnonymous: false
        },
        signature,
        null
      );

      const mismatchedData = { ...voteData, optionId: 'option-b' };
      const result = verifyVoteReceipt(
        receipt,
        receipt.verificationCode,
        mismatchedData,
        sessionKey
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Vote hash mismatch');
    });
  });
});
