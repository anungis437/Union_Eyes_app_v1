import React from 'react';
export interface BusinessUnit {
    id: string;
    name: string;
    color: string;
    icon: React.ComponentType<any>;
    url: string;
    port: number;
}
export declare const businessUnits: BusinessUnit[];
interface BusinessUnitSwitcherProps {
    currentUnit: string;
    onUnitChange?: (unitId: string) => void;
}
export default function BusinessUnitSwitcher({ currentUnit, onUnitChange }: BusinessUnitSwitcherProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=BusinessUnitSwitcher.d.ts.map