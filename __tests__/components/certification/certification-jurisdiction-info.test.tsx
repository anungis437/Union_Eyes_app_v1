import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CertificationJurisdictionInfo } from '@/components/certification/certification-jurisdiction-info';

// Mock fetch
global.fetch = vi.fn();

describe('CertificationJurisdictionInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Card-Check Jurisdictions', () => {
    it('should show Alberta 65% card-check threshold', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-AB',
              ruleCategory: 'certification',
              thresholdPercent: 65,
              allowsCardCheck: true,
              requiredForms: ['LRB-001'],
              legalReference: 'Alberta Labour Relations Code',
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={65}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Alberta/i)).toBeInTheDocument();
        expect(screen.getByText(/65%/i)).toBeInTheDocument();
        expect(screen.getByText(/Card-Check/i)).toBeInTheDocument();
      });
    });

    it('should show Saskatchewan 45% card-check threshold (lowest)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-SK',
              thresholdPercent: 45,
              allowsCardCheck: true,
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={45}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Saskatchewan/i)).toBeInTheDocument();
        expect(screen.getByText(/45%/i)).toBeInTheDocument();
      });
    });

    it('should show BC 55% card-check threshold', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-BC',
              thresholdPercent: 55,
              allowsCardCheck: true,
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={60}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/British Columbia/i)).toBeInTheDocument();
        expect(screen.getByText(/55%/i)).toBeInTheDocument();
      });
    });

    it('should show Quebec 50% card-check with bilingual requirement', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-QC',
              thresholdPercent: 50,
              allowsCardCheck: true,
              requiresBilingual: true,
              requiredForms: ['TAT'],
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={50}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Quebec/i)).toBeInTheDocument();
        expect(screen.getByText(/50%/i)).toBeInTheDocument();
        expect(screen.getByText(/Bilingual/i)).toBeInTheDocument();
      });
    });
  });

  describe('Mandatory Vote Jurisdictions', () => {
    it('should show Federal mandatory vote only (no card-check)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-FED',
              minimumSupport: 35,
              allowsCardCheck: false,
              mandatoryVote: true,
              requiredForms: ['CIRB Form 1'],
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={40}
          certificationMethod="mandatory-vote"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Federal/i)).toBeInTheDocument();
        expect(screen.getByText(/Mandatory Vote/i)).toBeInTheDocument();
        expect(screen.getByText(/35%/i)).toBeInTheDocument(); // Minimum support
        expect(screen.queryByText(/Card-Check/i)).not.toBeInTheDocument();
      });
    });

    it('should show Nova Scotia mandatory vote only', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-NS',
              minimumSupport: 40,
              allowsCardCheck: false,
              mandatoryVote: true,
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={45}
          certificationMethod="mandatory-vote"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Nova Scotia/i)).toBeInTheDocument();
        expect(screen.getByText(/Mandatory Vote/i)).toBeInTheDocument();
        expect(screen.getByText(/40%/i)).toBeInTheDocument();
      });
    });

    it('should show Ontario mandatory vote only', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-ON',
              minimumSupport: 40,
              allowsCardCheck: false,
              mandatoryVote: true,
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={45}
          certificationMethod="mandatory-vote"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Ontario/i)).toBeInTheDocument();
        expect(screen.getByText(/Mandatory Vote/i)).toBeInTheDocument();
      });
    });
  });

  describe('Support Level Calculator', () => {
    it('should calculate support level percentage', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-MB',
              thresholdPercent: 65,
              allowsCardCheck: true,
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={70}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/70%/i)).toBeInTheDocument(); // 70/100 = 70%
        expect(screen.getByText(/70 cards/i)).toBeInTheDocument();
        expect(screen.getByText(/100 employees/i)).toBeInTheDocument();
      });
    });

    it('should show progress bar for support level', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [{ jurisdiction: 'CA-AB', thresholdPercent: 65 }],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={65}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
      });
    });
  });

  describe('Recommended Method Determination', () => {
    it('should recommend card-check when support >= threshold', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-AB',
              thresholdPercent: 65,
              allowsCardCheck: true,
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={70}
          certificationMethod={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Recommended: Card-Check/i)).toBeInTheDocument();
        expect(
          screen.getByText(/You have sufficient support/i)
        ).toBeInTheDocument();
      });
    });

    it('should recommend mandatory vote when support 35-threshold%', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-FED',
              minimumSupport: 35,
              allowsCardCheck: false,
              mandatoryVote: true,
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={40}
          certificationMethod={null}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Recommended: Mandatory Vote/i)
        ).toBeInTheDocument();
      });
    });

    it('should show insufficient support warning when < 35%', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-ON',
              minimumSupport: 40,
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={30}
          certificationMethod={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Insufficient Support/i)).toBeInTheDocument();
        expect(
          screen.getByText(/Continue organizing before filing/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Form Requirements Display', () => {
    it('should show Federal CIRB Form 1', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-FED',
              requiredForms: ['CIRB Form 1'],
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={40}
          certificationMethod="mandatory-vote"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/CIRB Form 1/i)).toBeInTheDocument();
      });
    });

    it('should show Alberta LRB-001 form', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-AB',
              requiredForms: ['LRB-001'],
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={70}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/LRB-001/i)).toBeInTheDocument();
      });
    });

    it('should show Quebec TAT application', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-QC',
              requiredForms: ['TAT'],
              requiresBilingual: true,
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={55}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/TAT/i)).toBeInTheDocument();
        expect(screen.getByText(/Bilingual/i)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Jurisdiction Comparison Table', () => {
    it('should render comparison table', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-MB',
              thresholdPercent: 65,
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={70}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Compare with other jurisdictions/i)
        ).toBeInTheDocument();
      });
    });

    it('should show card-check availability by jurisdiction', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [{ jurisdiction: 'CA-SK', thresholdPercent: 45 }],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={50}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        // Table should show card-check thresholds: SK 45%, BC 55%, QC/PE 50%, MB/AB/NL 65%
        expect(screen.getByText(/45%/i)).toBeInTheDocument(); // Saskatchewan
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly meeting threshold', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-AB',
              thresholdPercent: 65,
              allowsCardCheck: true,
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={65}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        // Exactly 65% should meet Alberta threshold
        expect(screen.getByText(/Card-Check/i)).toBeInTheDocument();
        expect(screen.getByText(/65%/i)).toBeInTheDocument();
      });
    });

    it('should handle zero cards signed', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [{ jurisdiction: 'CA-ON', minimumSupport: 40 }],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={0}
          certificationMethod={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/0%/i)).toBeInTheDocument();
        expect(screen.getByText(/Insufficient Support/i)).toBeInTheDocument();
      });
    });

    it('should handle 100% support', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-SK',
              thresholdPercent: 45,
              allowsCardCheck: true,
            },
          ],
        }),
      });

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={100}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/100%/i)).toBeInTheDocument();
        expect(screen.getByText(/Card-Check/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should return null when fetch fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const { container } = render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={50}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should handle missing rules gracefully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [],
        }),
      });

      const { container } = render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={50}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator', () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          tenantId="tenant-1"
          totalEmployees={100}
          cardsSignedCount={50}
          certificationMethod="card-check"
        />
      );

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });
  });
});
