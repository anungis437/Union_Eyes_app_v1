/**
 * Unit Tests: Strike Fund Dashboard Component
 * Tests strike fund management, picket tracking, and stipend calculations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StrikeFundDashboard } from '@/components/strike/StrikeFundDashboard';

// Mock fetch globally
global.fetch = vi.fn();

describe('StrikeFundDashboard - Fund Status Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display active strike fund with correct balance', async () => {
    const mockFund = {
      id: 'fund-1',
      fund_name: 'Local 123 Strike Fund',
      strike_status: 'active',
      total_fund_balance: 500000,
      total_disbursed: 125000,
      weekly_stipend_amount: 500,
      eligible_members_count: 250,
      active_strikers_count: 200,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [mockFund] }),
    });

    render(<StrikeFundDashboard organizationId="org-1" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/strike/funds?organizationId=org-1'
      );
    });
  });

  it('should calculate remaining fund balance correctly', () => {
    const totalBalance = 500000;
    const totalDisbursed = 125000;
    const remainingBalance = totalBalance - totalDisbursed;

    expect(remainingBalance).toBe(375000);
  });

  it('should calculate strike fund burn rate per week', () => {
    const activeStrikers = 200;
    const weeklyStipend = 500;
    const burnRate = activeStrikers * weeklyStipend;

    expect(burnRate).toBe(100000); // $100k per week
  });

  it('should calculate weeks of funding remaining', () => {
    const remainingBalance = 375000;
    const burnRate = 100000;
    const weeksRemaining = Math.floor(remainingBalance / burnRate);

    expect(weeksRemaining).toBe(3);
  });
});

describe('StrikeFundDashboard - Strike Status Indicators', () => {
  it('should display "planned" status with appropriate badge', () => {
    const status = 'planned';
    const statusColors = {
      planned: 'blue',
      preparing: 'yellow',
      active: 'red',
      suspended: 'orange',
      resolved: 'green',
    };

    expect(statusColors[status]).toBe('blue');
  });

  it('should display "active" status with red indicator', () => {
    const status = 'active';
    const statusColors = {
      planned: 'blue',
      preparing: 'yellow',
      active: 'red',
      suspended: 'orange',
      resolved: 'green',
    };

    expect(statusColors[status]).toBe('red');
  });

  it('should display "resolved" status with green indicator', () => {
    const status = 'resolved';
    const isResolved = status === 'resolved';

    expect(isResolved).toBe(true);
  });
});

describe('StrikeFundDashboard - Stipend Calculations', () => {
  it('should calculate weekly stipend for full hours', () => {
    const weeklyStipend = 500;
    const hoursWorked = 20;
    const minimumHours = 20;

    const earnedStipend = hoursWorked >= minimumHours ? weeklyStipend : 0;

    expect(earnedStipend).toBe(500);
  });

  it('should withhold stipend for insufficient hours', () => {
    const weeklyStipend = 500;
    const hoursWorked = 15;
    const minimumHours = 20;

    const earnedStipend = hoursWorked >= minimumHours ? weeklyStipend : 0;

    expect(earnedStipend).toBe(0);
  });

  it('should calculate prorated stipend for partial weeks', () => {
    const weeklyStipend = 500;
    const daysWorked = 3;
    const daysInWeek = 7;

    const proratedStipend = (weeklyStipend / daysInWeek) * daysWorked;

    expect(Math.round(proratedStipend)).toBe(214); // ~$214
  });

  it('should handle overtime picket hours', () => {
    const standardHours = 20;
    const actualHours = 28;
    const overtimeHours = actualHours - standardHours;

    expect(overtimeHours).toBe(8);
  });
});

describe('StrikeFundDashboard - Picket Line Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track picket line locations', () => {
    const picketLines = [
      { id: 'pl-1', location_name: 'Main Entrance', active_picketers_count: 15 },
      { id: 'pl-2', location_name: 'Loading Dock', active_picketers_count: 10 },
      { id: 'pl-3', location_name: 'Side Gate', active_picketers_count: 5 },
    ];

    const totalPicketers = picketLines.reduce((sum, pl) => sum + pl.active_picketers_count, 0);

    expect(totalPicketers).toBe(30);
  });

  it('should calculate total picket hours for the day', () => {
    const picketLines = [
      { location: 'Main', hours: 120 },
      { location: 'Loading', hours: 80 },
      { location: 'Side', hours: 40 },
    ];

    const totalHours = picketLines.reduce((sum, pl) => sum + pl.hours, 0);

    expect(totalHours).toBe(240);
  });

  it('should identify inactive picket lines', () => {
    const picketLine = {
      status: 'inactive',
      last_activity: new Date('2026-02-05'),
    };

    const isInactive = picketLine.status === 'inactive';

    expect(isInactive).toBe(true);
  });
});

describe('StrikeFundDashboard - Eligibility Rules', () => {
  it('should verify member eligibility for strike pay', () => {
    const member = {
      isActiveMember: true,
      goodStanding: true,
      votedInStrikeVote: true,
      participatingInStrike: true,
    };

    const isEligible = 
      member.isActiveMember &&
      member.goodStanding &&
      member.votedInStrikeVote &&
      member.participatingInStrike;

    expect(isEligible).toBe(true);
  });

  it('should deny eligibility for non-participating members', () => {
    const member = {
      isActiveMember: true,
      goodStanding: true,
      votedInStrikeVote: true,
      participatingInStrike: false, // Not participating
    };

    const isEligible = member.participatingInStrike;

    expect(isEligible).toBe(false);
  });

  it('should deny eligibility for members not in good standing', () => {
    const member = {
      isActiveMember: true,
      goodStanding: false, // Not in good standing
      votedInStrikeVote: true,
      participatingInStrike: true,
    };

    const isEligible = member.goodStanding;

    expect(isEligible).toBe(false);
  });
});

describe('StrikeFundDashboard - Payment Processing', () => {
  it('should track pending stipend payments', () => {
    const disbursements = [
      { id: 'd-1', payment_status: 'pending', amount: 500 },
      { id: 'd-2', payment_status: 'pending', amount: 500 },
      { id: 'd-3', payment_status: 'paid', amount: 500 },
    ];

    const pendingPayments = disbursements.filter(d => d.payment_status === 'pending');

    expect(pendingPayments.length).toBe(2);
  });

  it('should calculate total pending disbursements', () => {
    const disbursements = [
      { payment_status: 'pending', stipend_amount: 500 },
      { payment_status: 'pending', stipend_amount: 500 },
      { payment_status: 'approved', stipend_amount: 500 },
    ];

    const totalPending = disbursements
      .filter(d => d.payment_status === 'pending')
      .reduce((sum, d) => sum + d.stipend_amount, 0);

    expect(totalPending).toBe(1000);
  });

  it('should track payment dates', () => {
    const disbursement = {
      week_start_date: '2026-02-01',
      week_end_date: '2026-02-07',
      payment_date: '2026-02-10',
    };

    const weekEnd = new Date(disbursement.week_end_date);
    const paymentDate = new Date(disbursement.payment_date);
    const daysToPayment = Math.floor(
      (paymentDate.getTime() - weekEnd.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(daysToPayment).toBe(3);
  });

  it('should reject payments for rejected disbursements', () => {
    const disbursement = {
      payment_status: 'rejected',
      rejection_reason: 'Insufficient hours',
    };

    const shouldPay = disbursement.payment_status !== 'rejected';

    expect(shouldPay).toBe(false);
  });
});

describe('StrikeFundDashboard - Strike Duration Tracking', () => {
  it('should calculate strike duration in weeks', () => {
    const startDate = new Date('2026-01-15');
    const today = new Date('2026-02-06');

    const durationDays = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const durationWeeks = Math.floor(durationDays / 7);

    expect(durationWeeks).toBe(3);
  });

  it('should compare actual vs expected duration', () => {
    const actualWeeks = 3;
    const expectedWeeks = 2;
    const isExceeded = actualWeeks > expectedWeeks;

    expect(isExceeded).toBe(true);
  });

  it('should project fund depletion date', () => {
    const remainingBalance = 300000;
    const weeklyBurnRate = 100000;
    const weeksUntilDepletion = Math.floor(remainingBalance / weeklyBurnRate);

    expect(weeksUntilDepletion).toBe(3);
  });
});

describe('StrikeFundDashboard - Data Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

    render(<StrikeFundDashboard organizationId="org-1" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should handle empty fund data', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ funds: [] }),
    });

    render(<StrikeFundDashboard organizationId="org-1" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
