import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  JurisdictionSelector,
  MultiJurisdictionSelector
} from '@/components/jurisdiction/jurisdiction-selector';

describe('JurisdictionSelector', () => {
  describe('Rendering', () => {
    it('should render selector with placeholder', () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector onChange={onChange} />);
      expect(screen.getByText('Select jurisdiction')).toBeInTheDocument();
    });

    it('should render with selected value', () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="CA-ON" onChange={onChange} />);
      expect(screen.getByText('Ontario')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should render disabled selector', () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector onChange={onChange} disabled />);

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
    });
  });

  describe('MultiJurisdictionSelector', () => {
    it('renders selected jurisdictions and allows removal', () => {
      const onChange = vi.fn();
      render(
        <MultiJurisdictionSelector
          value={['CA-ON', 'CA-BC']}
          onChange={onChange}
        />
      );

      expect(screen.getByText('Ontario')).toBeInTheDocument();
      expect(screen.getByText('British Columbia')).toBeInTheDocument();

      const removeButton = screen.getByText('Ontario').closest('button');
      expect(removeButton).not.toBeNull();
      fireEvent.click(removeButton as HTMLButtonElement);

      expect(onChange).toHaveBeenCalledWith(['CA-BC']);
    });

    it('disables selection controls when disabled', () => {
      const onChange = vi.fn();
      render(
        <MultiJurisdictionSelector
          value={['CA-ON']}
          onChange={onChange}
          disabled
        />
      );

      const removeButton = screen.getByText('Ontario').closest('button');
      expect(removeButton).toBeDisabled();

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
    });
  });

});
