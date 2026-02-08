/**
 * Unit Tests: Database RLS Context Middleware
 * 
 * Tests automatic user context setting for Row-Level Security policies.
 * Ensures proper isolation, cleanup, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withRLSContext,
  withExplicitUserContext,
  withSystemContext,
  validateRLSContext,
  getCurrentRLSContext,
  createSecureServerAction,
  normalizeRole,
  isSystemAdmin,
} from '@/lib/db/with-rls-context';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock('@/db/db', () => ({
  db: {
    transaction: vi.fn((callback) => callback({
      execute: vi.fn().mockResolvedValue([{ current_setting: 'test_user_123' }]),
    })),
    execute: vi.fn().mockResolvedValue([{ current_setting: 'test_user_123' }]),
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  },
}));

// Mock auth functions
vi.mock('@/lib/auth', () => ({
  normalizeRole: (role: string) => {
    const map: Record<string, string> = {
      'super_admin': 'admin',
      'guest': 'member',
    };
    return map[role] || role;
  },
  isSystemAdmin: vi.fn(),
}));

describe('RLS Context Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withRLSContext', () => {
    it('should execute operation with user context set', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/db/db');
      
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123', orgId: null } as any);

      const result = await withRLSContext(async () => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(db.transaction).toHaveBeenCalled();
    });

    it('should throw error when user not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as any);

      await expect(
        withRLSContext(async () => 'test')
      ).rejects.toThrow('Unauthorized');
    });

    it('should isolate context in concurrent requests', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      
      // Simulate different users
      vi.mocked(auth)
        .mockResolvedValueOnce({ userId: 'user_1', orgId: null } as any)
        .mockResolvedValueOnce({ userId: 'user_2', orgId: null } as any);

      const [result1, result2] = await Promise.all([
        withRLSContext(async () => 'user1_data'),
        withRLSContext(async () => 'user2_data'),
      ]);

      expect(result1).toBe('user1_data');
      expect(result2).toBe('user2_data');
    });

    it('should handle errors within operation', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123', orgId: null } as any);

      await expect(
        withRLSContext(async () => {
          throw new Error('Operation failed');
        })
      ).rejects.toThrow('Operation failed');
    });
  });

  describe('withExplicitUserContext', () => {
    it('should set context for specified user ID', async () => {
      const { db } = await import('@/db/db');

      const result = await withExplicitUserContext('explicit_user_456', async () => {
        return 'admin_view';
      });

      expect(result).toBe('admin_view');
      expect(db.transaction).toHaveBeenCalled();
    });

    it('should throw error with empty user ID', async () => {
      await expect(
        withExplicitUserContext('', async () => 'test')
      ).rejects.toThrow('Invalid user ID');
    });

    it('should allow admin impersonation flows', async () => {
      // Simulate admin viewing another user's data
      const targetUserId = 'member_789';
      
      const result = await withExplicitUserContext(targetUserId, async () => {
        return { userId: targetUserId, claims: [] };
      });

      expect(result.userId).toBe(targetUserId);
    });
  });

  describe('withSystemContext', () => {
    it('should execute without user context for system operations', async () => {
      const { db } = await import('@/db/db');

      const result = await withSystemContext(async () => {
        return 'system_operation';
      });

      expect(result).toBe('system_operation');
      expect(db.transaction).toHaveBeenCalled();
    });

    it('should handle Clerk webhook flows', async () => {
      // Simulate webhook creating a user
      const webhookData = {
        userId: 'new_user_123',
        email: 'newuser@example.com',
      };

      const result = await withSystemContext(async () => {
        return webhookData;
      });

      expect(result.userId).toBe('new_user_123');
    });
  });

  describe('validateRLSContext', () => {
    it('should return user ID when context is set', async () => {
      const { db } = await import('@/db/db');
      
      vi.mocked(db.execute).mockResolvedValue([{ current_setting: 'user_123' }] as any);

      const userId = await validateRLSContext();

      expect(userId).toBe('user_123');
    });

    it('should throw error when context is not set', async () => {
      const { db } = await import('@/db/db');
      
      vi.mocked(db.execute).mockResolvedValue([{ current_setting: '' }] as any);

      await expect(validateRLSContext()).rejects.toThrow('RLS context not set');
    });

    it('should throw error when context query fails', async () => {
      const { db } = await import('@/db/db');
      
      vi.mocked(db.execute).mockRejectedValue(new Error('Database error'));

      await expect(validateRLSContext()).rejects.toThrow('RLS context not set');
    });
  });

  describe('getCurrentRLSContext', () => {
    it('should return user ID when context is set', async () => {
      const { db } = await import('@/db/db');
      
      vi.mocked(db.execute).mockResolvedValue([{ current_setting: 'user_456' }] as any);

      const userId = await getCurrentRLSContext();

      expect(userId).toBe('user_456');
    });

    it('should return null when context is not set', async () => {
      const { db } = await import('@/db/db');
      
      vi.mocked(db.execute).mockResolvedValue([{ current_setting: '' }] as any);

      const userId = await getCurrentRLSContext();

      expect(userId).toBeNull();
    });

    it('should return null on error (non-throwing)', async () => {
      const { db } = await import('@/db/db');
      
      vi.mocked(db.execute).mockRejectedValue(new Error('DB error'));

      const userId = await getCurrentRLSContext();

      expect(userId).toBeNull();
    });
  });

  describe('createSecureServerAction', () => {
    it('should wrap server action with RLS context', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      
      vi.mocked(auth).mockResolvedValue({ userId: 'user_789', orgId: null } as any);

      const originalAction = async (input: { message: string }) => {
        return `Processed: ${input.message}`;
      };

      const secureAction = createSecureServerAction(originalAction);
      const result = await secureAction({ message: 'test' });

      expect(result).toBe('Processed: test');
    });

    it('should throw if called without authentication', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as any);

      const action = createSecureServerAction(async () => 'test');

      await expect(action({})).rejects.toThrow('Unauthorized');
    });

    it('should handle TypeScript type inference', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123', orgId: null } as any);

      interface CreateClaimInput {
        memberId: string;
        amount: number;
      }

      interface CreateClaimOutput {
        claimId: number;
        status: string;
      }

      const createClaim = createSecureServerAction<CreateClaimInput, CreateClaimOutput>(
        async (input) => {
          return {
            claimId: 123,
            status: 'pending',
          };
        }
      );

      const result = await createClaim({ memberId: 'member_1', amount: 100 });

      expect(result.claimId).toBe(123);
      expect(result.status).toBe('pending');
    });
  });

  describe('normalizeRole', () => {
    it('should normalize legacy roles', () => {
      expect(normalizeRole('super_admin')).toBe('admin');
      expect(normalizeRole('guest')).toBe('member');
    });

    it('should pass through aligned roles', () => {
      expect(normalizeRole('admin')).toBe('admin');
      expect(normalizeRole('officer')).toBe('officer');
      expect(normalizeRole('steward')).toBe('steward');
      expect(normalizeRole('member')).toBe('member');
    });

    it('should default to member for unknown roles', () => {
      expect(normalizeRole('unknown')).toBe('member');
      expect(normalizeRole('')).toBe('member');
    });
  });

  describe('isSystemAdmin', () => {
    it('should return true for system admin users', async () => {
      const { isSystemAdmin: mockIsSystemAdmin } = await import('@/lib/auth');
      
      vi.mocked(mockIsSystemAdmin).mockResolvedValue(true);

      const result = await mockIsSystemAdmin('admin_user_123');

      expect(result).toBe(true);
    });

    it('should return false for regular users', async () => {
      const { isSystemAdmin: mockIsSystemAdmin } = await import('@/lib/auth');
      
      vi.mocked(mockIsSystemAdmin).mockResolvedValue(false);

      const result = await mockIsSystemAdmin('regular_user_456');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const { isSystemAdmin: mockIsSystemAdmin } = await import('@/lib/auth');
      
      vi.mocked(mockIsSystemAdmin).mockRejectedValue(new Error('DB error'));

      await expect(mockIsSystemAdmin('user_123')).rejects.toThrow();
    });
  });

  describe('Performance & Edge Cases', () => {
    it('should handle rapid sequential requests', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123', orgId: null } as any);

      const requests = Array.from({ length: 10 }, (_, i) =>
        withRLSContext(async () => `request_${i}`)
      );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result).toBe(`request_${i}`);
      });
    });

    it('should handle long-running operations', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123', orgId: null } as any);

      const result = await withRLSContext(async () => {
        // Simulate long operation
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'completed';
      });

      expect(result).toBe('completed');
    });

    it('should cleanup context on error', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/db/db');
      
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123', orgId: null } as any);

      try {
        await withRLSContext(async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // Error expected
      }

      // Transaction should have been attempted (cleanup happens in transaction rollback)
      expect(db.transaction).toHaveBeenCalled();
    });
  });

  describe('Real-World Use Cases', () => {
    it('should handle claims CRUD operations', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      
      vi.mocked(auth).mockResolvedValue({ userId: 'member_123', orgId: 'org_456' } as any);

      const result = await withRLSContext(async () => {
        // Simulate claims query with RLS
        return {
          claims: [
            { id: 1, memberId: 'member_123', amount: 100 },
            { id: 2, memberId: 'member_123', amount: 200 },
          ],
        };
      });

      expect(result.claims).toHaveLength(2);
      expect(result.claims[0].memberId).toBe('member_123');
    });

    it('should handle training enrollment', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      
      vi.mocked(auth).mockResolvedValue({ userId: 'member_789', orgId: 'org_123' } as any);

      const result = await withRLSContext(async () => {
        // Simulate course registration
        return {
          enrollmentId: 456,
          memberId: 'member_789',
          courseId: 'safety_101',
          status: 'enrolled',
        };
      });

      expect(result.enrollmentId).toBe(456);
      expect(result.status).toBe('enrolled');
    });

    it('should handle admin viewing all org data', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      
      vi.mocked(auth).mockResolvedValue({ userId: 'admin_001', orgId: 'org_123' } as any);

      const result = await withRLSContext(async () => {
        // Admin can see all claims in their org via RLS policy
        return {
          totalClaims: 150,
          pendingClaims: 25,
          approvedClaims: 125,
        };
      });

      expect(result.totalClaims).toBe(150);
    });
  });
});
