/**
 * Member Service Tests
 * 
 * Tests for comprehensive member management including:
 * - Member CRUD operations
 * - Member search and filtering with pagination
 * - Bulk operations (import, status/role updates)
 * - Member statistics
 * - Utility functions (merge, seniority)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMemberById,
  getMemberByUserId,
  getMemberByMembershipNumber,
  createMember,
  updateMember,
  deleteMember,
  permanentlyDeleteMember,
  listMembers,
  searchMembers,
  bulkImportMembers,
  bulkUpdateMemberStatus,
  bulkUpdateMemberRole,
  getMemberStatistics,
  mergeMembers,
  calculateSeniority,
  type NewMember,
  type Member,
} from '@/lib/services/member-service';

// Mock database
vi.mock('@/db/db', () => ({
  db: {
    query: {
      organizationMembers: {
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
  organizationMembers: {
    id: 'id',
    userId: 'userId',
    organizationId: 'organizationId',
    membershipNumber: 'membershipNumber',
    name: 'name',
    email: 'email',
    status: 'status',
    role: 'role',
    department: 'department',
    hireDate: 'hireDate',
    unionJoinDate: 'unionJoinDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
    _: { name: 'organization_members' },
  },
}));

// Import after mocks
import { db } from '@/db/db';

describe('Member Service - CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMemberById()', () => {
    it('should get member by ID', async () => {
      const mockMember: Member = {
        id: 'mem-123',
        userId: 'user-1',
        organizationId: 'org-1',
        membershipNumber: 'M001',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active',
        role: 'member',
        department: 'Operations',
        hireDate: new Date('2020-01-15'),
        unionJoinDate: new Date('2020-02-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as Member;

      (db.query.organizationMembers.findFirst as any).mockResolvedValue(mockMember);

      const result = await getMemberById('mem-123');

      expect(result).toEqual(mockMember);
      expect(db.query.organizationMembers.findFirst).toHaveBeenCalled();
    });

    it('should return null if member not found', async () => {
      (db.query.organizationMembers.findFirst as any).mockResolvedValue(null);

      const result = await getMemberById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      (db.query.organizationMembers.findFirst as any).mockRejectedValue(
        new Error('DB error')
      );

      await expect(getMemberById('mem-123')).rejects.toThrow('Failed to fetch member');
    });
  });

  describe('getMemberByUserId()', () => {
    it('should get member by user ID and organization', async () => {
      const mockMember: Member = {
        id: 'mem-123',
        userId: 'user-1',
        organizationId: 'org-1',
      } as Member;

      (db.query.organizationMembers.findFirst as any).mockResolvedValue(mockMember);

      const result = await getMemberByUserId('user-1', 'org-1');

      expect(result).toEqual(mockMember);
      expect(db.query.organizationMembers.findFirst).toHaveBeenCalled();
    });

    it('should return null if not found', async () => {
      (db.query.organizationMembers.findFirst as any).mockResolvedValue(null);

      const result = await getMemberByUserId('user-1', 'org-1');

      expect(result).toBeNull();
    });
  });

  describe('getMemberByMembershipNumber()', () => {
    it('should get member by membership number', async () => {
      const mockMember: Member = {
        id: 'mem-123',
        membershipNumber: 'M001',
        organizationId: 'org-1',
      } as Member;

      (db.query.organizationMembers.findFirst as any).mockResolvedValue(mockMember);

      const result = await getMemberByMembershipNumber('M001', 'org-1');

      expect(result).toEqual(mockMember);
    });
  });

  describe('createMember()', () => {
    it('should create a new member', async () => {
      const newMember: NewMember = {
        userId: 'user-1',
        organizationId: 'org-1',
        membershipNumber: 'M001',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active',
        role: 'member',
      };

      const createdMember: Member = {
        ...newMember,
        id: 'mem-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as Member;

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdMember]),
        }),
      });
      (db.insert as any) = mockInsert;

      const result = await createMember(newMember);

      expect(result).toEqual(createdMember);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Unique constraint violation')),
        }),
      });
      (db.insert as any) = mockInsert;

      await expect(createMember({} as NewMember)).rejects.toThrow('Failed to create member');
    });
  });

  describe('updateMember()', () => {
    it('should update member successfully', async () => {
      const updates = { name: 'Jane Doe', status: 'inactive' };
      const updatedMember: Member = {
        id: 'mem-123',
        name: 'Jane Doe',
        status: 'inactive',
        updatedAt: new Date(),
      } as Member;

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedMember]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await updateMember('mem-123', updates);

      expect(result).toEqual(updatedMember);
    });

    it('should return null if member not found', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await updateMember('nonexistent', { name: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('deleteMember()', () => {
    it('should soft delete member', async () => {
      const deletedMember: Member = {
        id: 'mem-123',
        deletedAt: new Date(),
      } as Member;

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([deletedMember]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await deleteMember('mem-123');

      expect(result).toBe(true);
    });

    it('should return false if member not found', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await deleteMember('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('permanentlyDeleteMember()', () => {
    it('should permanently delete member', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });
      (db.delete as any) = mockDelete;

      const result = await permanentlyDeleteMember('mem-123');

      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('FK constraint')),
      });
      (db.delete as any) = mockDelete;

      await expect(permanentlyDeleteMember('mem-123')).rejects.toThrow(
        'Failed to permanently delete member'
      );
    });
  });
});

describe('Member Service - List and Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listMembers()', () => {
    it('should list members with pagination', async () => {
      const mockMembers: Member[] = [
        { id: 'mem-1', name: 'John Doe', status: 'active' } as Member,
        { id: 'mem-2', name: 'Jane Smith', status: 'active' } as Member,
      ];

      // Mock for both select queries
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          // First call - count query
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          }),
        })
        .mockReturnValueOnce({
          // Second call - select query
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockMembers),
                }),
              }),
            }),
          }),
        });

      (db.select as any) = mockSelect;

      const result = await listMembers(
        { organizationId: 'org-1' },
        { page: 1, limit: 10 }
      );

      expect(result.members).toEqual(mockMembers);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });

    it('should filter members by status', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });
      (db.select as any) = mockSelect;

      await listMembers({ status: ['active', 'inactive'] });

      expect(mockSelect).toHaveBeenCalled();
    });

    it('should sort members correctly', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });
      (db.select as any) = mockSelect;

      await listMembers({}, { sortBy: 'name', sortOrder: 'asc' });

      expect(mockSelect).toHaveBeenCalled();
    });

    it('should handle listMembers errors', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB error' )),
        }),
      });
      (db.select as any) = mockSelect;

      await expect(listMembers()).rejects.toThrow();
    });
  });

  describe('searchMembers()', () => {
    it('should search members by query', async () => {
      const mockMembers: Member[] = [
        { id: 'mem-1', name: 'John Doe', email: 'john@example.com' } as Member,
      ];

      // Mock for both count and select queries
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          // First call - count query
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        })
        .mockReturnValueOnce({
          // Second call - select query
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockMembers),
              }),
            }),
          }),
        });

      (db.select as any) = mockSelect;

      const result = await searchMembers('org-1', 'john');

      expect(result.members).toEqual(mockMembers);
      expect(result.total).toBe(1);
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });

    it('should apply filters during search', async () => {
      const mockMembers: Member[] = [];

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          // First call - count query
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        })
        .mockReturnValueOnce({
          // Second call - select query
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockMembers),
              }),
            }),
          }),
        });

      (db.select as any) = mockSelect;

      await searchMembers('org-1', 'john', {
        status: ['active'],
        role: ['member'],
        department: 'Operations',
      });

      expect(mockSelect).toHaveBeenCalledTimes(2); // Once for count, once for select
    });
  });
});

describe('Member Service - Bulk Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bulkImportMembers()', () => {
    it('should import members successfully', async () => {
      const members: NewMember[] = [
        {
          userId: 'user-1',
          organizationId: 'org-1',
          name: 'John Doe',
          email: 'john@example.com',
        } as NewMember,
        {
          userId: 'user-2',
          organizationId: 'org-1',
          name: 'Jane Smith',
          email: 'jane@example.com',
        } as NewMember,
      ];

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'mem-1' }]),
        }),
      });
      (db.insert as any) = mockInsert;

      const result = await bulkImportMembers(members);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      const members: NewMember[] = [
        { userId: 'user-1', organizationId: 'org-1' } as NewMember,
        { userId: 'user-2', organizationId: 'org-1' } as NewMember,
      ];

      let callCount = 0;
      const mockReturning = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([{ id: 'mem-1' }]);
        }
        return Promise.reject(new Error('Duplicate key'));
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockReturning,
        }),
      });
      (db.insert as any) = mockInsert;

      const result = await bulkImportMembers(members);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle empty array', async () => {
      const result = await bulkImportMembers([]);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('bulkUpdateMemberStatus()', () => {
    it('should update status for multiple members',  async () => {
      const memberIds = ['mem-1', 'mem-2', 'mem-3'];
      const newStatus = 'inactive';

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 3 }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await bulkUpdateMemberStatus(memberIds, newStatus);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should handle update failures', async () => {
      const memberIds = ['mem-1', 'mem-2'];

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Update failed')),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await bulkUpdateMemberStatus(memberIds, 'inactive');

      expect(result.success).toBe(false);
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.errors).toBeDefined();
    });
  });

  describe('bulkUpdateMemberRole()', () => {
    it('should update role for multiple members', async () => {
      const memberIds = ['mem-1', 'mem-2'];
      const newRole = 'steward';

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'mem-1' }]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await bulkUpdateMemberRole(memberIds, newRole);

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
    });
  });
});

describe('Member Service - Statistics and Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMemberStatistics()', () => {
    it('should return member statistics', async () => {
      const mockMembers: Member[] = [
        { id: 'mem-1', status: 'active', role: 'member', department: 'Operations', deletedAt: null } as Member,
        { id: 'mem-2', status: 'active', role: 'steward', department: 'Operations', deletedAt: null } as Member,
        { id: 'mem-3', status: 'inactive', role: 'member', department: 'Sales', deletedAt: null } as Member,
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockMembers),
        }),
      });
      (db.select as any) = mockSelect;

      const result = await getMemberStatistics('org-1');

      expect(result).toBeDefined();
      expect(result.total).toBe(3);
      expect(result.byStatus).toBeDefined();
      expect(result.byStatus.active).toBe(2);
      expect(result.byStatus.inactive).toBe(1);
      expect(result.byRole).toBeDefined();
      expect(result.byDepartment).toBeDefined();
      expect(result.byDepartment.Operations).toBe(2);
    });
  });

  describe('mergeMembers()', () => {
    it('should merge members keeping primary data', async () => {
      const primary: Member = {
        id: 'mem-1',
        name: 'John Doe',
        email: 'john@example.com',
      } as Member;

      const duplicate: Member = {
        id: 'mem-2',
        name: 'J. Doe',
        email: 'j.doe@example.com',
      } as Member;

      (db.query.organizationMembers.findFirst as any)
        .mockResolvedValueOnce(primary)
        .mockResolvedValueOnce(duplicate);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([primary]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await mergeMembers('mem-1', 'mem-2', 'primary');

      expect(result).toEqual(primary);
    });

    it('should merge members with merge strategy', async () => {
      const primary: Member = {
        id: 'mem-1',
        name: 'John Doe',
        email: null,
      } as Member;

      const duplicate: Member = {
        id: 'mem-2',
        name: null,
        email: 'john@example.com',
      } as Member;

      (db.query.organizationMembers.findFirst as any)
        .mockResolvedValueOnce(primary)
        .mockResolvedValueOnce(duplicate);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {  id: 'mem-1', name: 'John Doe', email: 'john@example.com' },
            ]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await mergeMembers('mem-1', 'mem-2', 'merge');

      expect(result.email).toBe('john@example.com');
    });

    it('should throw error if member not found', async () => {
      (db.query.organizationMembers.findFirst as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'mem-2' } as Member);

      await expect(mergeMembers('mem-1', 'mem-2', 'primary')).rejects.toThrow(
        'Failed to merge members'
      );
    });
  });

  describe('calculateSeniority()', () => {
    it('should calculate seniority correctly', async () => {
      const joinDate = new Date('2020-01-01');
      const member: Member = {
        id: 'mem-123',
        unionJoinDate: joinDate,
      } as Member;

      (db.query.organizationMembers.findFirst as any).mockResolvedValue(member);

      const result = await calculateSeniority('mem-123');

      expect(result).toContain('years');
      expect(result).toContain('months');
      expect(result).not.toBe('N/A');
    });

    it('should return N/A if no union join date', async () => {
      const member: Member = {
        id: 'mem-123',
        unionJoinDate: null,
      } as Member;

      (db.query.organizationMembers.findFirst as any).mockResolvedValue(member);

      const result = await calculateSeniority('mem-123');

      expect(result).toBe('N/A');
    });

    it('should return N/A if member not found', async () => {
      (db.query.organizationMembers.findFirst as any).mockResolvedValue(null);

      const result = await calculateSeniority('nonexistent');

      expect(result).toBe('N/A');
    });

    it('should handle errors gracefully', async () => {
      (db.query.organizationMembers.findFirst as any).mockRejectedValue(
        new Error('DB error')
      );

      const result = await calculateSeniority('mem-123');

      expect(result).toBe('N/A');
    });
  });
});
