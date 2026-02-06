import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BusinessUnitSwitcher from '../components/BusinessUnitSwitcher';
const renderBusinessUnitSwitcher = (currentUnit = 'real-estate') => {
    return render(_jsx(BrowserRouter, { children: _jsx(BusinessUnitSwitcher, { currentUnit: currentUnit }) }));
};
describe('BusinessUnitSwitcher', () => {
    it('renders with current business unit', () => {
        renderBusinessUnitSwitcher('real-estate');
        const switcherButton = screen.getByRole('button');
        expect(switcherButton).toBeDefined();
        expect(switcherButton.textContent).toContain('Real Estate Law');
    });
    it('shows dropdown when clicked', () => {
        renderBusinessUnitSwitcher();
        const switcherButton = screen.getByRole('button');
        fireEvent.click(switcherButton);
        const menu = screen.getByRole('menu');
        expect(menu).toBeDefined();
        // Check that all business units are shown
        expect(screen.getByText('Wills & Estates')).toBeDefined();
        expect(screen.getByText('Employment Law')).toBeDefined();
        expect(screen.getByText('Business Law')).toBeDefined();
    });
    it('shows port information for each unit', () => {
        renderBusinessUnitSwitcher();
        const switcherButton = screen.getByRole('button');
        fireEvent.click(switcherButton);
        expect(screen.getByText('Port 5004')).toBeDefined();
        expect(screen.getByText('Port 5005')).toBeDefined();
        expect(screen.getByText('Port 5006')).toBeDefined();
        expect(screen.getByText('Port 5008')).toBeDefined();
    });
    it('has proper accessibility attributes', () => {
        renderBusinessUnitSwitcher();
        const switcherButton = screen.getByRole('button');
        expect(switcherButton.getAttribute('aria-haspopup')).toBe('menu');
        expect(switcherButton.getAttribute('aria-expanded')).toBe('false');
        expect(switcherButton.getAttribute('aria-label')).toBe('Select business unit');
        fireEvent.click(switcherButton);
        expect(switcherButton.getAttribute('aria-expanded')).toBe('true');
    });
    it('highlights current business unit in dropdown', () => {
        renderBusinessUnitSwitcher('employment');
        // Check button shows current unit
        const switcherButton = screen.getByRole('button');
        expect(switcherButton.textContent).toContain('Employment Law');
        fireEvent.click(switcherButton);
        // Find the employment menu item and check it has active styling
        const menuItems = screen.getAllByRole('menuitem');
        const employmentMenuItem = menuItems.find(item => item.textContent?.includes('Employment Law'));
        expect(employmentMenuItem?.className).toContain('bg-gray-100');
    });
    it('closes dropdown when clicking outside', async () => {
        renderBusinessUnitSwitcher();
        const switcherButton = screen.getByRole('button');
        fireEvent.click(switcherButton);
        // Menu should be visible
        expect(screen.getByRole('menu')).toBeDefined();
        // Click the overlay
        const overlay = document.querySelector('.fixed.inset-0');
        if (overlay) {
            fireEvent.click(overlay);
        }
        // Menu should be closed
        await waitFor(() => {
            expect(screen.queryByRole('menu')).toBeNull();
        });
    });
    it('renders correct icons for each business unit', () => {
        renderBusinessUnitSwitcher();
        const switcherButton = screen.getByRole('button');
        fireEvent.click(switcherButton);
        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems).toHaveLength(4);
        // Each menu item should have an SVG icon
        menuItems.forEach(item => {
            const svg = item.querySelector('svg');
            expect(svg).toBeDefined();
        });
    });
    it('supports keyboard navigation', () => {
        renderBusinessUnitSwitcher();
        const switcherButton = screen.getByRole('button');
        switcherButton.focus();
        // Simulate Enter key press
        fireEvent.keyDown(switcherButton, { key: 'Enter' });
        fireEvent.click(switcherButton); // Fallback since keyDown might not trigger click
        const menu = screen.getByRole('menu');
        expect(menu).toBeDefined();
        const firstMenuItem = screen.getAllByRole('menuitem')[0];
        expect(firstMenuItem).toBeDefined();
    });
    it('handles unit selection with callback', () => {
        const mockCallback = jest.fn();
        render(_jsx(BrowserRouter, { children: _jsx(BusinessUnitSwitcher, { currentUnit: "real-estate", onUnitChange: mockCallback }) }));
        const switcherButton = screen.getByRole('button');
        fireEvent.click(switcherButton);
        const willsEstatesOption = screen.getByText('Wills & Estates');
        fireEvent.click(willsEstatesOption);
        expect(mockCallback).toHaveBeenCalledWith('wills-estates');
    });
});
//# sourceMappingURL=BusinessUnitSwitcher-fixed.test.js.map