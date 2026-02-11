import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Preferences Panel Components
// Components for managing user preferences across different categories
// Part of Phase 2 Week 1 Day 6 - Unified User Profile Management
import { useState } from 'react';
import { Bell, Moon, Sun, Eye, Shield, Lock, Smartphone, Mail, MessageSquare, CheckCircle } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
export const NotificationPreferencesPanel = ({ className = '' }) => {
    const { profile, updateNotificationPreferences } = useUserProfile();
    const [saving, setSaving] = useState(false);
    const preferences = profile?.notificationPreferences || {
        email: { enabled: true, frequency: 'immediate', types: [] },
        push: { enabled: false, frequency: 'immediate', types: [] },
        sms: { enabled: false, frequency: 'immediate', types: [] },
        inApp: { enabled: true, frequency: 'immediate', types: [] }
    };
    const handleToggleChannel = async (channel, enabled) => {
        try {
            setSaving(true);
            await updateNotificationPreferences({
                [channel]: { ...preferences[channel], enabled }
            });
        }
        catch (error) {
}
        finally {
            setSaving(false);
        }
    };
    const handleUpdateFrequency = async (channel, frequency) => {
        try {
            setSaving(true);
            await updateNotificationPreferences({
                [channel]: { ...preferences[channel], frequency }
            });
        }
        catch (error) {
}
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: `space-y-6 ${className}`, children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Notification Preferences" }), _jsx("p", { className: "mt-1 text-sm text-gray-600", children: "Choose how and when you want to receive notifications" })] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(Mail, { className: "h-5 w-5 text-gray-400 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: "Email Notifications" }), _jsx("p", { className: "text-xs text-gray-600", children: "Receive notifications via email" })] })] }), _jsx("button", { onClick: () => handleToggleChannel('email', !preferences.email.enabled), disabled: saving, className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.email.enabled ? 'bg-blue-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${preferences.email.enabled ? 'translate-x-5' : 'translate-x-0'}` }) })] }), preferences.email.enabled && (_jsxs("div", { className: "mt-4", children: [_jsx("label", { className: "text-xs font-medium text-gray-700", children: "Frequency" }), _jsxs("select", { value: preferences.email.frequency, onChange: (e) => handleUpdateFrequency('email', e.target.value), disabled: saving, className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border", children: [_jsx("option", { value: "immediate", children: "Immediate" }), _jsx("option", { value: "daily", children: "Daily Digest" }), _jsx("option", { value: "weekly", children: "Weekly Digest" })] })] }))] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(Bell, { className: "h-5 w-5 text-gray-400 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: "Push Notifications" }), _jsx("p", { className: "text-xs text-gray-600", children: "Receive push notifications on your devices" })] })] }), _jsx("button", { onClick: () => handleToggleChannel('push', !preferences.push.enabled), disabled: saving, className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.push.enabled ? 'bg-blue-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${preferences.push.enabled ? 'translate-x-5' : 'translate-x-0'}` }) })] }), preferences.push.enabled && (_jsxs("div", { className: "mt-4", children: [_jsx("label", { className: "text-xs font-medium text-gray-700", children: "Frequency" }), _jsxs("select", { value: preferences.push.frequency, onChange: (e) => handleUpdateFrequency('push', e.target.value), disabled: saving, className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border", children: [_jsx("option", { value: "immediate", children: "Immediate" }), _jsx("option", { value: "daily", children: "Daily Digest" }), _jsx("option", { value: "weekly", children: "Weekly Digest" })] })] }))] }), _jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(MessageSquare, { className: "h-5 w-5 text-gray-400 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: "SMS Notifications" }), _jsx("p", { className: "text-xs text-gray-600", children: "Receive notifications via text message" })] })] }), _jsx("button", { onClick: () => handleToggleChannel('sms', !preferences.sms.enabled), disabled: saving, className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.sms.enabled ? 'bg-blue-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${preferences.sms.enabled ? 'translate-x-5' : 'translate-x-0'}` }) })] }) }), _jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(Smartphone, { className: "h-5 w-5 text-gray-400 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: "In-App Notifications" }), _jsx("p", { className: "text-xs text-gray-600", children: "Show notifications within the application" })] })] }), _jsx("button", { onClick: () => handleToggleChannel('inApp', !preferences.inApp.enabled), disabled: saving, className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.inApp.enabled ? 'bg-blue-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${preferences.inApp.enabled ? 'translate-x-5' : 'translate-x-0'}` }) })] }) })] }));
};
export const UIPreferencesPanel = ({ className = '' }) => {
    const { profile, updateUIPreferences } = useUserProfile();
    const [saving, setSaving] = useState(false);
    const preferences = profile?.uiPreferences || {
        theme: 'light',
        colorScheme: 'blue',
        fontSize: 'medium',
        compactMode: false,
        sidebarCollapsed: false,
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        language: 'en',
        animations: true
    };
    const handleUpdatePreference = async (key, value) => {
        try {
            setSaving(true);
            await updateUIPreferences({ [key]: value });
        }
        catch (error) {
}
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: `space-y-6 ${className}`, children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-900", children: "UI Preferences" }), _jsx("p", { className: "mt-1 text-sm text-gray-600", children: "Customize how the application looks and behaves" })] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-900 mb-3", children: _jsxs("div", { className: "flex items-center", children: [preferences.theme === 'dark' ? (_jsx(Moon, { className: "h-5 w-5 text-gray-400 mr-2" })) : (_jsx(Sun, { className: "h-5 w-5 text-gray-400 mr-2" })), "Theme"] }) }), _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsxs("button", { onClick: () => handleUpdatePreference('theme', 'light'), disabled: saving, className: `p-3 border-2 rounded-lg text-center text-sm font-medium transition-colors ${preferences.theme === 'light'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'}`, children: [_jsx(Sun, { className: "h-5 w-5 mx-auto mb-1" }), "Light"] }), _jsxs("button", { onClick: () => handleUpdatePreference('theme', 'dark'), disabled: saving, className: `p-3 border-2 rounded-lg text-center text-sm font-medium transition-colors ${preferences.theme === 'dark'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'}`, children: [_jsx(Moon, { className: "h-5 w-5 mx-auto mb-1" }), "Dark"] }), _jsx("button", { onClick: () => handleUpdatePreference('theme', 'system'), disabled: saving, className: `p-3 border-2 rounded-lg text-center text-sm font-medium transition-colors ${preferences.theme === 'system'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'}`, children: "System" })] })] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-900 mb-3", children: "Accent Color" }), _jsx("div", { className: "grid grid-cols-5 gap-3", children: ['blue', 'green', 'purple', 'red', 'orange'].map((color) => (_jsx("button", { onClick: () => handleUpdatePreference('colorScheme', color), disabled: saving, className: `h-10 rounded-lg border-2 transition-all ${preferences.colorScheme === color
                                ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900'
                                : 'border-gray-200 hover:border-gray-300'} bg-${color}-500`, "aria-label": color }, color))) })] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-900 mb-3", children: "Font Size" }), _jsxs("select", { value: preferences.fontSize, onChange: (e) => handleUpdatePreference('fontSize', e.target.value), disabled: saving, className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border", children: [_jsx("option", { value: "small", children: "Small" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "large", children: "Large" })] })] }), _jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: "Compact Mode" }), _jsx("p", { className: "text-xs text-gray-600", children: "Show more content with less spacing" })] }), _jsx("button", { onClick: () => handleUpdatePreference('compactMode', !preferences.compactMode), disabled: saving, className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.compactMode ? 'bg-blue-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${preferences.compactMode ? 'translate-x-5' : 'translate-x-0'}` }) })] }) }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-900 mb-3", children: "Date Format" }), _jsxs("select", { value: preferences.dateFormat, onChange: (e) => handleUpdatePreference('dateFormat', e.target.value), disabled: saving, className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border", children: [_jsx("option", { value: "MM/DD/YYYY", children: "MM/DD/YYYY (12/31/2024)" }), _jsx("option", { value: "DD/MM/YYYY", children: "DD/MM/YYYY (31/12/2024)" }), _jsx("option", { value: "YYYY-MM-DD", children: "YYYY-MM-DD (2024-12-31)" })] })] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-900 mb-3", children: "Time Format" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx("button", { onClick: () => handleUpdatePreference('timeFormat', '12h'), disabled: saving, className: `p-3 border-2 rounded-lg text-center text-sm font-medium transition-colors ${preferences.timeFormat === '12h'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'}`, children: "12-hour (2:30 PM)" }), _jsx("button", { onClick: () => handleUpdatePreference('timeFormat', '24h'), disabled: saving, className: `p-3 border-2 rounded-lg text-center text-sm font-medium transition-colors ${preferences.timeFormat === '24h'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'}`, children: "24-hour (14:30)" })] })] })] }));
};
export const PrivacySettingsPanel = ({ className = '' }) => {
    const { profile, updatePrivacySettings } = useUserProfile();
    const [saving, setSaving] = useState(false);
    const settings = profile?.privacySettings || {
        profileVisibility: 'organization',
        showEmail: false,
        showPhone: false,
        showActivity: true,
        allowDirectMessages: true
    };
    const handleToggleSetting = async (key, value) => {
        try {
            setSaving(true);
            await updatePrivacySettings({ [key]: value });
        }
        catch (error) {
}
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: `space-y-6 ${className}`, children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Privacy Settings" }), _jsx("p", { className: "mt-1 text-sm text-gray-600", children: "Control who can see your information" })] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-900 mb-3", children: _jsxs("div", { className: "flex items-center", children: [_jsx(Eye, { className: "h-5 w-5 text-gray-400 mr-2" }), "Profile Visibility"] }) }), _jsxs("select", { value: settings.profileVisibility, onChange: (e) => handleToggleSetting('profileVisibility', e.target.value), disabled: saving, className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border", children: [_jsx("option", { value: "public", children: "Public - Visible to everyone" }), _jsx("option", { value: "organization", children: "Organization - Visible to organization members" }), _jsx("option", { value: "private", children: "Private - Only visible to you" })] })] }), _jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(Mail, { className: "h-5 w-5 text-gray-400 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: "Show Email Address" }), _jsx("p", { className: "text-xs text-gray-600", children: "Make your email visible on your profile" })] })] }), _jsx("button", { onClick: () => handleToggleSetting('showEmail', !settings.showEmail), disabled: saving, className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.showEmail ? 'bg-blue-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.showEmail ? 'translate-x-5' : 'translate-x-0'}` }) })] }) }), _jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(Smartphone, { className: "h-5 w-5 text-gray-400 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: "Show Phone Number" }), _jsx("p", { className: "text-xs text-gray-600", children: "Make your phone number visible on your profile" })] })] }), _jsx("button", { onClick: () => handleToggleSetting('showPhone', !settings.showPhone), disabled: saving, className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.showPhone ? 'bg-blue-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.showPhone ? 'translate-x-5' : 'translate-x-0'}` }) })] }) }), _jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(CheckCircle, { className: "h-5 w-5 text-gray-400 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: "Show Activity Status" }), _jsx("p", { className: "text-xs text-gray-600", children: "Let others see when you're online" })] })] }), _jsx("button", { onClick: () => handleToggleSetting('showActivity', !settings.showActivity), disabled: saving, className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.showActivity ? 'bg-blue-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.showActivity ? 'translate-x-5' : 'translate-x-0'}` }) })] }) }), _jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(MessageSquare, { className: "h-5 w-5 text-gray-400 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: "Allow Direct Messages" }), _jsx("p", { className: "text-xs text-gray-600", children: "Let others send you direct messages" })] })] }), _jsx("button", { onClick: () => handleToggleSetting('allowDirectMessages', !settings.allowDirectMessages), disabled: saving, className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.allowDirectMessages ? 'bg-blue-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.allowDirectMessages ? 'translate-x-5' : 'translate-x-0'}` }) })] }) })] }));
};
export const SecuritySettingsPanel = ({ className = '' }) => {
    const { profile, updateSecuritySettings } = useUserProfile();
    const [saving, setSaving] = useState(false);
    const settings = profile?.securitySettings || {
        twoFactorEnabled: false,
        twoFactorMethod: 'app',
        sessionTimeout: 1800,
        requirePasswordChange: false,
        trustedDevices: []
    };
    const handleToggle2FA = async () => {
        try {
            setSaving(true);
            await updateSecuritySettings({
                twoFactorEnabled: !settings.twoFactorEnabled
            });
            if (!settings.twoFactorEnabled) {
                alert('Two-factor authentication has been enabled. Please configure your authentication app.');
            }
        }
        catch (error) {
}
        finally {
            setSaving(false);
        }
    };
    const handleUpdateSessionTimeout = async (timeout) => {
        try {
            setSaving(true);
            await updateSecuritySettings({ sessionTimeout: timeout });
        }
        catch (error) {
}
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: `space-y-6 ${className}`, children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Security Settings" }), _jsx("p", { className: "mt-1 text-sm text-gray-600", children: "Manage your account security and authentication" })] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(Shield, { className: "h-5 w-5 text-gray-400 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: "Two-Factor Authentication" }), _jsx("p", { className: "text-xs text-gray-600", children: "Add an extra layer of security to your account" })] })] }), _jsx("button", { onClick: handleToggle2FA, disabled: saving, className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'}` }) })] }), settings.twoFactorEnabled && (_jsxs("div", { className: "mt-3 p-3 bg-green-50 rounded-md flex items-start", children: [_jsx(CheckCircle, { className: "h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-green-800", children: "Two-factor authentication is enabled" }), _jsx("p", { className: "text-xs text-green-700 mt-1", children: "Your account is protected with an additional security layer" })] })] }))] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-900 mb-3", children: _jsxs("div", { className: "flex items-center", children: [_jsx(Lock, { className: "h-5 w-5 text-gray-400 mr-2" }), "Session Timeout"] }) }), _jsx("p", { className: "text-xs text-gray-600 mb-3", children: "Automatically log out after period of inactivity" }), _jsxs("select", { value: settings.sessionTimeout, onChange: (e) => handleUpdateSessionTimeout(Number(e.target.value)), disabled: saving, className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border", children: [_jsx("option", { value: 15, children: "15 minutes" }), _jsx("option", { value: 30, children: "30 minutes" }), _jsx("option", { value: 60, children: "1 hour" }), _jsx("option", { value: 120, children: "2 hours" }), _jsx("option", { value: 240, children: "4 hours" }), _jsx("option", { value: 0, children: "Never" })] })] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-900 mb-3", children: "Password Requirements" }), _jsx("p", { className: "text-xs text-gray-600 mb-3", children: "Organization password policy requirements" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center text-sm", children: [_jsx(CheckCircle, { className: "h-4 w-4 text-green-600 mr-2" }), _jsx("span", { className: "text-gray-700", children: "Minimum 8 characters" })] }), _jsxs("div", { className: "flex items-center text-sm", children: [_jsx(CheckCircle, { className: "h-4 w-4 text-green-600 mr-2" }), _jsx("span", { className: "text-gray-700", children: "At least one uppercase letter" })] }), _jsxs("div", { className: "flex items-center text-sm", children: [_jsx(CheckCircle, { className: "h-4 w-4 text-green-600 mr-2" }), _jsx("span", { className: "text-gray-700", children: "At least one lowercase letter" })] }), _jsxs("div", { className: "flex items-center text-sm", children: [_jsx(CheckCircle, { className: "h-4 w-4 text-green-600 mr-2" }), _jsx("span", { className: "text-gray-700", children: "At least one number" })] }), _jsxs("div", { className: "flex items-center text-sm", children: [_jsx(CheckCircle, { className: "h-4 w-4 text-green-600 mr-2" }), _jsx("span", { className: "text-gray-700", children: "At least one special character" })] })] })] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-900 mb-3", children: "Trusted Devices" }), _jsx("p", { className: "text-xs text-gray-600 mb-3", children: "Devices you've marked as trusted won't require two-factor authentication" }), settings.trustedDevices.length > 0 ? (_jsx("div", { className: "space-y-2", children: settings.trustedDevices.map((device, index) => (_jsxs("div", { className: "flex items-center justify-between p-2 bg-gray-50 rounded", children: [_jsxs("span", { className: "text-sm text-gray-700", children: [device.name, " - ", device.deviceType] }), _jsx("button", { onClick: () => {
                                        const updatedDevices = settings.trustedDevices.filter((_, i) => i !== index);
                                        updateSecuritySettings({ trustedDevices: updatedDevices });
                                    }, className: "text-xs text-red-600 hover:text-red-700", children: "Remove" })] }, device.id || index))) })) : (_jsx("p", { className: "text-sm text-gray-500", children: "No trusted devices" }))] })] }));
};
// =============================================================================
// EXPORT ALL PANELS
// =============================================================================
export default {
    NotificationPreferencesPanel,
    UIPreferencesPanel,
    PrivacySettingsPanel,
    SecuritySettingsPanel
};
//# sourceMappingURL=PreferencesPanels.js.map