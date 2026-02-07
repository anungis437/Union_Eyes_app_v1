import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
}));

const logger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const generateRemittanceExcel = vi.hoisted(() =>
  vi.fn(async () => Buffer.from('excel-buffer'))
);

vi.mock('@/db/db', () => ({
  db: mockDb,
}));

vi.mock('@/lib/logger', () => ({
  logger,
}));

vi.mock('@/lib/utils/excel-generator', () => ({
  generateRemittanceExcel,
}));

import { RemittanceExportService, remittanceExporter } from '@/services/clc/remittance-export';

const buildSelectWithJoin = (rows: any[]) => ({
  from: vi.fn().mockReturnValue({
    innerJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(rows),
      }),
    }),
  }),
});

const buildSelect = (rows: any[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(rows),
    }),
  }),
});

describe('remittance-export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports expected members', () => {
    expect(RemittanceExportService).toBeDefined();
    expect(remittanceExporter).toBeDefined();
  });

  it('exports CSV with headers and totals', async () => {
    const records = [
      {
        remittance: {
          id: 'remit-1',
          fromOrganizationId: 'org-1',
          toOrganizationId: 'org-parent',
          remittanceYear: 2026,
          remittanceMonth: 1,
          remittableMembers: 10,
          perCapitaRate: '1.25',
          totalAmount: '12.50',
          status: 'pending',
          dueDate: '2026-02-15',
          paidDate: null,
          clcAccountCode: 'CLC-001',
          glAccount: '5200',
          notes: 'Note',
        },
        fromOrg: {
          id: 'org-1',
          name: 'Local Union',
          code: 'LU-100',
        },
      },
    ];

    mockDb.select
      .mockReturnValueOnce(buildSelectWithJoin(records))
      .mockReturnValueOnce(buildSelect([
        { id: 'org-parent', name: 'CLC Parent', charterNumber: 'CLC-ROOT' },
      ]));

    const exporter = new RemittanceExportService();
    const file = await exporter.exportRemittances({ format: 'csv' });

    expect(file.format).toBe('csv');
    expect(typeof file.content).toBe('string');
    expect(file.content).toContain('Remittance ID');
    expect(file.content).toContain('remit-1');
    expect(file.content).toContain('Local Union');
    expect(file.recordCount).toBe(1);
    expect(file.totalAmount).toBe('12.50');
    expect(file.filename.startsWith('clc_remittance_')).toBe(true);
    expect(file.filename.endsWith('.csv')).toBe(true);
    expect(file.checksum).toHaveLength(64);
  });

  it('escapes CSV values with commas and quotes', async () => {
    const records = [
      {
        remittance: {
          id: 'remit-esc',
          fromOrganizationId: 'org-esc',
          toOrganizationId: 'org-parent',
          remittanceYear: 2026,
          remittanceMonth: 2,
          remittableMembers: 3,
          perCapitaRate: '1.00',
          totalAmount: '3.00',
          status: 'pending',
          dueDate: '2026-03-15',
          paidDate: null,
          clcAccountCode: 'CLC-ESC',
          glAccount: '5200',
          notes: 'Note, "Quoted"',
        },
        fromOrg: {
          id: 'org-esc',
          name: 'Local, "Union"',
          code: 'LU-ESC',
        },
      },
    ];

    mockDb.select
      .mockReturnValueOnce(buildSelectWithJoin(records))
      .mockReturnValueOnce(buildSelect([
        { id: 'org-parent', name: 'CLC Parent', charterNumber: 'CLC-ROOT' },
      ]));

    const exporter = new RemittanceExportService();
    const file = await exporter.exportRemittances({ format: 'csv' });

    expect(file.content).toContain('"Local, ""Union"""');
    expect(file.content).toContain('"Note, ""Quoted"""');
  });

  it('exports CSV without headers when includeHeaders is false', async () => {
    const records = [
      {
        remittance: {
          id: 'remit-no-header',
          fromOrganizationId: 'org-7',
          toOrganizationId: 'org-parent',
          remittanceYear: 2026,
          remittanceMonth: 7,
          remittableMembers: 4,
          perCapitaRate: '1.00',
          totalAmount: '4.00',
          status: 'pending',
          dueDate: '2026-08-15',
          paidDate: null,
          clcAccountCode: 'CLC-007',
          glAccount: '5200',
          notes: '',
        },
        fromOrg: {
          id: 'org-7',
          name: 'Local Union 7',
          code: 'LU-700',
        },
      },
    ];

    mockDb.select
      .mockReturnValueOnce(buildSelectWithJoin(records))
      .mockReturnValueOnce(buildSelect([
        { id: 'org-parent', name: 'CLC Parent', charterNumber: 'CLC-ROOT' },
      ]));

    const exporter = new RemittanceExportService();
    const file = await exporter.exportRemittances({
      format: 'csv',
      includeHeaders: false,
    });

    expect(file.content.startsWith('Remittance ID')).toBe(false);
    expect(file.content).toContain('remit-no-header');
  });

  it('exports XML with escaped values', async () => {
    const records = [
      {
        remittance: {
          id: 'remit-2',
          fromOrganizationId: 'org-2',
          toOrganizationId: 'org-parent',
          remittanceYear: 2026,
          remittanceMonth: 3,
          remittableMembers: 5,
          perCapitaRate: '2.00',
          totalAmount: '10.00',
          status: 'pending',
          dueDate: '2026-04-15',
          paidDate: null,
          clcAccountCode: 'CLC-002',
          glAccount: '5200',
          notes: 'Note & More',
        },
        fromOrg: {
          id: 'org-2',
          name: 'Local & Union',
          code: 'LU-200',
        },
      },
    ];

    mockDb.select
      .mockReturnValueOnce(buildSelectWithJoin(records))
      .mockReturnValueOnce(buildSelect([
        { id: 'org-parent', name: 'CLC Parent', charterNumber: 'CLC-ROOT' },
      ]));

    const exporter = new RemittanceExportService();
    const file = await exporter.exportRemittances({ format: 'xml' });

    expect(file.format).toBe('xml');
    expect(typeof file.content).toBe('string');
    expect(file.content).toContain('<PerCapitaRemittances>');
    expect(file.content).toContain('<ID>remit-2</ID>');
    expect(file.content).toContain('Local &amp; Union');
    expect(file.content).toContain('Note &amp; More');
  });

  it('exports Excel using generator', async () => {
    const records = [
      {
        remittance: {
          id: 'remit-3',
          fromOrganizationId: 'org-3',
          toOrganizationId: 'org-parent',
          remittanceYear: 2026,
          remittanceMonth: 5,
          remittableMembers: 8,
          perCapitaRate: '3.00',
          totalAmount: '24.00',
          status: 'paid',
          dueDate: '2026-06-15',
          paidDate: '2026-06-10',
          clcAccountCode: 'CLC-003',
          glAccount: '5200',
          notes: '',
        },
        fromOrg: {
          id: 'org-3',
          name: 'Local Union 3',
          code: 'LU-300',
        },
      },
    ];

    mockDb.select
      .mockReturnValueOnce(buildSelectWithJoin(records))
      .mockReturnValueOnce(buildSelect([
        { id: 'org-parent', name: 'CLC Parent', charterNumber: 'CLC-ROOT' },
      ]));

    const exporter = new RemittanceExportService();
    const file = await exporter.exportRemittances({ format: 'excel' });

    expect(file.format).toBe('excel');
    expect(Buffer.isBuffer(file.content)).toBe(true);
    expect(generateRemittanceExcel).toHaveBeenCalledTimes(1);
  });

  it('exports StatCan format with pipe delimiters', async () => {
    const records = [
      {
        remittance: {
          id: 'remit-4',
          fromOrganizationId: 'org-4',
          toOrganizationId: 'org-parent',
          remittanceYear: 2026,
          remittanceMonth: 2,
          remittableMembers: 12,
          perCapitaRate: '1.50',
          totalAmount: '18.00',
          status: 'pending',
          dueDate: '2026-03-15',
          paidDate: null,
          clcAccountCode: 'CLC-004',
          glAccount: '5200',
          notes: '',
        },
        fromOrg: {
          id: 'org-4',
          name: 'Local | Union',
          code: 'LU-400',
        },
      },
    ];

    mockDb.select
      .mockReturnValueOnce(buildSelectWithJoin(records))
      .mockReturnValueOnce(buildSelect([
        { id: 'org-parent', name: 'CLC Parent', charterNumber: 'CLC-ROOT' },
      ]));

    const exporter = new RemittanceExportService();
    const file = await exporter.exportRemittances({ format: 'statcan' });

    expect(file.format).toBe('statcan');
    expect(typeof file.content).toBe('string');
    expect(file.content).toContain('SURVEY_CODE|REFERENCE_PERIOD');
    expect(file.content).toContain('LAB-05302');
    expect(file.content).toContain('LU-400');
    expect(file.content).toContain('Q1');
  });

  it('exports EDI with control headers', async () => {
    const records = [
      {
        remittance: {
          id: 'remit-5',
          fromOrganizationId: 'org-5',
          toOrganizationId: 'org-parent',
          remittanceYear: 2026,
          remittanceMonth: 4,
          remittableMembers: 20,
          perCapitaRate: '2.00',
          totalAmount: '40.00',
          status: 'pending',
          dueDate: '2026-05-15',
          paidDate: null,
          clcAccountCode: 'CLC-005',
          glAccount: '5200',
          notes: '',
        },
        fromOrg: {
          id: 'org-5',
          name: 'Local Union 5',
          code: 'LU-500',
        },
      },
    ];

    mockDb.select
      .mockReturnValueOnce(buildSelectWithJoin(records))
      .mockReturnValueOnce(buildSelect([
        { id: 'org-parent', name: 'CLC Parent', charterNumber: 'CLC-ROOT' },
      ]));

    const exporter = new RemittanceExportService();
    const file = await exporter.exportRemittances({ format: 'edi' });

    expect(file.format).toBe('edi');
    expect(typeof file.content).toBe('string');
    expect(file.content).toContain('ISA*');
    expect(file.content).toContain('GS*IN');
    expect(file.content).toContain('N1*BT*Local Union 5');
    expect(file.content).toContain('IEA*1*');
  });

  it('throws when no remittances found', async () => {
    mockDb.select.mockReturnValueOnce(buildSelectWithJoin([]));

    const exporter = new RemittanceExportService();

    await expect(exporter.exportRemittances({ format: 'csv' })).rejects.toThrow(
      'No remittances found for export'
    );
  });

  it('throws for unsupported format', async () => {
    const records = [
      {
        remittance: {
          id: 'remit-6',
          fromOrganizationId: 'org-6',
          toOrganizationId: 'org-parent',
          remittanceYear: 2026,
          remittanceMonth: 6,
          remittableMembers: 6,
          perCapitaRate: '1.00',
          totalAmount: '6.00',
          status: 'pending',
          dueDate: '2026-07-15',
          paidDate: null,
          clcAccountCode: 'CLC-006',
          glAccount: '5200',
          notes: '',
        },
        fromOrg: {
          id: 'org-6',
          name: 'Local Union 6',
          code: 'LU-600',
        },
      },
    ];

    mockDb.select
      .mockReturnValueOnce(buildSelectWithJoin(records))
      .mockReturnValueOnce(buildSelect([
        { id: 'org-parent', name: 'CLC Parent', charterNumber: 'CLC-ROOT' },
      ]));

    const exporter = new RemittanceExportService();

    await expect(
      exporter.exportRemittances({ format: 'unknown' as any })
    ).rejects.toThrow('Unsupported export format: unknown');
  });
});

