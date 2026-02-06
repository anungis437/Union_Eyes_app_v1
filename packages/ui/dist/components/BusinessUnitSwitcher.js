import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Building, Home, Users, Briefcase, ChevronDown } from 'lucide-react';
export const businessUnits = [
    {
        id: 'real-estate',
        name: 'Real Estate Law',
        color: 'blue',
        icon: Home,
        url: 'http://localhost:5004',
        port: 5004,
    },
    {
        id: 'wills-estates',
        name: 'Wills & Estates',
        color: 'purple',
        icon: Users,
        url: 'http://localhost:5005',
        port: 5005,
    },
    {
        id: 'employment',
        name: 'Employment Law',
        color: 'orange',
        icon: Briefcase,
        url: 'http://localhost:5006',
        port: 5006,
    },
    {
        id: 'business-law',
        name: 'Business Law',
        color: 'green',
        icon: Building,
        url: 'http://localhost:5007',
        port: 5007,
    },
];
export default function BusinessUnitSwitcher({ currentUnit, onUnitChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const current = businessUnits.find((u) => u.id === currentUnit);
    const CurrentIcon = current?.icon || Building;
    const colorClasses = {
        blue: 'bg-blue-600 hover:bg-blue-700',
        purple: 'bg-purple-600 hover:bg-purple-700',
        orange: 'bg-orange-600 hover:bg-orange-700',
        green: 'bg-green-600 hover:bg-green-700',
    };
    const handleUnitSelect = (unit) => {
        setIsOpen(false);
        if (onUnitChange) {
            onUnitChange(unit.id);
        }
        else {
            // Default behavior: navigate to the unit's URL
            window.location.href = unit.url;
        }
    };
    return (_jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setIsOpen(!isOpen), "aria-haspopup": "menu", "aria-expanded": isOpen ? 'true' : 'false', "aria-label": "Select business unit", className: `w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${current ? colorClasses[current.color] : 'bg-gray-600 hover:bg-gray-700'} text-white`, children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(CurrentIcon, { className: "h-5 w-5" }), _jsx("span", { className: "font-medium", children: current?.name || 'Select Unit' })] }), _jsx(ChevronDown, { className: `h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}` })] }), isOpen && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-10", onClick: () => setIsOpen(false) }), _jsx("div", { role: "menu", className: "absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-20", children: businessUnits.map((unit) => {
                            const Icon = unit.icon;
                            const isActive = unit.id === currentUnit;
                            return (_jsxs("button", { role: "menuitem", onClick: () => handleUnitSelect(unit), className: `w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${isActive
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'text-gray-700 hover:bg-gray-50'}`, children: [_jsx(Icon, { className: `h-5 w-5 ${unit.color === 'blue' ? 'text-blue-600' :
                                            unit.color === 'purple' ? 'text-purple-600' :
                                                unit.color === 'orange' ? 'text-orange-600' :
                                                    'text-green-600'}` }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "font-medium", children: unit.name }), _jsxs("div", { className: "text-xs text-gray-500", children: ["Port ", unit.port] })] }), isActive && (_jsx("div", { className: "w-2 h-2 bg-green-500 rounded-full" }))] }, unit.id));
                        }) })] }))] }));
}
//# sourceMappingURL=BusinessUnitSwitcher.js.map