import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendEmailMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { id: 'email-1' } })
);

const ResendMock = vi.hoisted(
  () =>
    class ResendClient {
      emails = {
        send: sendEmailMock,
      };
    }
);

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(() => ({
    values: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('resend', () => ({
  Resend: ResendMock,
}));

vi.mock('@/db', () => ({
  db: mockDb,
}));

import * as notifications from '@/services/clc/remittance-notifications';
import {
  sendOverdueAlert,
  sendPaymentConfirmation,
  sendMonthlyReminder,
  sendExecutiveEscalation,
  sendBulkMonthlyReminders,
  processOverdueRemittances,
} from '@/services/clc/remittance-notifications';

const buildSelectWithJoin = (rows: any[]) => ({
  from: vi.fn().mockReturnValue({
    innerJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  }),
});

const buildSelectWithLimit = (rows: any[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(rows),
    }),
  }),
});

const buildSelectWithoutLimit = (rows: any[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(rows),
  }),
});

describe('remittance-notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReset();
  });

  it('exports expected functions', () => {
    expect(sendOverdueAlert).toBeDefined();
    expect(sendPaymentConfirmation).toBeDefined();
    expect(sendMonthlyReminder).toBeDefined();
    expect(sendExecutiveEscalation).toBeDefined();
    expect(sendBulkMonthlyReminders).toBeDefined();
    expect(processOverdueRemittances).toBeDefined();
  });

  it('sends email and sms for 14-day overdue alert', async () => {
    const remittanceRow = {
      remittance: {
        id: 'remit-14',
        organizationId: 'org-1',
        remittanceMonth: 1,
        remittanceYear: 2026,
        dueDate: '2026-01-15',
        totalAmount: '50.00',
        remittableMembers: 10,
        status: 'overdue',
        paidDate: null,
      },
      organization: {
        id: 'org-1',
        name: 'Local Union',
        charterNumber: 'LU-100',
      },
    };

    mockDb.select
      .mockReturnValueOnce(buildSelectWithJoin([remittanceRow]))
      .mockReturnValueOnce(buildSelectWithoutLimit([
        {
          name: 'Primary Contact',
          email: 'contact@example.com',
          phone: '+15551234567',
          isPrimary: true,
        },
      ]));

    const results = await sendOverdueAlert('remit-14', 14);

    expect(results).toHaveLength(2);
    expect(results.some((r) => r.channel === 'email')).toBe(true);
    expect(results.some((r) => r.channel === 'sms')).toBe(true);
    expect(sendEmailMock).toHaveBeenCalled();
  });

  it('returns empty result when monthly remittance already exists', async () => {
    mockDb.select.mockReturnValueOnce(buildSelectWithLimit([{ id: 'remit-1' }]));

    const results = await sendMonthlyReminder('org-1', new Date('2026-01-01'));

    expect(results).toEqual([]);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('sends reminder when no remittance exists', async () => {
    mockDb.select
      .mockReturnValueOnce(buildSelectWithLimit([]))
      .mockReturnValueOnce(buildSelectWithLimit([
        { id: 'org-1', name: 'Local Union', charterNumber: 'LU-100' },
      ]))
      .mockReturnValueOnce(buildSelectWithoutLimit([
        {
          name: 'Primary Contact',
          email: 'contact@example.com',
          phone: null,
          isPrimary: true,
        },
      ]));

    const results = await sendMonthlyReminder('org-1', new Date('2026-01-01'));

    expect(results).toHaveLength(1);
    expect(results[0].channel).toBe('email');
    expect(sendEmailMock).toHaveBeenCalled();
  });

  it('throws when monthly reminder organization is missing', async () => {
    mockDb.select
      .mockReturnValueOnce(buildSelectWithLimit([]))
      .mockReturnValueOnce(buildSelectWithLimit([]));

    await expect(sendMonthlyReminder('missing-org', new Date('2026-01-01'))).rejects.toThrow(
      'Organization missing-org not found'
    );
  });

  it('includes executive recipient for 30-day overdue alerts', async () => {
    const remittanceRow = {
      remittance: {
        id: 'remit-30',
        organizationId: 'org-1',
        remittanceMonth: 1,
        remittanceYear: 2026,
        dueDate: '2026-01-15',
        totalAmount: '50.00',
        remittableMembers: 10,
        status: 'overdue',
        paidDate: null,
      },
      organization: {
        id: 'org-1',
        name: 'Local Union',
        charterNumber: 'LU-100',
      },
    };

    mockDb.select
      .mockReturnValueOnce(buildSelectWithJoin([remittanceRow]))
      .mockReturnValueOnce(buildSelectWithoutLimit([
        {
          name: 'Primary Contact',
          email: 'contact@example.com',
          phone: '+15551234567',
          isPrimary: true,
        },
      ]));

    const results = await sendOverdueAlert('remit-30', 30);

    const emailRecipients = results.filter((r) => r.channel === 'email');
    expect(emailRecipients.length).toBe(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });

  it('sends executive escalation for valid remittances', async () => {
    const remittanceRow = {
      remittance: {
        id: 'remit-esc',
        organizationId: 'org-1',
        remittanceMonth: 1,
        remittanceYear: 2026,
        dueDate: '2026-01-15',
        totalAmount: '75.00',
        remittableMembers: 15,
        status: 'overdue',
        paidDate: null,
      },
      organization: {
        id: 'org-1',
        name: 'Local Union',
        charterNumber: 'LU-100',
      },
    };

    mockDb.select.mockReturnValueOnce(buildSelectWithJoin([remittanceRow]));

    const results = await sendExecutiveEscalation(['remit-esc']);

    expect(results).toHaveLength(1);
    expect(results[0].channel).toBe('email');
    expect(sendEmailMock).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('sends bulk monthly reminders with skip and failure counts', async () => {
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([
          { id: 'org-1' },
          { id: 'org-2' },
          { id: 'org-3' },
        ]),
      })
      // org-1: existing remittance -> skip
      .mockReturnValueOnce(buildSelectWithLimit([{ id: 'remit-1' }]))
      // org-2: no remittance, org exists, contacts exist -> sent
      .mockReturnValueOnce(buildSelectWithLimit([]))
      .mockReturnValueOnce(buildSelectWithLimit([
        { id: 'org-2', name: 'Local 2', charterNumber: 'LU-2' },
      ]))
      .mockReturnValueOnce(buildSelectWithoutLimit([
        { name: 'Primary Contact', email: 'contact@example.com', phone: null, isPrimary: true },
      ]))
      // org-3: no remittance, org missing -> throw
      .mockReturnValueOnce(buildSelectWithLimit([]))
      .mockReturnValueOnce(buildSelectWithLimit([]));

    const result = await sendBulkMonthlyReminders(new Date('2026-02-01'));

    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('processes overdue remittances and escalates critical cases', async () => {
    vi.useFakeTimers();
    const fixedNow = new Date('2026-02-01T12:00:00.000Z');
    vi.setSystemTime(fixedNow);
    const daysAgo = (days: number) => {
      const d = new Date(fixedNow);
      d.setDate(d.getDate() - days);
      return d.toISOString();
    };

    const remittanceRows = [
      { id: 'remit-7', dueDate: daysAgo(7) },
      { id: 'remit-14', dueDate: daysAgo(14) },
      { id: 'remit-30', dueDate: daysAgo(30) },
    ];

    const remittanceDetails = (id: string) => ({
      remittance: {
        id,
        organizationId: 'org-1',
        remittanceMonth: 1,
        remittanceYear: 2026,
        dueDate: '2026-01-15',
        totalAmount: '50.00',
        remittableMembers: 10,
        status: 'overdue',
        paidDate: null,
      },
      organization: {
        id: 'org-1',
        name: 'Local Union',
        charterNumber: 'LU-100',
      },
    });

    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(remittanceRows),
        }),
      })
      // remit-7 fetch + recipients
      .mockReturnValueOnce(buildSelectWithJoin([remittanceDetails('remit-7')]))
      .mockReturnValueOnce(buildSelectWithoutLimit([
        { name: 'Primary Contact', email: 'contact@example.com', phone: null, isPrimary: true },
      ]))
      // remit-14 fetch + recipients
      .mockReturnValueOnce(buildSelectWithJoin([remittanceDetails('remit-14')]))
      .mockReturnValueOnce(buildSelectWithoutLimit([
        { name: 'Primary Contact', email: 'contact@example.com', phone: null, isPrimary: true },
      ]))
      // remit-30 fetch + recipients
      .mockReturnValueOnce(buildSelectWithJoin([remittanceDetails('remit-30')]))
      .mockReturnValueOnce(buildSelectWithoutLimit([
        { name: 'Primary Contact', email: 'contact@example.com', phone: null, isPrimary: true },
      ]))
      // escalation fetch for remit-30
      .mockReturnValueOnce(buildSelectWithJoin([remittanceDetails('remit-30')]));

    try {
      const result = await processOverdueRemittances();

      expect(result.day7).toBe(1);
      expect(result.day14).toBe(1);
      expect(result.day30).toBe(1);
      expect(result.failed).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('counts failures when overdue alerts throw', async () => {
    vi.useFakeTimers();
    const fixedNow = new Date('2026-02-01T12:00:00.000Z');
    vi.setSystemTime(fixedNow);
    const daysAgo = (days: number) => {
      const d = new Date(fixedNow);
      d.setDate(d.getDate() - days);
      return d.toISOString();
    };

    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 'remit-7', dueDate: daysAgo(7) },
          ]),
        }),
      })
      .mockReturnValueOnce(buildSelectWithJoin([]));

    try {
      const result = await processOverdueRemittances();

      expect(result.day7).toBe(0);
      expect(result.failed).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('throws when payment confirmation remittance is missing', async () => {
    mockDb.select.mockReturnValueOnce(buildSelectWithJoin([]));

    await expect(sendPaymentConfirmation('missing-remit')).rejects.toThrow(
      'Remittance missing-remit not found'
    );
  });

  it('returns empty results when escalation has no valid remittances', async () => {
    mockDb.select.mockReturnValueOnce(buildSelectWithJoin([]));

    const results = await sendExecutiveEscalation(['missing-remit']);

    expect(results).toEqual([]);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('throws when overdue remittance is missing', async () => {
    mockDb.select.mockReturnValueOnce(buildSelectWithJoin([]));

    await expect(sendOverdueAlert('missing-remit', 7)).rejects.toThrow(
      'Remittance missing-remit not found'
    );
  });
});

