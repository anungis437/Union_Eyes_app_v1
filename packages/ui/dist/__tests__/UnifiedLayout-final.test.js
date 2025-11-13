import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Home, Briefcase, Scale } from 'lucide-react';
import UnifiedLayout from '../components/UnifiedLayout';
describe('UnifiedLayout', () => {
    const renderUnifiedLayout = (props) => {
        const defaultProps = {
            children: _jsx("div", { children: "Test Content" }),
            businessUnitId: 'real-estate',
            businessUnitName: 'Real Estate Law',
            businessUnitIcon: Home,
            navItems: [
                { path: '/dashboard', label: 'Dashboard', icon: Home },
                { path: '/matters', label: 'Matters', icon: Home }
            ],
            color: 'blue',
            integrations: 'Unity, Teraview, DocuSign'
        };
        return render(_jsx(BrowserRouter, { children: _jsx(UnifiedLayout, { ...defaultProps, ...props }) }));
    };
    it('renders with business unit branding', () => {
        renderUnifiedLayout();
        expect(screen.getAllByText('Real Estate Law')).toHaveLength(2); // Header + switcher
        expect(screen.getByText('Nungisa Law')).toBeDefined();
    });
    it('displays navigation items correctly', () => {
        renderUnifiedLayout();
        expect(screen.getByText('Dashboard')).toBeDefined();
        expect(screen.getByText('Matters')).toBeDefined();
    });
    it('applies correct color scheme for wills unit', () => {
        const willsProps = {
            businessUnitId: 'wills',
            businessUnitName: 'Wills & Estates Law',
            businessUnitIcon: Scale,
            color: 'purple'
        };
        renderUnifiedLayout(willsProps);
        expect(screen.getByText('Wills & Estates Law')).toBeDefined();
    });
    it('renders business unit switcher', () => {
        renderUnifiedLayout();
        expect(screen.getByLabelText('Select business unit')).toBeDefined();
    });
    it('renders children content', () => {
        renderUnifiedLayout();
        expect(screen.getByText('Test Content')).toBeDefined();
    });
    it('displays integration badges correctly', () => {
        renderUnifiedLayout();
        expect(screen.getByText('Integrations')).toBeDefined();
        expect(screen.getByText('Unity, Teraview, DocuSign')).toBeDefined();
    });
    it('supports different business units', () => {
        const employmentProps = {
            businessUnitId: 'employment',
            businessUnitName: 'Employment Law',
            businessUnitIcon: Briefcase,
            color: 'orange'
        };
        renderUnifiedLayout(employmentProps);
        expect(screen.getAllByText('Employment Law')).toHaveLength(2); // Header + switcher
    });
    it('renders with minimal props', () => {
        const minimalProps = {
            children: _jsx("div", { children: "Minimal Content" }),
            businessUnitId: 'business',
            businessUnitName: 'Business Law',
            businessUnitIcon: Home,
            navItems: [],
            color: 'green'
        };
        renderUnifiedLayout(minimalProps);
        expect(screen.getByText('Minimal Content')).toBeDefined();
        expect(screen.getByText('Business Law')).toBeDefined();
    });
});
//# sourceMappingURL=UnifiedLayout-final.test.js.map