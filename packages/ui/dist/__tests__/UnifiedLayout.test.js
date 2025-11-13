import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Home, Briefcase, FileText } from 'lucide-react';
import '@testing-library/jest-dom';
import UnifiedLayout from '../components/UnifiedLayout';
const mockNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/matters', label: 'Matters', icon: Briefcase },
    { path: '/documents', label: 'Documents', icon: FileText },
];
const renderUnifiedLayout = (props = {}) => {
    const defaultProps = {
        businessUnitId: 'real-estate',
        businessUnitName: 'Real Estate Law',
        businessUnitIcon: Home,
        navItems: mockNavItems,
        color: 'blue',
        integrations: 'Unity, Teraview, DocuSign',
        children: _jsx("div", { children: "Test Content" }),
        ...props
    };
    return render(_jsx(BrowserRouter, { children: _jsx(UnifiedLayout, { ...defaultProps }) }));
};
describe('UnifiedLayout', () => {
    it('renders with business unit branding', () => {
        renderUnifiedLayout();
        expect(screen.getByText('Real Estate Law')).toBeInTheDocument();
        expect(screen.getByText('Unity, Teraview, DocuSign')).toBeInTheDocument();
    });
    it('displays navigation items correctly', () => {
        renderUnifiedLayout();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Matters')).toBeInTheDocument();
        expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    it('applies correct color scheme', () => {
        renderUnifiedLayout({ color: 'purple' });
        const layout = screen.getByTestId('unified-layout');
        expect(layout).toHaveClass('bg-purple-900');
    });
    it('renders business unit switcher', () => {
        renderUnifiedLayout();
        expect(screen.getByRole('button', { name: /business unit/i })).toBeInTheDocument();
    });
    it('handles navigation clicks', () => {
        renderUnifiedLayout();
        const dashboardLink = screen.getByText('Dashboard');
        fireEvent.click(dashboardLink);
        // Navigation would be handled by React Router
        expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard');
    });
    it('shows active navigation state', () => {
        // Mock current location
        Object.defineProperty(window, 'location', {
            value: { pathname: '/matters' },
            writable: true
        });
        renderUnifiedLayout();
        const mattersLink = screen.getByText('Matters');
        expect(mattersLink.closest('a')).toHaveClass('bg-blue-800');
    });
    it('renders children content', () => {
        renderUnifiedLayout();
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
    it('is accessible', () => {
        renderUnifiedLayout();
        // Check for proper ARIA labels and structure
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
    });
    it('supports different business units', () => {
        renderUnifiedLayout({
            businessUnitId: 'wills-estates',
            businessUnitName: 'Wills & Estates',
            color: 'purple',
            integrations: 'WillConnect, WhatsApp'
        });
        expect(screen.getByText('Wills & Estates')).toBeInTheDocument();
        expect(screen.getByText('WillConnect, WhatsApp')).toBeInTheDocument();
    });
    it('handles mobile responsive design', () => {
        // Mock mobile viewport
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 768
        });
        renderUnifiedLayout();
        // Should show mobile menu toggle
        expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });
    it('displays integration badges correctly', () => {
        renderUnifiedLayout({
            integrations: 'Unity, Teraview, DocuSign, Monday.com'
        });
        const integrationText = screen.getByText(/Unity, Teraview, DocuSign, Monday.com/);
        expect(integrationText).toBeInTheDocument();
    });
});
//# sourceMappingURL=UnifiedLayout.test.js.map