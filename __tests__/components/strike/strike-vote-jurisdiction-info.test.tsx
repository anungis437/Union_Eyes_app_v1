import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StrikeVoteJurisdictionInfo } from '@/components/strike/strike-vote-jurisdiction-info';

// Mock fetch
global.fetch = vi.fn();

describe('StrikeVoteJurisdictionInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Manitoba - 65% Super-Majority', () => {
    it('should show Manitoba requires 65% of votes cast', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-MB',
              ruleCategory: 'strike_vote',
              thresholdPercent: 65,
              legalReference: 'Manitoba Labour Relations Act',
            },
          ],
        }),
      });

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
        expect(screen.getByText(/65%/i)).toBeInTheDocument();
        expect(screen.getByText(/Manitoba/i)).toBeInTheDocument();
      });
    });

    it('should pass vote with 65% or more in favor', async () => {
      (global.fetch as any).mockResolvedValueOnce({
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
        expect(screen.getByText(/65\.0%/i)).toBeInTheDocument();
      });
    });

    it('should fail vote with less than 65%', async () => {
      (global.fetch as any).mockResolvedValueOnce({
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
        expect(screen.getByText(/60\.0%/i)).toBeInTheDocument(); // Only 60%
      });
    });
  });

  describe('Saskatchewan - 45% of Eligible Members (Special Rule)', () => {
    it('should calculate based on eligible members, not votes cast', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-SK',
              thresholdPercent: 45,
              calculationBase: 'eligible_members',
              legalReference: 'Saskatchewan Trade Union Act',
            },
          ],
        }),
      });

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
        expect(screen.getByText(/Saskatchewan/i)).toBeInTheDocument();
        expect(screen.getByText(/45% of eligible members/i)).toBeInTheDocument();
        // 450/1000 = 45% of eligible members
        expect(screen.getByText(/45\.0%/i)).toBeInTheDocument();
      });
    });

    it('should pass with 45% of eligible members', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-SK',
              thresholdPercent: 45,
              calculationBase: 'eligible_members',
            },
          ],
        }),
      });

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
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-SK',
              thresholdPercent: 45,
              calculationBase: 'eligible_members',
            },
          ],
        }),
      });

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
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-NB',
              thresholdPercent: 60,
            },
          ],
        }),
      });

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
        expect(screen.getByText(/60%/i)).toBeInTheDocument();
      });
    });
  });

  describe('Standard 50%+1 Jurisdictions', () => {
    it('should pass with simple majority (51%)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-ON',
              thresholdPercent: 50,
            },
          ],
        }),
      });

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
        expect(screen.getByText(/51\.0%/i)).toBeInTheDocument();
      });
    });

    it('should fail with exactly 50%', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-ON',
              thresholdPercent: 50,
            },
          ],
        }),
      });

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
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [
            {
              jurisdiction: 'CA-ON',
              thresholdPercent: 50,
            },
          ],
        }),
      });

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
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [{ jurisdiction: 'CA-ON', thresholdPercent: 50 }],
        }),
      });

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
        expect(screen.getByText(/60\.0%/i)).toBeInTheDocument();
      });
    });
  });

  describe('Vote Breakdown Grid', () => {
    it('should display votes in favor count', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [{ jurisdiction: 'CA-FED', thresholdPercent: 50 }],
        }),
      });

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
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [{ jurisdiction: 'CA-FED', thresholdPercent: 50 }],
        }),
      });

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
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [{ jurisdiction: 'CA-BC', thresholdPercent: 50 }],
        }),
      });

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
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          rules: [{ jurisdiction: 'CA-ON', thresholdPercent: 50 }],
        }),
      });

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
          screen.getByText(/Compare with other jurisdictions/i)
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
