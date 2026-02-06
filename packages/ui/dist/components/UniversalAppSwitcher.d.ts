import React from 'react';
export interface AppItem {
    id: string;
    name: string;
    color: string;
    icon: React.ComponentType<any>;
    url: string;
    port: number;
    category: 'practice' | 'tool' | 'admin';
    description?: string;
}
export declare const allApps: AppItem[];
export declare const practiceAreas: AppItem[];
export declare const legalTools: AppItem[];
export declare const adminTools: AppItem[];
export declare const businessUnits: {
    id: string;
    name: string;
    color: string;
    icon: React.ComponentType<any>;
    url: string;
    port: number;
}[];
interface UniversalAppSwitcherProps {
    currentApp?: string;
    onAppChange?: (appId: string) => void;
    showCategories?: boolean;
}
export default function UniversalAppSwitcher({ currentApp, onAppChange, showCategories }: UniversalAppSwitcherProps): import("react/jsx-runtime").JSX.Element;
export declare function BusinessUnitSwitcher({ currentUnit, onUnitChange }: {
    currentUnit?: string;
    onUnitChange?: (unitId: string) => void;
}): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=UniversalAppSwitcher.d.ts.map