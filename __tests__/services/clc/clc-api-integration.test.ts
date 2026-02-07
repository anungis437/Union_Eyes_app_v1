import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: mockDb,
}));

vi.mock('@/db/schema', () => ({
  organizations: 'organizations',
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args) => ({ eq: args })),
  desc: vi.fn((...args) => ({ desc: args })),
  and: vi.fn((...args) => ({ and: args })),
  gte: vi.fn((...args) => ({ gte: args })),
  isNotNull: vi.fn((arg) => ({ isNotNull: arg })),
}));

import {
  syncOrganization,
  syncAllOrganizations,
  createOrganizationFromCLC,
  handleWebhook,
} from '@/services/clc/clc-api-integration';

const buildSelectWithLimit = (rows: any[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(rows),
    }),
  }),
});

describe('clc-api-integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('exports expected functions', () => {
    expect(syncOrganization).toBeDefined();
    expect(typeof syncOrganization).toBe('function');
    expect(syncAllOrganizations).toBeDefined();
    expect(typeof syncAllOrganizations).toBe('function');
    expect(createOrganizationFromCLC).toBeDefined();
    expect(typeof createOrganizationFromCLC).toBe('function');
    expect(handleWebhook).toBeDefined();
    expect(typeof handleWebhook).toBe('function');
  });

  it('skips sync when no changes detected', async () => {
    const localOrg = {
      id: 'org-1',
      charterNumber: 'CLC-100',
      name: 'Local Union',
      legalName: 'Local Union',
      status: 'active',
      province: 'ON',
      city: 'Toronto',
      postalCode: 'M1A1A1',
      contactEmail: 'contact@example.com',
      contactPhone: '123-456-7890',
      totalMembers: 100,
    };

    const clcOrg = {
      affiliateCode: 'CLC-100',
      name: 'Local Union',
      legalName: 'Local Union',
      organizationType: 'local',
      status: 'active',
      province: 'ON',
      city: 'Toronto',
      postalCode: 'M1A1A1',
      contactEmail: 'contact@example.com',
      contactPhone: '123-456-7890',
      membershipCount: 100,
      lastUpdated: new Date().toISOString(),
    };

    mockDb.select.mockReturnValueOnce(buildSelectWithLimit([localOrg]));

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => clcOrg,
    });

    const result = await syncOrganization('org-1');

    expect(result.success).toBe(true);
    expect(result.action).toBe('skipped');
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('updates organization when CLC data wins', async () => {
    const localOrg = {
      id: 'org-2',
      charterNumber: 'CLC-200',
      name: 'Local A',
      legalName: 'Local A',
      status: 'active',
      province: 'ON',
      city: 'Toronto',
      postalCode: 'M1A1A1',
      contactEmail: 'contact@example.com',
      contactPhone: '123-456-7890',
      totalMembers: 50,
    };

    const clcOrg = {
      affiliateCode: 'CLC-200',
      name: 'Local B',
      legalName: 'Local B',
      organizationType: 'local',
      status: 'active',
      province: 'ON',
      city: 'Toronto',
      postalCode: 'M1A1A1',
      contactEmail: 'contact@example.com',
      contactPhone: '123-456-7890',
      membershipCount: 50,
      lastUpdated: new Date().toISOString(),
    };

    const setSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    mockDb.select.mockReturnValueOnce(buildSelectWithLimit([localOrg]));
    mockDb.update.mockReturnValue({ set: setSpy });

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => clcOrg,
    });

    const result = await syncOrganization('org-2');

    expect(result.success).toBe(true);
    expect(result.action).toBe('updated');
    expect(setSpy).toHaveBeenCalled();
    expect(setSpy.mock.calls[0][0].name).toBe('Local B');
  });

  it('returns failed when creating existing organization', async () => {
    const clcOrg = {
      affiliateCode: 'CLC-300',
      name: 'Local Existing',
      legalName: 'Local Existing',
      organizationType: 'local',
      status: 'active',
      province: 'BC',
      city: 'Vancouver',
      postalCode: 'V1A1A1',
      contactEmail: 'contact@example.com',
      contactPhone: '123-456-7890',
      membershipCount: 20,
      lastUpdated: new Date().toISOString(),
    };

    mockDb.select.mockReturnValueOnce(buildSelectWithLimit([
      { id: 'org-existing', charterNumber: 'CLC-300' },
    ]));

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => clcOrg,
    });

    const result = await createOrganizationFromCLC('CLC-300');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Organization already exists');
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('handles webhook with unknown type', async () => {
    const result = await handleWebhook({
      id: 'webhook-1',
      type: 'organization.unknown',
      timestamp: new Date().toISOString(),
      data: {
        affiliateCode: 'CLC-400',
        name: 'Local',
        legalName: 'Local',
        organizationType: 'local',
        status: 'active',
        province: 'ON',
        city: 'Toronto',
        postalCode: 'M1A1A1',
        contactEmail: 'contact@example.com',
        contactPhone: '123-456-7890',
        membershipCount: 10,
        lastUpdated: new Date().toISOString(),
      },
      signature: 'sig',
    } as any);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Unknown webhook type');
  });

  it('processes organization.created webhook', async () => {
    const clcOrg = {
      affiliateCode: 'CLC-500',
      name: 'Local New',
      legalName: 'Local New',
      organizationType: 'local',
      status: 'active',
      province: 'ON',
      city: 'Toronto',
      postalCode: 'M1A1A1',
      contactEmail: 'contact@example.com',
      contactPhone: '123-456-7890',
      membershipCount: 10,
      lastUpdated: new Date().toISOString(),
    };

    mockDb.select.mockReturnValueOnce(buildSelectWithLimit([]));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'org-new' }]),
      }),
    });

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => clcOrg,
    });

    const result = await handleWebhook({
      id: 'webhook-2',
      type: 'organization.created',
      timestamp: new Date().toISOString(),
      data: clcOrg,
      signature: 'sig',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('created');
  });

  it('syncs all organizations with no entries', async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await syncAllOrganizations();

    expect(result.totalOrganizations).toBe(0);
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('marks organization inactive on deleted webhook', async () => {
    const setSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    mockDb.select.mockReturnValueOnce(buildSelectWithLimit([
      { id: 'org-del', charterNumber: 'CLC-DEL' },
    ]));
    mockDb.update.mockReturnValue({ set: setSpy });

    const result = await handleWebhook({
      id: 'webhook-3',
      type: 'organization.deleted',
      timestamp: new Date().toISOString(),
      data: {
        affiliateCode: 'CLC-DEL',
        name: 'Local Delete',
        legalName: 'Local Delete',
        organizationType: 'local',
        status: 'inactive',
        province: 'ON',
        city: 'Toronto',
        postalCode: 'M1A1A1',
        contactEmail: 'contact@example.com',
        contactPhone: '123-456-7890',
        membershipCount: 10,
        lastUpdated: new Date().toISOString(),
      },
      signature: 'sig',
    });

    expect(result.success).toBe(true);
    expect(setSpy).toHaveBeenCalled();
    expect(setSpy.mock.calls[0][0].status).toBe('inactive');
  });

  it('creates organization from CLC when missing', async () => {
    const clcOrg = {
      affiliateCode: 'CLC-600',
      name: 'Local Create',
      legalName: 'Local Create',
      organizationType: 'local',
      status: 'active',
      province: 'AB',
      city: 'Calgary',
      postalCode: 'T1A1A1',
      contactEmail: 'contact@example.com',
      contactPhone: '123-456-7890',
      membershipCount: 30,
      lastUpdated: new Date().toISOString(),
    };

    mockDb.select.mockReturnValueOnce(buildSelectWithLimit([]));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'org-new-2' }]),
      }),
    });

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => clcOrg,
    });

    const result = await createOrganizationFromCLC('CLC-600');

    expect(result.success).toBe(true);
    expect(result.action).toBe('created');
  });

  it('returns failed when local organization is missing', async () => {
    mockDb.select.mockReturnValueOnce(buildSelectWithLimit([]));

    const result = await syncOrganization('missing-org');

    expect(result.success).toBe(false);
    expect(result.action).toBe('failed');
    expect(result.error).toContain('not found locally');
  });

  it('updates membership count on membership.updated webhook', async () => {
    const setSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    mockDb.select.mockReturnValueOnce(buildSelectWithLimit([
      { id: 'org-mem', charterNumber: 'CLC-MEM' },
    ]));
    mockDb.update.mockReturnValue({ set: setSpy });

    const result = await handleWebhook({
      id: 'webhook-4',
      type: 'membership.updated',
      timestamp: new Date().toISOString(),
      data: {
        affiliateCode: 'CLC-MEM',
        name: 'Local Member',
        legalName: 'Local Member',
        organizationType: 'local',
        status: 'active',
        province: 'ON',
        city: 'Toronto',
        postalCode: 'M1A1A1',
        contactEmail: 'contact@example.com',
        contactPhone: '123-456-7890',
        membershipCount: 123,
        lastUpdated: new Date().toISOString(),
      },
      signature: 'sig',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('updated');
    expect(setSpy).toHaveBeenCalled();
    expect(setSpy.mock.calls[0][0].memberCount).toBe(123);
  });
});

