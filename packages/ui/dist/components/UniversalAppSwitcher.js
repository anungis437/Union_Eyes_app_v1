import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Building, Home, Users, Briefcase, ChevronDown, Search, FileText, Scale, Brain, BookOpen, CheckSquare, Settings, BarChart3, Upload, Eye, HelpCircle, Calculator, Grid } from 'lucide-react';
// All Apps (Practice Areas + Specialized Tools + Admin)
export const allApps = [
    // Core Practice Areas (4 MVPs)
    {
        id: 'real-estate',
        name: 'Real Estate Law',
        color: 'blue',
        icon: Home,
        url: 'http://localhost:5004',
        port: 5004,
        category: 'practice',
        description: 'Property transactions, conveyancing, LSUC compliance'
    },
    {
        id: 'wills-estates',
        name: 'Wills & Estates',
        color: 'purple',
        icon: Users,
        url: 'http://localhost:5005',
        port: 5005,
        category: 'practice',
        description: 'Estate planning, will drafting, probate'
    },
    {
        id: 'employment',
        name: 'Employment Law',
        color: 'orange',
        icon: Briefcase,
        url: 'http://localhost:5006',
        port: 5006,
        category: 'practice',
        description: 'Employment disputes, HR compliance, contracts'
    },
    {
        id: 'business-law',
        name: 'Business Law',
        color: 'green',
        icon: Building,
        url: 'http://localhost:5008',
        port: 5008,
        category: 'practice',
        description: 'Corporate law, commercial transactions, compliance'
    },
    // Legal Analysis & Research Tools
    {
        id: 'case-analysis',
        name: 'Case Analysis',
        color: 'indigo',
        icon: Brain,
        url: 'http://localhost:5010',
        port: 5010,
        category: 'tool',
        description: 'AI-powered case analysis and legal insights'
    },
    {
        id: 'document-compare',
        name: 'Document Compare',
        color: 'teal',
        icon: Eye,
        url: 'http://localhost:5011',
        port: 5011,
        category: 'tool',
        description: 'Legal document comparison and redlining'
    },
    {
        id: 'precedent-research',
        name: 'Precedent Research',
        color: 'sky',
        icon: BookOpen,
        url: 'http://localhost:5012',
        port: 5012,
        category: 'tool',
        description: 'Legal precedent search and case law research'
    },
    // Practice Management Tools
    {
        id: 'document-manager',
        name: 'Document Manager',
        color: 'amber',
        icon: FileText,
        url: 'http://localhost:5014',
        port: 5014,
        category: 'tool',
        description: 'Enterprise document lifecycle management'
    },
    {
        id: 'due-diligence',
        name: 'Due Diligence',
        color: 'rose',
        icon: Search,
        url: 'http://localhost:5015',
        port: 5015,
        category: 'tool',
        description: 'M&A transaction due diligence and review'
    },
    // Specialized Legal Tools
    {
        id: 'witness-prep',
        name: 'Witness Preparation',
        color: 'pink',
        icon: Scale,
        url: 'http://localhost:5017',
        port: 5017,
        category: 'tool',
        description: 'Litigation witness preparation and coaching'
    },
    {
        id: 'argument-builder',
        name: 'Argument Builder',
        color: 'violet',
        icon: Calculator,
        url: 'http://localhost:5018',
        port: 5018,
        category: 'tool',
        description: 'Advanced legal argument construction and analysis'
    },
    {
        id: 'knowledge-hub',
        name: 'Knowledge Hub',
        color: 'emerald',
        icon: HelpCircle,
        url: 'http://localhost:5016',
        port: 5016,
        category: 'tool',
        description: 'Internal knowledge base and FAQ management'
    },
    {
        id: 'bulk-upload',
        name: 'Bulk Upload',
        color: 'orange',
        icon: Upload,
        url: 'http://localhost:5019',
        port: 5019,
        category: 'tool',
        description: 'Mass document processing and batch operations'
    },
    // Admin & Platform Tools
    {
        id: 'dashboard',
        name: 'Unified Dashboard',
        color: 'gray',
        icon: BarChart3,
        url: 'http://localhost:3000',
        port: 3000,
        category: 'admin',
        description: 'Cross-practice analytics and firm overview'
    },
    {
        id: 'my-tasks',
        name: 'My Tasks',
        color: 'cyan',
        icon: CheckSquare,
        url: 'http://localhost:5020',
        port: 5020,
        category: 'admin',
        description: 'Personal task and workflow management'
    },
    {
        id: 'settings',
        name: 'Settings',
        color: 'stone',
        icon: Settings,
        url: 'http://localhost:5021',
        port: 5021,
        category: 'admin',
        description: 'Platform configuration and user preferences'
    },
];
// Get apps by category
export const practiceAreas = allApps.filter(app => app.category === 'practice');
export const legalTools = allApps.filter(app => app.category === 'tool');
export const adminTools = allApps.filter(app => app.category === 'admin');
// Legacy business units for backward compatibility
export const businessUnits = practiceAreas.map(app => ({
    id: app.id,
    name: app.name,
    color: app.color,
    icon: app.icon,
    url: app.url,
    port: app.port
}));
export default function UniversalAppSwitcher({ currentApp, onAppChange, showCategories = true }) {
    const [isOpen, setIsOpen] = useState(false);
    const current = allApps.find(app => app.id === currentApp);
    const CurrentIcon = current?.icon || Grid;
    const colorClasses = {
        blue: 'bg-blue-600 hover:bg-blue-700',
        purple: 'bg-purple-600 hover:bg-purple-700',
        orange: 'bg-orange-600 hover:bg-orange-700',
        green: 'bg-green-600 hover:bg-green-700',
        indigo: 'bg-indigo-600 hover:bg-indigo-700',
        teal: 'bg-teal-600 hover:bg-teal-700',
        sky: 'bg-sky-600 hover:bg-sky-700',
        slate: 'bg-slate-600 hover:bg-slate-700',
        amber: 'bg-amber-600 hover:bg-amber-700',
        rose: 'bg-rose-600 hover:bg-rose-700',
        pink: 'bg-pink-600 hover:bg-pink-700',
        violet: 'bg-violet-600 hover:bg-violet-700',
        emerald: 'bg-emerald-600 hover:bg-emerald-700',
        gray: 'bg-gray-600 hover:bg-gray-700',
        cyan: 'bg-cyan-600 hover:bg-cyan-700',
        stone: 'bg-stone-600 hover:bg-stone-700',
    };
    const handleAppSelect = (app) => {
        setIsOpen(false);
        if (onAppChange) {
            onAppChange(app.id);
        }
        else {
            window.location.href = app.url;
        }
    };
    const renderAppGroup = (title, apps) => (_jsxs("div", { className: "px-2 py-2", children: [_jsx("div", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1 mb-1", children: title }), apps.map((app) => {
                const Icon = app.icon;
                const isActive = app.id === currentApp;
                return (_jsxs("button", { onClick: () => handleAppSelect(app), className: `w-full flex items-start space-x-3 px-3 py-2 text-left rounded-md transition-colors mb-1 ${isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'}`, children: [_jsx(Icon, { className: `h-5 w-5 mt-0.5 ${app.color === 'blue' ? 'text-blue-600' :
                                app.color === 'purple' ? 'text-purple-600' :
                                    app.color === 'orange' ? 'text-orange-600' :
                                        app.color === 'green' ? 'text-green-600' :
                                            app.color === 'indigo' ? 'text-indigo-600' :
                                                app.color === 'teal' ? 'text-teal-600' :
                                                    app.color === 'sky' ? 'text-sky-600' :
                                                        app.color === 'slate' ? 'text-slate-600' :
                                                            app.color === 'amber' ? 'text-amber-600' :
                                                                app.color === 'rose' ? 'text-rose-600' :
                                                                    app.color === 'pink' ? 'text-pink-600' :
                                                                        app.color === 'violet' ? 'text-violet-600' :
                                                                            app.color === 'emerald' ? 'text-emerald-600' :
                                                                                app.color === 'gray' ? 'text-gray-600' :
                                                                                    app.color === 'cyan' ? 'text-cyan-600' :
                                                                                        'text-stone-600'}` }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-medium text-sm", children: app.name }), app.description && (_jsx("div", { className: "text-xs text-gray-500 mt-0.5 line-clamp-1", children: app.description })), _jsxs("div", { className: "text-xs text-gray-400 mt-0.5", children: ["Port ", app.port] })] }), isActive && (_jsx("div", { className: "w-2 h-2 bg-blue-500 rounded-full mt-2" }))] }, app.id));
            })] }, title));
    return (_jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setIsOpen(!isOpen), "aria-haspopup": "true", "aria-expanded": isOpen, "aria-label": "Select application", className: `w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${current ? colorClasses[current.color] : 'bg-gray-600 hover:bg-gray-700'} text-white`, children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(CurrentIcon, { className: "h-5 w-5" }), _jsxs("div", { className: "text-left", children: [_jsx("div", { className: "font-medium", children: current?.name || 'Select App' }), current?.category && (_jsx("div", { className: "text-xs opacity-75 capitalize", children: current.category === 'practice' ? 'Practice Area' :
                                            current.category === 'tool' ? 'Legal Tool' : 'Admin Tool' }))] })] }), _jsx(ChevronDown, { className: `h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}` })] }), isOpen && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-10", onClick: () => setIsOpen(false) }), _jsx("div", { className: "absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-20 max-h-96 overflow-y-auto", children: showCategories ? (_jsxs(_Fragment, { children: [renderAppGroup('Practice Areas', practiceAreas), _jsx("div", { className: "border-t border-gray-100" }), renderAppGroup('Legal Tools', legalTools), _jsx("div", { className: "border-t border-gray-100" }), renderAppGroup('Admin & Platform', adminTools)] })) : (_jsx("div", { className: "px-2 py-2", children: allApps.map((app) => {
                                const Icon = app.icon;
                                const isActive = app.id === currentApp;
                                return (_jsxs("button", { onClick: () => handleAppSelect(app), className: `w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors mb-1 ${isActive
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-700 hover:bg-gray-50'}`, children: [_jsx(Icon, { className: "h-5 w-5" }), _jsx("span", { className: "font-medium", children: app.name }), _jsxs("span", { className: "text-xs text-gray-400 ml-auto", children: [":", app.port] })] }, app.id));
                            }) })) })] }))] }));
}
// Backward compatibility - BusinessUnitSwitcher that only shows practice areas
export function BusinessUnitSwitcher({ currentUnit, onUnitChange }) {
    return (_jsx(UniversalAppSwitcher, { currentApp: currentUnit, onAppChange: onUnitChange, showCategories: false }));
}
//# sourceMappingURL=UniversalAppSwitcher.js.map