import React from 'react';
export interface NavItem {
    path: string;
    label: string;
    icon: React.ComponentType<any>;
}
interface UnifiedLayoutProps {
    children: React.ReactNode;
    businessUnitId: string;
    businessUnitName: string;
    businessUnitIcon: React.ComponentType<any>;
    navItems: NavItem[];
    integrations?: string;
}
export default function UnifiedLayout({ children, businessUnitId, businessUnitName, businessUnitIcon: BusinessUnitIcon, navItems, integrations, }: UnifiedLayoutProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=UnifiedLayout.d.ts.map