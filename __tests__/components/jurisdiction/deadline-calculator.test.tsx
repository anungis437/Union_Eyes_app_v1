import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeadlineCalculator } from '@/components/jurisdiction/deadline-calculator';
import { createMockFetchResponse } from '@/__tests__/test-utils';

describe('DeadlineCalculator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders results with breakdown and urgent status', async () => {
    vi.setSystemTime(new Date(2026, 1, 1, 12, 0, 0));

    const responseData = {
      success: true,
      data: {
        deadlineDate: '2026-02-05T12:00:00.000Z',
        deadlineDays: 4,
        deadlineType: 'calendar',
        ruleName: 'Test Rule',
        canExtend: true,
        maxExtensions: 2,
        businessDaysCalculated: 3,
        weekendsExcluded: 1,
        holidaysExcluded: 0,
        breakdown: [
          {
            date: '2026-02-02T12:00:00.000Z',
            isBusinessDay: true,
            isHoliday: false
          },
          {
            date: '2026-02-03T12:00:00.000Z',
            isBusinessDay: false,
            isHoliday: false
          },
          {
            date: '2026-02-04T12:00:00.000Z',
            isBusinessDay: false,
            isHoliday: true,
            holidayName: 'Test Holiday'
          }
        ]
      }
    };

    const onDeadlineCalculated = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      createMockFetchResponse(responseData)
    );

    render(
      <DeadlineCalculator
        organizationId="org-123"
        ruleCategory="filing"
        defaultStartDate={new Date(2026, 0, 31, 12, 0, 0)}
        showDetailedBreakdown
        onDeadlineCalculated={onDeadlineCalculated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Calculate Deadline' }));

    await waitFor(() => {
      expect(screen.getByText('Test Rule')).toBeInTheDocument();
    });

    expect(screen.getByText('calendar Days')).toBeInTheDocument();
    expect(screen.getByText('4 days remaining (URGENT)')).toBeInTheDocument();
    expect(screen.getByText('Day-by-Day Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Test Holiday')).toBeInTheDocument();
    expect(screen.getByText('Business Day')).toBeInTheDocument();
    expect(screen.getByText('Weekend')).toBeInTheDocument();

    expect(onDeadlineCalculated).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleName: 'Test Rule',
        deadlineDate: expect.any(Date)
      })
    );

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/jurisdiction/calculate-deadline',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  it('renders a passed deadline state', async () => {
    vi.setSystemTime(new Date(2026, 1, 10, 12, 0, 0));

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      createMockFetchResponse({
        success: true,
        data: {
          deadlineDate: '2026-02-05T12:00:00.000Z',
          deadlineDays: 10,
          deadlineType: 'business',
          ruleName: 'Past Rule',
          canExtend: false,
          maxExtensions: 0
        }
      })
    );

    render(
      <DeadlineCalculator
        organizationId="org-123"
        ruleCategory="filing"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Calculate Deadline' }));

    await waitFor(() => {
      expect(screen.getByText('Past Rule')).toBeInTheDocument();
    });

    expect(screen.getByText('Deadline passed 5 days ago')).toBeInTheDocument();
    expect(screen.getByText('business Days')).toBeInTheDocument();
  });

  it('renders an error message when calculation fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      createMockFetchResponse({
        success: false,
        error: 'Calculation failed'
      })
    );

    render(
      <DeadlineCalculator
        organizationId="org-123"
        ruleCategory="filing"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Calculate Deadline' }));

    await waitFor(() => {
      expect(screen.getByText('Calculation failed')).toBeInTheDocument();
    });
  });
});
