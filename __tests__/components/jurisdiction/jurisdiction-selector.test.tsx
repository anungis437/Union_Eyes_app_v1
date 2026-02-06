import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JurisdictionSelector } from '@/components/jurisdiction/jurisdiction-selector';

describe('JurisdictionSelector', () => {
  describe('Rendering', () => {
    it('should render selector with placeholder', () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} />);
      expect(screen.getByText('Select jurisdiction...')).toBeInTheDocument();
    });

    it('should render with selected value', () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="CA-ON" onChange={onChange} />);
      expect(screen.getByText('Ontario')).toBeInTheDocument();
    });
  });

  describe('Dropdown Interaction', () => {
    it('should show all 14 jurisdictions when opened', async () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} />);

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByText('Federal')).toBeInTheDocument();
        expect(screen.getByText('Alberta')).toBeInTheDocument();
        expect(screen.getByText('Ontario')).toBeInTheDocument();
        expect(screen.getByText('Quebec')).toBeInTheDocument();
      });
    });

    it('should call onChange when jurisdiction selected', async () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} />);

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      const ontarioOption = await screen.findByText('Ontario');
      await userEvent.click(ontarioOption);

      expect(onChange).toHaveBeenCalledWith('CA-ON');
    });
  });

  describe('Grouping', () => {
    it('should group jurisdictions by type', async () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} />);

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Federal')).toBeInTheDocument();
        expect(screen.getByText('Provinces')).toBeInTheDocument();
        expect(screen.getByText('Territories')).toBeInTheDocument();
      });
    });

    it('should show Federal in its own group', async () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} />);

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      const federalGroup = await screen.findByText('Federal');
      expect(federalGroup.closest('[role="group"]')).toHaveAttribute(
        'aria-label',
        'Federal'
      );
    });

    it('should show provinces in Provinces group', async () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} />);

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        const provincesGroup = screen.getByText('Provinces').closest('[role="group"]');
        expect(provincesGroup).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter jurisdictions by search term', async () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} searchable />);

      const searchInput = screen.getByPlaceholderText('Search jurisdictions...');
      await userEvent.type(searchInput, 'Ont');

      await waitFor(() => {
        expect(screen.getByText('Ontario')).toBeInTheDocument();
        expect(screen.queryByText('Alberta')).not.toBeInTheDocument();
        expect(screen.queryByText('Quebec')).not.toBeInTheDocument();
      });
    });

    it('should show all jurisdictions when search cleared', async () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} searchable />);

      const searchInput = screen.getByPlaceholderText('Search jurisdictions...');
      await userEvent.type(searchInput, 'Ont');
      await userEvent.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Ontario')).toBeInTheDocument();
        expect(screen.getByText('Alberta')).toBeInTheDocument();
        expect(screen.getByText('Quebec')).toBeInTheDocument();
      });
    });

    it('should show "No results" when no jurisdictions match', async () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} searchable />);

      const searchInput = screen.getByPlaceholderText('Search jurisdictions...');
      await userEvent.type(searchInput, 'XYZ');

      await waitFor(() => {
        expect(screen.getByText('No jurisdictions found')).toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('should render disabled selector', () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} disabled />);

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
    });

    it('should not open dropdown when disabled', async () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} disabled />);

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      expect(screen.queryByText('Alberta')).not.toBeInTheDocument();
    });

    it('should not call onChange when disabled', async () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} disabled />);

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} />);

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('should support keyboard navigation', async () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} />);

      const trigger = screen.getByRole('combobox');
      trigger.focus();

      // Press Enter to open dropdown
      fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
      });

      // Press ArrowDown to navigate
      fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });

      // Press Enter to select
      fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });

      expect(onChange).toHaveBeenCalled();
    });

    it('should close dropdown on Escape key', async () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} />);

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
      });

      fireEvent.keyDown(trigger, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  describe('Required Field', () => {
    it('should show required indicator', () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} required />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should have aria-required attribute', () => {
      const onChange = vi.fn();
      render(<JurisdictionSelector value="" onChange={onChange} required />);

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-required', 'true');
    });
  });
});
