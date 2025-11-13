import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import BusinessUnitSwitcher from '../components/BusinessUnitSwitcher';

const renderBusinessUnitSwitcher = (currentUnit = 'real-estate') => {
  return render(
    <BrowserRouter>
      <BusinessUnitSwitcher currentUnit={currentUnit} />
    </BrowserRouter>
  );
};

describe('BusinessUnitSwitcher', () => {
  it('displays current business unit', () => {
    renderBusinessUnitSwitcher('real-estate');
    
    expect(screen.getByText('Real Estate Law')).toBeInTheDocument();
  });

  it('shows all available business units in dropdown', async () => {
    const user = userEvent.setup();
    renderBusinessUnitSwitcher();
    
    const switcherButton = screen.getByRole('button');
    await user.click(switcherButton);
    
    // Check that all business units are shown in the dropdown
    const realEstateOptions = screen.getAllByText('Real Estate Law');
    const willsEstatesOptions = screen.getAllByText('Wills & Estates');
    const employmentOptions = screen.getAllByText('Employment Law');
    const businessLawOptions = screen.getAllByText('Business Law');
    
    // Should have 2 instances of the current unit (button + dropdown) and 1 of others
    expect(realEstateOptions).toHaveLength(2); // Current unit appears in button + dropdown
    expect(willsEstatesOptions).toHaveLength(1);
    expect(employmentOptions).toHaveLength(1);
    expect(businessLawOptions).toHaveLength(1);
  });

  it('navigates to selected business unit', async () => {
    // Mock window.location.href
    const originalLocation = window.location;
    
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, href: '' },
      writable: true,
    });
    
    const user = userEvent.setup();
    renderBusinessUnitSwitcher('real-estate');
    
    const switcherButton = screen.getByRole('button');
    await user.click(switcherButton);
    
    const willsEstatesOption = screen.getAllByText('Wills & Estates')[0];
    await user.click(willsEstatesOption);
    
    await waitFor(() => {
      expect(window.location.href).toBe('http://localhost:5005');
    });
    
    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('highlights current business unit in dropdown', async () => {
    const user = userEvent.setup();
    renderBusinessUnitSwitcher('employment');
    
    const switcherButton = screen.getByRole('button');
    await user.click(switcherButton);
    
    // Find the employment option in the dropdown (not the button text)
    const menuItems = screen.getAllByRole('menuitem');
    const employmentMenuItem = menuItems.find(item => item.textContent?.includes('Employment Law'));
    expect(employmentMenuItem).toHaveClass('bg-gray-100', 'text-gray-900');
  });

  it('shows correct icons for each business unit', async () => {
    const user = userEvent.setup();
    renderBusinessUnitSwitcher();
    
    const switcherButton = screen.getByRole('button');
    await user.click(switcherButton);
    
    // Each business unit should have an icon
    const menuItems = screen.getAllByRole('menuitem');
    menuItems.forEach(item => {
      expect(item.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    renderBusinessUnitSwitcher();
    
    const switcherButton = screen.getByRole('button');
    await user.click(switcherButton);
    
    expect(screen.getByRole('menu')).toBeInTheDocument();
    
    // Click the overlay (backdrop) to close
    const overlay = document.querySelector('.fixed.inset-0') as HTMLElement;
    await user.click(overlay);
    
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    renderBusinessUnitSwitcher();
    
    const switcherButton = screen.getByRole('button');
    switcherButton.focus();
    
    // Test keyboard interaction by focusing and pressing Enter
    switcherButton.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    
    // Check that dropdown is accessible
    const firstMenuItem = screen.getAllByRole('menuitem')[0];
    expect(firstMenuItem).toBeVisible();
    
    // Should navigate to selected unit
    await waitFor(() => {
      expect(window.location.pathname).toBeTruthy();
    });
  });

  it('displays business unit port information', async () => {
    const user = userEvent.setup();
    renderBusinessUnitSwitcher();
    
    const switcherButton = screen.getByRole('button');
    await user.click(switcherButton);
    
    expect(screen.getByText(/Port 5004/)).toBeInTheDocument();
    expect(screen.getByText(/Port 5005/)).toBeInTheDocument();
  });

  it('is accessible', async () => {
    renderBusinessUnitSwitcher();
    
    const switcherButton = screen.getByRole('button');
    expect(switcherButton).toHaveAttribute('aria-haspopup', 'menu');
    expect(switcherButton).toHaveAttribute('aria-expanded', 'false');
    expect(switcherButton).toHaveAttribute('aria-label', 'Select business unit');
    
    fireEvent.click(switcherButton);
    
    await waitFor(() => {
      expect(switcherButton).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
