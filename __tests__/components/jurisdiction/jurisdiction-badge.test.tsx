import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JurisdictionBadge } from '@/components/jurisdiction/jurisdiction-badge';
import type { CAJurisdiction } from '@/lib/jurisdiction-helpers';

describe('JurisdictionBadge', () => {
  describe('Federal Jurisdiction', () => {
    it('should render Federal badge with correct text', () => {
      render(<JurisdictionBadge jurisdiction="CA-FED" />);
      expect(screen.getByText('Federal')).toBeInTheDocument();
    });

    it('should render Federal badge with blue color', () => {
      render(<JurisdictionBadge jurisdiction="CA-FED" />);
      const badge = screen.getByText('Federal').closest('div');
      expect(badge).toHaveClass('bg-blue-500');
    });

    it('should show bilingual indicator for Federal', () => {
      render(<JurisdictionBadge jurisdiction="CA-FED" showBilingual />);
      expect(screen.getByText(/EN\/FR/i)).toBeInTheDocument();
    });
  });

  describe('Quebec Jurisdiction', () => {
    it('should render Quebec badge', () => {
      render(<JurisdictionBadge jurisdiction="CA-QC" />);
      expect(screen.getByText('Quebec')).toBeInTheDocument();
    });

    it('should show bilingual indicator for Quebec', () => {
      render(<JurisdictionBadge jurisdiction="CA-QC" showBilingual />);
      expect(screen.getByText(/EN\/FR/i)).toBeInTheDocument();
    });
  });

  describe('Ontario Jurisdiction', () => {
    it('should render Ontario badge', () => {
      render(<JurisdictionBadge jurisdiction="CA-ON" />);
      expect(screen.getByText('Ontario')).toBeInTheDocument();
    });

    it('should NOT show bilingual indicator for Ontario', () => {
      render(<JurisdictionBadge jurisdiction="CA-ON" showBilingual />);
      expect(screen.queryByText(/EN\/FR/i)).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render small badge', () => {
      render(<JurisdictionBadge jurisdiction="CA-AB" size="sm" />);
      const badge = screen.getByText('Alberta').closest('div');
      expect(badge).toHaveClass('text-xs');
    });

    it('should render medium badge (default)', () => {
      render(<JurisdictionBadge jurisdiction="CA-AB" />);
      const badge = screen.getByText('Alberta').closest('div');
      expect(badge).toHaveClass('text-sm');
    });

    it('should render large badge', () => {
      render(<JurisdictionBadge jurisdiction="CA-AB" size="lg" />);
      const badge = screen.getByText('Alberta').closest('div');
      expect(badge).toHaveClass('text-base');
    });
  });

  describe('All Jurisdictions', () => {
    const jurisdictions: [CAJurisdiction, string][] = [
      ['CA-FED', 'Federal'],
      ['CA-AB', 'Alberta'],
      ['CA-BC', 'British Columbia'],
      ['CA-MB', 'Manitoba'],
      ['CA-NB', 'New Brunswick'],
      ['CA-NL', 'Newfoundland and Labrador'],
      ['CA-NS', 'Nova Scotia'],
      ['CA-NT', 'Northwest Territories'],
      ['CA-NU', 'Nunavut'],
      ['CA-ON', 'Ontario'],
      ['CA-PE', 'Prince Edward Island'],
      ['CA-QC', 'Quebec'],
      ['CA-SK', 'Saskatchewan'],
      ['CA-YT', 'Yukon'],
    ];

    jurisdictions.forEach(([code, name]) => {
      it(`should render ${name} badge`, () => {
        render(<JurisdictionBadge jurisdiction={code} />);
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label', () => {
      render(<JurisdictionBadge jurisdiction="CA-ON" />);
      const badge = screen.getByText('Ontario').closest('div');
      expect(badge).toHaveAttribute('role', 'status');
    });

    it('should have aria-label for jurisdiction', () => {
      render(<JurisdictionBadge jurisdiction="CA-FED" />);
      const badge = screen.getByText('Federal').closest('div');
      expect(badge).toHaveAttribute('aria-label', 'Jurisdiction: Federal');
    });
  });
});
