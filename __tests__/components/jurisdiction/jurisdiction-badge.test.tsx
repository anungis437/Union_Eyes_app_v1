import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JurisdictionBadge } from '@/components/jurisdiction/jurisdiction-badge';
import type { CAJurisdiction } from '@/lib/jurisdiction-helpers-client';

describe('JurisdictionBadge', () => {
  describe('Federal Jurisdiction', () => {
    it('should render Federal badge with correct text', () => {
      render(<JurisdictionBadge jurisdiction="CA-FED" />);
      expect(screen.getByText('Federal')).toBeInTheDocument();
    });

    it('should render Federal badge with red color', () => {
      render(<JurisdictionBadge jurisdiction="CA-FED" />);
      const badge = screen.getByText('Federal').closest('div');
      expect(badge).toHaveClass('bg-red-100');
    });
  });

  describe('Quebec Jurisdiction', () => {
    it('should render Quebec badge', () => {
      render(<JurisdictionBadge jurisdiction="CA-QC" />);
      expect(screen.getByText('Quebec')).toBeInTheDocument();
    });

    it('should render Quebec badge with indigo color', () => {
      render(<JurisdictionBadge jurisdiction="CA-QC" />);
      const badge = screen.getByText('Quebec').closest('div');
      expect(badge).toHaveClass('bg-indigo-100');
    });
  });

  describe('Ontario Jurisdiction', () => {
    it('should render Ontario badge', () => {
      render(<JurisdictionBadge jurisdiction="CA-ON" />);
      expect(screen.getByText('Ontario')).toBeInTheDocument();
    });

    it('should render Ontario badge with blue color', () => {
      render(<JurisdictionBadge jurisdiction="CA-ON" />);
      const badge = screen.getByText('Ontario').closest('div');
      expect(badge).toHaveClass('bg-blue-100');
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

  describe('Rendering Options', () => {
    it('should render code when showName is false', () => {
      render(<JurisdictionBadge jurisdiction="CA-ON" showName={false} />);
      expect(screen.getByText('CA-ON')).toBeInTheDocument();
    });
  });
});
