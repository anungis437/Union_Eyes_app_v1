import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Profile Settings Page
// Comprehensive settings interface for user profile management
// Part of Phase 2 Week 1 Day 6 - Unified User Profile Management
import { useState } from 'react';
import { User, Bell, Palette, Lock, Eye, Settings as SettingsIcon, X } from 'lucide-react';
import { ProfileCard, ProfileEditor } from './ProfileComponents';
import { NotificationPreferencesPanel, UIPreferencesPanel, PrivacySettingsPanel, SecuritySettingsPanel } from './PreferencesPanels';
// =============================================================================
// TAB CONFIGURATION
// =============================================================================
const tabs = [
    {
        id: 'profile',
        label: 'Profile',
        icon: User,
        description: 'Manage your personal information and profile details'
    },
    {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        description: 'Configure how and when you receive notifications'
    },
    {
        id: 'appearance',
        label: 'Appearance',
        icon: Palette,
        description: 'Customize the look and feel of your interface'
    },
    {
        id: 'privacy',
        label: 'Privacy',
        icon: Eye,
        description: 'Control who can see your information'
    },
    {
        id: 'security',
        label: 'Security',
        icon: Lock,
        description: 'Manage your account security settings'
    }
];
// =============================================================================
// PROFILE SETTINGS PAGE COMPONENT
// =============================================================================
export const ProfileSettingsPage = ({ defaultTab = 'profile', onClose, showCloseButton = false, className = '' }) => {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [isEditing, setIsEditing] = useState(false);
    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile':
                return (_jsx("div", { className: "space-y-6", children: !isEditing ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex items-center justify-between mb-4", children: _jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Your Profile" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "This is how others will see you on the platform" })] }) }), _jsx(ProfileCard, { showCompleteness: true, onEditClick: () => setIsEditing(true) })] })) : (_jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Edit Profile" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Update your personal information" })] }), _jsx(ProfileEditor, { onSave: () => setIsEditing(false), onCancel: () => setIsEditing(false) })] })) }));
            case 'notifications':
                return (_jsx("div", { className: "bg-white rounded-lg shadow p-6", children: _jsx(NotificationPreferencesPanel, {}) }));
            case 'appearance':
                return (_jsx("div", { className: "bg-white rounded-lg shadow p-6", children: _jsx(UIPreferencesPanel, {}) }));
            case 'privacy':
                return (_jsx("div", { className: "bg-white rounded-lg shadow p-6", children: _jsx(PrivacySettingsPanel, {}) }));
            case 'security':
                return (_jsx("div", { className: "bg-white rounded-lg shadow p-6", children: _jsx(SecuritySettingsPanel, {}) }));
            default:
                return null;
        }
    };
    return (_jsx("div", { className: `min-h-screen bg-gray-50 ${className}`, children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsx("div", { className: "mb-8", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(SettingsIcon, { className: "h-8 w-8 text-gray-700 mr-3" }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Settings" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Manage your account settings and preferences" })] })] }), showCloseButton && onClose && (_jsx("button", { onClick: onClose, className: "p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100", "aria-label": "Close settings", children: _jsx(X, { className: "h-6 w-6" }) }))] }) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-4 gap-8", children: [_jsxs("div", { className: "lg:col-span-1", children: [_jsx("nav", { className: "bg-white rounded-lg shadow", children: _jsx("ul", { className: "divide-y divide-gray-200", children: tabs.map((tab) => {
                                            const Icon = tab.icon;
                                            const isActive = activeTab === tab.id;
                                            return (_jsx("li", { children: _jsxs("button", { onClick: () => {
                                                        setActiveTab(tab.id);
                                                        setIsEditing(false); // Reset editing state when switching tabs
                                                    }, className: `w-full text-left px-4 py-4 flex items-start hover:bg-gray-50 transition-colors ${isActive ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}`, children: [_jsx(Icon, { className: `h-5 w-5 mr-3 flex-shrink-0 mt-0.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}` }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: `text-sm font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`, children: tab.label }), _jsx("p", { className: "text-xs text-gray-600 mt-1 line-clamp-2", children: tab.description })] })] }) }, tab.id));
                                        }) }) }), _jsxs("div", { className: "mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200", children: [_jsx("h3", { className: "text-sm font-medium text-blue-900 mb-2", children: "Need Help?" }), _jsx("p", { className: "text-xs text-blue-800 mb-3", children: "Learn more about these settings in our documentation" }), _jsx("a", { href: "/docs/settings", className: "text-xs text-blue-600 hover:text-blue-700 font-medium", children: "View Documentation \u2192" })] })] }), _jsx("div", { className: "lg:col-span-3", children: renderTabContent() })] })] }) }));
};
export const CompactSettingsModal = ({ isOpen, onClose, defaultTab = 'profile' }) => {
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: _jsxs("div", { className: "flex items-center justify-center min-h-screen px-4", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 transition-opacity", onClick: onClose, "aria-hidden": "true" }), _jsx("div", { className: "relative bg-gray-50 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden", children: _jsx(ProfileSettingsPage, { defaultTab: defaultTab, onClose: onClose, showCloseButton: true, className: "max-h-[90vh] overflow-y-auto" }) })] }) }));
};
export const SettingsWidget = ({ onOpenFullSettings, className = '' }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const renderQuickSettings = () => {
        switch (activeTab) {
            case 'profile':
                return _jsx(ProfileCard, { showCompleteness: true });
            case 'notifications':
                return _jsx(NotificationPreferencesPanel, {});
            case 'appearance':
                return _jsx(UIPreferencesPanel, {});
            case 'privacy':
                return _jsx(PrivacySettingsPanel, {});
            case 'security':
                return _jsx(SecuritySettingsPanel, {});
            default:
                return null;
        }
    };
    return (_jsxs("div", { className: `bg-white rounded-lg shadow-lg ${className}`, children: [_jsx("div", { className: "px-6 py-4 border-b border-gray-200", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Quick Settings" }), onOpenFullSettings && (_jsx("button", { onClick: onOpenFullSettings, className: "text-sm text-blue-600 hover:text-blue-700 font-medium", children: "View All" }))] }) }), _jsx("div", { className: "px-6 py-3 border-b border-gray-200", children: _jsx("div", { className: "flex space-x-1", children: tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (_jsxs("button", { onClick: () => setActiveTab(tab.id), className: `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`, title: tab.description, children: [_jsx(Icon, { className: "h-4 w-4 mr-2" }), tab.label] }, tab.id));
                    }) }) }), _jsx("div", { className: "px-6 py-6 max-h-96 overflow-y-auto", children: renderQuickSettings() })] }));
};
// =============================================================================
// EXPORT ALL COMPONENTS
// =============================================================================
export default {
    ProfileSettingsPage,
    CompactSettingsModal,
    SettingsWidget
};
//# sourceMappingURL=ProfileSettingsPage.js.map