import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimJurisdictionInfo } from '@/components/claims/claim-jurisdiction-info';

// Mock the jurisdiction helpers
vi.mock('@/lib/jurisdiction-helpers', () => ({
  getTenantJurisdiction: vi.fn().mockResolvedValue('CA-FED'),
  getJurisdictionName: vi.fn((code) => {
    const names: Record<string, string> = {
      'CA-FED': 'Federal',
      'CA-ON': 'Ontario',
      'CA-QC': 'Quebec',
    };
    return names[code] || 'Unknown';
  }),
  requiresBilingualSupport: vi.fn((code) => ['CA-FED', 'CA-QC', 'CA-NB'].includes(code)),
  getDeadlineUrgency: vi.fn((days) => {
    if (days < 0) return { level: 'critical', color: 'red', label: 'Overdue' };
    if (days <= 3) return { level: 'high', color: 'orange', label: 'Urgent' };
    if (days <= 7) return { level: 'medium', color: 'yellow', label: 'Upcoming' };
    return { level: 'low', color: 'green', label: 'On Track' };
  }),
}));

// Mock the API fetch
global.fetch = vi.fn();

describe('ClaimJurisdictionInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering with Jurisdiction', () => {
    it('should render Federal jurisdiction badge', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jurisdiction: 'CA-FED',
          jurisdictionName: 'Federal',
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimCategory="grievance"
          incidentDate="2025-01-15"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Federal')).toBeInTheDocument();
      });
    });

    it('should calculate grievance filing deadline', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jurisdiction: 'CA-FED',
        }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          deadlineDate: '2025-02-20',
          deadlineDays: 25,
          legalReference: 'CLC §240',
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimCategory="grievance"
          incidentDate="2025-01-15"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Filing Deadline/i)).toBeInTheDocument();
        expect(screen.getByText(/February 20, 2025/i)).toBeInTheDocument();
        expect(screen.getByText(/25 business days/i)).toBeInTheDocument();
      });
    });

    it('should show legal reference', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jurisdiction: 'CA-FED',
        }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          deadlineDate: '2025-02-20',
          legalReference: 'Canada Labour Code §240',
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimCategory="grievance"
          incidentDate="2025-01-15"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Canada Labour Code §240/i)).toBeInTheDocument();
      });
    });
  });

  describe('Urgency Indicators', () => {
    it('should show red alert for overdue deadline', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jurisdiction: 'CA-ON',
        }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          deadlineDate: '2025-01-10', // Past date
          deadlineDays: 30,
          daysRemaining: -5,
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimCategory="grievance"
          incidentDate="2025-01-01"
        />
      );

      await waitFor(() => {
        const alert = screen.getByText(/Overdue/i);
        expect(alert).toBeInTheDocument();
        expect(alert.closest('div')).toHaveClass('bg-red-50');
      });
    });

    it('should show orange alert for urgent deadline', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jurisdiction: 'CA-ON',
        }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          deadlineDate: '2025-01-18',
          daysRemaining: 3,
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimCategory="grievance"
          incidentDate="2025-01-15"
        />
      );

      await waitFor(() => {
        const alert = screen.getByText(/Urgent/i);
        expect(alert).toBeInTheDocument();
        expect(alert.closest('div')).toHaveClass('bg-orange-50');
      });
    });

    it('should show green indicator for on-track deadline', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jurisdiction: 'CA-FED',
        }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          deadlineDate: '2025-02-25',
          daysRemaining: 15,
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimCategory="grievance"
          incidentDate="2025-01-15"
        />
      );

      await waitFor(() => {
        const alert = screen.getByText(/On Track/i);
        expect(alert).toBeInTheDocument();
        expect(alert.closest('div')).toHaveClass('bg-green-50');
      });
    });
  });

  describe('Interactive Calculator', () => {
    it('should render deadline calculator button', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, jurisdiction: 'CA-ON' }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimCategory="grievance"
          incidentDate="2025-01-15"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Calculate Different Deadline/i)).toBeInTheDocument();
      });
    });

    it('should open calculator on button click', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, jurisdiction: 'CA-ON' }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimCategory="grievance"
          incidentDate="2025-01-15"
        />
      );

      await waitFor(() => {
        const button = screen.getByText(/Calculate Different Deadline/i);
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByText(/Calculate Different Deadline/i);
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Deadline Calculator/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should return null when jurisdiction fetch fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimCategory="grievance"
          incidentDate="2025-01-15"
        />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should handle deadline calculation failure gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jurisdiction: 'CA-ON' }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimCategory="grievance"
          incidentDate="2025-01-15"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Ontario')).toBeInTheDocument();
        // Should still show jurisdiction even if deadline calc fails
      });
    });

    it('should handle missing incident date', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, jurisdiction: 'CA-FED' }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimCategory="grievance"
          incidentDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Federal')).toBeInTheDocument();
        // Should show jurisdiction but not deadline
        expect(screen.queryByText(/Filing Deadline/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while fetching', () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimCategory="grievance"
          incidentDate="2025-01-15"
        />
      );

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });
  });
});
