import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StrikeVoteJurisdictionInfo } from '@/components/strike/strike-vote-jurisdiction-info';

// Mock fetch
global.fetch = vi.fn();

type MockRule = Record<string, unknown>;
let mockJurisdiction = 'CA-FED';
let mockRules: MockRule[] = [];

const setMockResponses = (jurisdiction: string, rules: MockRule[]) => {
  mockJurisdiction = jurisdiction;
  mockRules = rules;
};

describe('StrikeVoteJurisdictionInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJurisdiction = 'CA-FED';
    mockRules = [];
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.startsWith('/api/jurisdiction/tenant/')) {
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

  describe('Manitoba - 65% Super-Majority', () => {
    it('should show Manitoba requires 65% of votes cast', async () => {
      setMockResponses('CA-MB', [
        {
          jurisdiction: 'CA-MB',
          ruleCategory: 'strike_vote',
          thresholdPercent: 65,
          legalReference: 'Manitoba Labour Relations Act',
        },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={650}
          votesAgainst={300}
          totalVotesCast={950}
        />
      );

      await waitFor(() => {
        const label = screen.getByText(/Manitoba:/i);
        expect(label.closest('div')?.textContent).toContain('65');
      });
    });

    it('should pass vote with 65% or more in favor', async () => {
      setMockResponses('CA-MB', [
        {
          jurisdiction: 'CA-MB',
          thresholdPercent: 65,
        },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={650}
          votesAgainst={350}
          totalVotesCast={1000}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/PASSED/i)).toBeInTheDocument();
        expect(screen.getAllByText(/65\.0\s*%/i).length).toBeGreaterThan(0);
      });
    });

    it('should fail vote with less than 65%', async () => {
      setMockResponses('CA-MB', [
        {
          jurisdiction: 'CA-MB',
          thresholdPercent: 65,
        },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={600}
          votesAgainst={400}
          totalVotesCast={1000}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/FAILED/i)).toBeInTheDocument();
        expect(screen.getAllByText(/60\.0\s*%/i).length).toBeGreaterThan(0); // Only 60%
      });
    });
  });

  describe('Saskatchewan - 45% of Eligible Members (Special Rule)', () => {
    it('should calculate based on eligible members, not votes cast', async () => {
      setMockResponses('CA-SK', [
        {
          jurisdiction: 'CA-SK',
          thresholdPercent: 45,
          calculationBase: 'eligible_members',
          legalReference: 'Saskatchewan Trade Union Act',
        },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={450}
          votesAgainst={100}
          totalVotesCast={550}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Saskatchewan/i).length).toBeGreaterThan(0);
        const requiredMajority = screen.getByText(/Required Majority/i).parentElement;
        expect(requiredMajority?.textContent).toContain('45');
        expect(requiredMajority?.textContent).toContain('eligible members');
        // 450/1000 = 45% of eligible members
        expect(screen.getAllByText(/45\.0\s*%/i).length).toBeGreaterThan(0);
      });
    });

    it('should pass with 45% of eligible members', async () => {
      setMockResponses('CA-SK', [
        {
          jurisdiction: 'CA-SK',
          thresholdPercent: 45,
          calculationBase: 'eligible_members',
        },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={450}
          votesAgainst={50}
          totalVotesCast={500}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/PASSED/i)).toBeInTheDocument();
      });
    });

    it('should fail with less than 45% of eligible members', async () => {
      setMockResponses('CA-SK', [
        {
          jurisdiction: 'CA-SK',
          thresholdPercent: 45,
          calculationBase: 'eligible_members',
        },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={400}
          votesAgainst={100}
          totalVotesCast={500}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/FAILED/i)).toBeInTheDocument();
        // Only 40% of eligible members (400/1000)
      });
    });
  });

  describe('New Brunswick - 60% Threshold', () => {
    it('should show New Brunswick requires 60%', async () => {
      setMockResponses('CA-NB', [
        {
          jurisdiction: 'CA-NB',
          thresholdPercent: 60,
        },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={600}
          votesAgainst={400}
          totalVotesCast={1000}
        />
      );

      await waitFor(() => {
        const label = screen.getByText(/New Brunswick:/i);
        expect(label.closest('div')?.textContent).toContain('60');
      });
    });
  });

  describe('Standard 50%+1 Jurisdictions', () => {
    it('should pass with simple majority (51%)', async () => {
      setMockResponses('CA-ON', [
        {
          jurisdiction: 'CA-ON',
          thresholdPercent: 50,
        },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={510}
          votesAgainst={490}
          totalVotesCast={1000}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/PASSED/i)).toBeInTheDocument();
        expect(screen.getAllByText(/51\.0\s*%/i).length).toBeGreaterThan(0);
      });
    });

    it('should fail with exactly 50%', async () => {
      setMockResponses('CA-ON', [
        {
          jurisdiction: 'CA-ON',
          thresholdPercent: 50,
        },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={500}
          votesAgainst={500}
          totalVotesCast={1000}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/FAILED/i)).toBeInTheDocument();
        // Exactly 50% is not enough - needs 50%+1
      });
    });
  });

  describe('Real-Time Vote Status Tracker', () => {
    it('should render progress bars', async () => {
      setMockResponses('CA-ON', [
        {
          jurisdiction: 'CA-ON',
          thresholdPercent: 50,
        },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={600}
          votesAgainst={400}
          totalVotesCast={1000}
        />
      );

      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });

    it('should show votes in favor percentage', async () => {
      setMockResponses('CA-ON', [
        { jurisdiction: 'CA-ON', thresholdPercent: 50 },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={600}
          votesAgainst={400}
          totalVotesCast={1000}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/60\.0\s*%/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Vote Breakdown Grid', () => {
    it('should display votes in favor count', async () => {
      setMockResponses('CA-FED', [
        { jurisdiction: 'CA-FED', thresholdPercent: 50 },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={600}
          votesAgainst={400}
          totalVotesCast={1000}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('600')).toBeInTheDocument(); // Votes in favor
      });
    });

    it('should display votes against count', async () => {
      setMockResponses('CA-FED', [
        { jurisdiction: 'CA-FED', thresholdPercent: 50 },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={600}
          votesAgainst={400}
          totalVotesCast={1000}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('400')).toBeInTheDocument(); // Votes against
      });
    });

    it('should display total votes cast', async () => {
      setMockResponses('CA-BC', [
        { jurisdiction: 'CA-BC', thresholdPercent: 50 },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={450}
          votesAgainst={350}
          totalVotesCast={800}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('800')).toBeInTheDocument(); // Total cast
      });
    });
  });

  describe('Multi-Jurisdiction Comparison', () => {
    it('should render comparison card', async () => {
      setMockResponses('CA-ON', [
        { jurisdiction: 'CA-ON', thresholdPercent: 50 },
      ]);

      render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={600}
          votesAgainst={400}
          totalVotesCast={1000}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Strike Vote Requirements Across Canada/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should return null when fetch fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const { container } = render(
        <StrikeVoteJurisdictionInfo
          voteId="vote-1"
          tenantId="tenant-1"
          totalEligibleMembers={1000}
          votesInFavor={600}
          votesAgainst={400}
          totalVotesCast={1000}
        />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });
});
