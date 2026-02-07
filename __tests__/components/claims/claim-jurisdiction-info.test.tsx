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
    vi.resetAllMocks();
    (global.fetch as any) = vi.fn();
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
          claimType="general"
          status="open"
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
          businessDaysRemaining: 25,
          calendarDaysRemaining: 36,
          legalReference: 'CLC §240',
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimType="grievance"
          status="open"
          filedDate="2025-01-15"
        />
      );

      const expectedDate = new Date('2025-02-20').toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await waitFor(() => {
        expect(screen.getByText(/Arbitration Deadline/i)).toBeInTheDocument();
        expect(screen.getByText(expectedDate)).toBeInTheDocument();
        expect(
          screen.getByText(/25 business days remaining/i)
        ).toBeInTheDocument();
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
          businessDaysRemaining: 12,
          calendarDaysRemaining: 18,
          legalReference: 'Canada Labour Code §240',
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimType="grievance"
          status="open"
          filedDate="2025-01-15"
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
          businessDaysRemaining: -5,
          calendarDaysRemaining: -5,
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimType="grievance"
          status="open"
          filedDate="2025-01-01"
        />
      );

      await waitFor(() => {
        const alert = screen.getByText(/Overdue/i);
        expect(alert).toBeInTheDocument();
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
          businessDaysRemaining: 3,
          calendarDaysRemaining: 3,
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimType="grievance"
          status="open"
          filedDate="2025-01-15"
        />
      );

      await waitFor(() => {
        const alert = screen.getByText(/Urgent/i);
        expect(alert).toBeInTheDocument();
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
          businessDaysRemaining: 15,
          calendarDaysRemaining: 20,
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimType="grievance"
          status="open"
          filedDate="2025-01-15"
        />
      );

      await waitFor(() => {
        const alert = screen.getByText(/On Track/i);
        expect(alert).toBeInTheDocument();
      });
    });
  });

  describe('Interactive Calculator', () => {
    it('should render deadline calculator section', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jurisdiction: 'CA-ON' }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          deadlineDate: '2025-02-20',
          deadlineDays: 25,
          businessDaysRemaining: 25,
          calendarDaysRemaining: 36,
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimType="grievance"
          status="open"
          filedDate="2025-01-15"
        />
      );

      expect(await screen.findByText(/Deadline Calculator/i)).toBeInTheDocument();
    });

    it('should render calculator header for deadlines', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jurisdiction: 'CA-ON' }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          deadlineDate: '2025-02-20',
          deadlineDays: 25,
          businessDaysRemaining: 25,
          calendarDaysRemaining: 36,
        }),
      });

      render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimType="grievance"
          status="open"
          filedDate="2025-01-15"
        />
      );

      expect(await screen.findByText(/Deadline Calculator/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should return null when jurisdiction fetch fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(
        <ClaimJurisdictionInfo
          claimId="claim-1"
          tenantId="tenant-1"
          claimType="grievance"
          status="open"
          filedDate="2025-01-15"
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
          claimType="grievance"
          status="open"
          filedDate="2025-01-15"
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
          claimType="grievance"
          status="open"
          filedDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Federal')).toBeInTheDocument();
        // Should show jurisdiction but not deadline
        expect(screen.queryByText(/Arbitration Deadline/i)).not.toBeInTheDocument();
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
          claimType="grievance"
          status="open"
          filedDate="2025-01-15"
        />
      );

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });
  });
});
