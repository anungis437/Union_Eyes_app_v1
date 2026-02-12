import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CertificationJurisdictionInfo } from '@/components/certification/certification-jurisdiction-info';

// Mock fetch
global.fetch = vi.fn();

type MockRule = Record<string, unknown>;
let mockJurisdiction = 'CA-FED';
let mockRules: MockRule[] = [];

const setMockResponses = (jurisdiction: string, rules: MockRule[]) => {
  mockJurisdiction = jurisdiction;
  mockRules = rules;
};

describe('CertificationJurisdictionInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJurisdiction = 'CA-FED';
    mockRules = [];
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.startsWith('/api/jurisdiction/organization/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ jurisdiction: mockJurisdiction }),
        });
      }
      if (url.startsWith('/api/jurisdiction/rules')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ rules: mockRules }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: async () => ({}),
      });
    });
  });

  describe('Card-Check Jurisdictions', () => {
    it('should show Alberta 65% card-check threshold', async () => {
      setMockResponses('CA-AB', [
        {
          jurisdiction: 'CA-AB',
          ruleCategory: 'certification',
          thresholdPercent: 65,
          allowsCardCheck: true,
          requiredForms: ['LRB-001'],
          legalReference: 'Alberta Labour Relations Code',
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={65}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Alberta/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/65\s*%/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Card-Check/i).length).toBeGreaterThan(0);
      });
    });

    it('should show Saskatchewan 45% card-check threshold (lowest)', async () => {
      setMockResponses('CA-SK', [
        {
          jurisdiction: 'CA-SK',
          thresholdPercent: 45,
          allowsCardCheck: true,
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={45}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Saskatchewan/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/45\s*%/i).length).toBeGreaterThan(0);
      });
    });

    it('should show BC 55% card-check threshold', async () => {
      setMockResponses('CA-BC', [
        {
          jurisdiction: 'CA-BC',
          thresholdPercent: 55,
          allowsCardCheck: true,
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={60}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/British Columbia/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/55\s*%/i).length).toBeGreaterThan(0);
      });
    });

    it('should show Quebec 50% card-check with bilingual requirement', async () => {
      setMockResponses('CA-QC', [
        {
          jurisdiction: 'CA-QC',
          thresholdPercent: 50,
          allowsCardCheck: true,
          requiresBilingual: true,
          requiredForms: ['TAT'],
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={50}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Quebec/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/50\s*%/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Bilingual/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Mandatory Vote Jurisdictions', () => {
    it('should show Federal mandatory vote only (no card-check)', async () => {
      setMockResponses('CA-FED', [
        {
          jurisdiction: 'CA-FED',
          minimumSupport: 35,
          allowsCardCheck: false,
          mandatoryVote: true,
          requiredForms: ['CIRB Form 1'],
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={40}
          certificationMethod="mandatory-vote"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Federal/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Mandatory Vote/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/35\s*%/i).length).toBeGreaterThan(0); // Minimum support
      });
    });

    it('should show Nova Scotia mandatory vote only', async () => {
      setMockResponses('CA-NS', [
        {
          jurisdiction: 'CA-NS',
          minimumSupport: 40,
          allowsCardCheck: false,
          mandatoryVote: true,
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={45}
          certificationMethod="mandatory-vote"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Nova Scotia/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Mandatory Vote/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/40\s*%/i).length).toBeGreaterThan(0);
      });
    });

    it('should show Ontario mandatory vote only', async () => {
      setMockResponses('CA-ON', [
        {
          jurisdiction: 'CA-ON',
          minimumSupport: 40,
          allowsCardCheck: false,
          mandatoryVote: true,
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={45}
          certificationMethod="mandatory-vote"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Ontario/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Mandatory Vote/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Support Level Calculator', () => {
    it('should calculate support level percentage', async () => {
      setMockResponses('CA-MB', [
        {
          jurisdiction: 'CA-MB',
          thresholdPercent: 65,
          allowsCardCheck: true,
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={70}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Current Support Level/i)).toBeInTheDocument();
        expect(screen.getByText(/Support Cards Signed/i)).toBeInTheDocument();
      });
    });

    it('should show progress bar for support level', async () => {
      setMockResponses('CA-AB', [
        { jurisdiction: 'CA-AB', thresholdPercent: 65 },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
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
      setMockResponses('CA-AB', [
        {
          jurisdiction: 'CA-AB',
          thresholdPercent: 65,
          allowsCardCheck: true,
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={70}
          certificationMethod={null}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Card-Check Certification/i).length).toBeGreaterThan(0);
        expect(
          screen.getByText(/You have sufficient support/i)
        ).toBeInTheDocument();
      });
    });

    it('should recommend mandatory vote when support 35-threshold%', async () => {
      setMockResponses('CA-FED', [
        {
          jurisdiction: 'CA-FED',
          minimumSupport: 35,
          allowsCardCheck: false,
          mandatoryVote: true,
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={40}
          certificationMethod={null}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Mandatory Representation Vote/i)
        ).toBeInTheDocument();
      });
    });

    it('should show insufficient support warning when < 35%', async () => {
      setMockResponses('CA-ON', [
        {
          jurisdiction: 'CA-ON',
          minimumSupport: 40,
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={30}
          certificationMethod={null}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Insufficient Support/i).length).toBeGreaterThan(0);
        expect(
          screen.getAllByText(/Continue Organizing/i).length
        ).toBeGreaterThan(0);
      });
    });
  });

  describe('Form Requirements Display', () => {
    it('should show Federal CIRB Form 1', async () => {
      setMockResponses('CA-FED', [
        {
          jurisdiction: 'CA-FED',
          requiredForms: ['CIRB Form 1'],
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
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
      setMockResponses('CA-AB', [
        {
          jurisdiction: 'CA-AB',
          requiredForms: ['LRB-001'],
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
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
      setMockResponses('CA-QC', [
        {
          jurisdiction: 'CA-QC',
          requiredForms: ['TAT'],
          requiresBilingual: true,
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={55}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/TAT/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Bilingual/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Multi-Jurisdiction Comparison Table', () => {
    it('should render comparison table', async () => {
      setMockResponses('CA-MB', [
        {
          jurisdiction: 'CA-MB',
          thresholdPercent: 65,
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={70}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Certification Methods Across Canada/i)
        ).toBeInTheDocument();
      });
    });

    it('should show card-check availability by jurisdiction', async () => {
      setMockResponses('CA-SK', [
        { jurisdiction: 'CA-SK', thresholdPercent: 45 },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={50}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        // Table should show card-check thresholds: SK 45%, BC 55%, QC/PE 50%, MB/AB/NL 65%
        expect(screen.getAllByText(/45\s*%/i).length).toBeGreaterThan(0); // Saskatchewan
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly meeting threshold', async () => {
      setMockResponses('CA-AB', [
        {
          jurisdiction: 'CA-AB',
          thresholdPercent: 65,
          allowsCardCheck: true,
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={65}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        // Exactly 65% should meet Alberta threshold
        expect(screen.getAllByText(/Card-Check/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/65\s*%/i).length).toBeGreaterThan(0);
      });
    });

    it('should handle zero cards signed', async () => {
      setMockResponses('CA-ON', [
        { jurisdiction: 'CA-ON', minimumSupport: 40 },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={0}
          certificationMethod={null}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Current Support Level/i)).not.toBeInTheDocument();
      });
    });

    it('should handle 100% support', async () => {
      setMockResponses('CA-SK', [
        {
          jurisdiction: 'CA-SK',
          thresholdPercent: 45,
          allowsCardCheck: true,
        },
      ]);

      render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={100}
          certificationMethod="card-check"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Card-Check/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return null when fetch fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const { container } = render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
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
      setMockResponses('CA-ON', []);

      const { container } = render(
        <CertificationJurisdictionInfo
          certificationId="cert-1"
          organizationId="org-1"
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
          organizationId="org-1"
          totalEmployees={100}
          cardsSignedCount={50}
          certificationMethod="card-check"
        />
      );

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });
  });
});
