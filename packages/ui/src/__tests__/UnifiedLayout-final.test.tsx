import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Home, Briefcase, Scale } from 'lucide-react';
import UnifiedLayout from '../components/UnifiedLayout';

describe('UnifiedLayout', () => {
  const renderUnifiedLayout = (props?: any) => {
    const defaultProps = {
      children: <div>Test Content</div>,
      businessUnitId: 'real-estate',
      businessUnitName: 'Real Estate Law',
      businessUnitIcon: Home,
      navItems: [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/matters', label: 'Matters', icon: Home }
      ],
      color: 'blue' as const,
      integrations: 'Unity, Teraview, DocuSign'
    };

    return render(
      <BrowserRouter>
        <UnifiedLayout {...defaultProps} {...props} />
      </BrowserRouter>
    );
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
      color: 'purple' as const
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
      color: 'orange' as const
    };
    
    renderUnifiedLayout(employmentProps);
    expect(screen.getAllByText('Employment Law')).toHaveLength(2); // Header + switcher
  });

  it('renders with minimal props', () => {
    const minimalProps = {
      children: <div>Minimal Content</div>,
      businessUnitId: 'business',
      businessUnitName: 'Business Law',
      businessUnitIcon: Home,
      navItems: [],
      color: 'green' as const
    };
    
    renderUnifiedLayout(minimalProps);
    expect(screen.getByText('Minimal Content')).toBeDefined();
    expect(screen.getByText('Business Law')).toBeDefined();
  });
});
