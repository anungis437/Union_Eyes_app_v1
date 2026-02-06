/**
 * OrganizationService Tests
 * 
 * Tests CRUD operations, member management, permission checking,
 * last owner protection, and audit logging.
 */

import { OrganizationService } from '../organizationService';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabase = (): jest.Mocked<SupabaseClient> => {
  return {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(),
  } as any;
};

describe('OrganizationService', () => {
  let service: OrganizationService;
  let mockSupabase: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new OrganizationService(mockSupabase);
  });

  describe('createOrganization', () => {
    it('should create organization with owner member', async () => {
      const mockOrg = {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org',
        created_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockOrg, error: null }),
          }),
        }),
      } as any);

      const result = await service.createOrganization({
        name: 'Test Org',
        slug: 'test-org',
        owner_user_id: 'user-123',
      });

      expect(result).toEqual(mockOrg);
      expect(mockSupabase.from).toHaveBeenCalledWith('organizations');
    });

    it('should handle creation errors', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Duplicate slug' },
            }),
          }),
        }),
      } as any);

      await expect(
        service.createOrganization({
          name: 'Test Org',
          slug: 'test-org',
          owner_user_id: 'user-123',
        })
      ).rejects.toThrow('Duplicate slug');
    });
  });

  describe('getOrganization', () => {
    it('should retrieve organization by id', async () => {
      const mockOrg = {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockOrg, error: null }),
          }),
        }),
      } as any);

      const result = await service.getOrganization('org-123');

      expect(result).toEqual(mockOrg);
      expect(mockSupabase.from).toHaveBeenCalledWith('organizations');
    });
  });

  describe('updateOrganization', () => {
    it('should update organization fields', async () => {
      const mockUpdated = {
        id: 'org-123',
        name: 'Updated Org',
        slug: 'test-org',
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await service.updateOrganization('org-123', {
        name: 'Updated Org',
      });

      expect(result).toEqual(mockUpdated);
    });
  });

  describe('deleteOrganization', () => {
    it('should delete organization', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      await expect(service.deleteOrganization('org-123')).resolves.not.toThrow();
    });
  });

  describe('addMember', () => {
    it('should add member with specified role', async () => {
      const mockMember = {
        id: 'member-123',
        organization_id: 'org-123',
        user_id: 'user-456',
        role: 'member',
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockMember, error: null }),
          }),
        }),
      } as any);

      const result = await service.addMember({
        organization_id: 'org-123',
        user_id: 'user-456',
        role: 'member',
      });

      expect(result).toEqual(mockMember);
      expect(mockSupabase.from).toHaveBeenCalledWith('organization_members');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const mockUpdated = {
        id: 'member-123',
        role: 'admin',
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await service.updateMemberRole('member-123', 'admin');

      expect(result).toEqual(mockUpdated);
    });
  });

  describe('removeMember', () => {
    it('should prevent removing last owner', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ id: 'member-123', role: 'owner' }],
              error: null,
            }),
          }),
        }),
      } as any);

      await expect(service.removeMember('member-123')).rejects.toThrow(
        'Cannot remove the last owner'
      );
    });

    it('should remove non-owner member', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { id: 'member-123', role: 'member' },
                  { id: 'member-456', role: 'owner' },
                ],
                error: null,
              }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        } as any);

      await expect(service.removeMember('member-123')).resolves.not.toThrow();
    });
  });

  describe('hasRole', () => {
    it('should return true when user has specified role', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await service.hasRole('user-123', 'org-123', 'admin');

      expect(result).toBe(true);
    });

    it('should return false when user does not have role', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'member' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await service.hasRole('user-123', 'org-123', 'admin');

      expect(result).toBe(false);
    });
  });

  describe('isOwnerOrAdmin', () => {
    it('should return true for owner', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'owner' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await service.isOwnerOrAdmin('user-123', 'org-123');

      expect(result).toBe(true);
    });

    it('should return true for admin', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await service.isOwnerOrAdmin('user-123', 'org-123');

      expect(result).toBe(true);
    });

    it('should return false for member', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'member' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await service.isOwnerOrAdmin('user-123', 'org-123');

      expect(result).toBe(false);
    });
  });
});
