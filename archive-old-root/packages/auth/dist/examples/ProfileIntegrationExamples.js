import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Example Integration: User Profile Management in Dashboard App
// This file demonstrates how to integrate the unified profile management system
import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useUserProfile, ProfileCard, ProfileSettingsPage, CompactSettingsModal, SettingsWidget } from '@court-lens/auth';
// =============================================================================
// EXAMPLE 1: Simple Profile Display
// =============================================================================
export function UserProfilePage() {
    const { profile, loading, error, fullName, isProfileComplete } = useUserProfile();
    const navigate = useNavigate();
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" }) }));
    }
    if (error) {
        return (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("p", { className: "text-red-800", children: ["Error loading profile: ", error.message] }) }));
    }
    return (_jsxs("div", { className: "max-w-4xl mx-auto p-6 space-y-6", children: [!isProfileComplete && (_jsxs("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4", children: [_jsxs("p", { className: "text-yellow-900 font-medium mb-2", children: ["\uD83D\uDCDD Your profile is ", profile?.profileCompleteness, "% complete"] }), _jsx("p", { className: "text-yellow-800 text-sm mb-3", children: "Complete your profile to unlock all features and help colleagues find you." }), _jsx("button", { onClick: () => navigate('/settings'), className: "px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium", children: "Complete Profile" })] })), _jsx(ProfileCard, { showCompleteness: true, onEditClick: () => navigate('/settings') }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("button", { onClick: () => navigate('/settings?tab=notifications'), className: "p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors", children: [_jsx("div", { className: "text-2xl mb-2", children: "\uD83D\uDD14" }), _jsx("div", { className: "font-medium text-gray-900", children: "Notifications" }), _jsx("div", { className: "text-sm text-gray-600", children: "Manage alerts" })] }), _jsxs("button", { onClick: () => navigate('/settings?tab=appearance'), className: "p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors", children: [_jsx("div", { className: "text-2xl mb-2", children: "\uD83C\uDFA8" }), _jsx("div", { className: "font-medium text-gray-900", children: "Appearance" }), _jsx("div", { className: "text-sm text-gray-600", children: "Customize UI" })] }), _jsxs("button", { onClick: () => navigate('/settings?tab=security'), className: "p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors", children: [_jsx("div", { className: "text-2xl mb-2", children: "\uD83D\uDD12" }), _jsx("div", { className: "font-medium text-gray-900", children: "Security" }), _jsx("div", { className: "text-sm text-gray-600", children: "2FA & sessions" })] })] })] }));
}
// =============================================================================
// EXAMPLE 2: Full Settings Page with Routing
// =============================================================================
export function SettingsRoute() {
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(window.location.search);
    const defaultTab = searchParams.get('tab') || 'profile';
    return (_jsx(ProfileSettingsPage, { defaultTab: defaultTab, onClose: () => navigate(-1), showCloseButton: true }));
}
// =============================================================================
// EXAMPLE 3: Settings Modal Trigger
// =============================================================================
export function DashboardHeader() {
    const [showSettings, setShowSettings] = React.useState(false);
    const { profile, fullName, initials } = useUserProfile();
    return (_jsxs(_Fragment, { children: [_jsx("header", { className: "bg-white border-b border-gray-200 px-6 py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Dashboard" }), _jsx("div", { className: "flex items-center space-x-4", children: _jsxs("button", { onClick: () => setShowSettings(true), className: "flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors", children: [profile?.avatarUrl ? (_jsx("img", { src: profile.avatarUrl, alt: fullName, className: "h-8 w-8 rounded-full" })) : (_jsx("div", { className: "h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium", children: initials })), _jsxs("div", { className: "text-left", children: [_jsx("div", { className: "text-sm font-medium text-gray-900", children: fullName }), _jsx("div", { className: "text-xs text-gray-600 capitalize", children: profile?.role })] })] }) })] }) }), _jsx(CompactSettingsModal, { isOpen: showSettings, onClose: () => setShowSettings(false), defaultTab: "profile" })] }));
}
// =============================================================================
// EXAMPLE 4: Sidebar Settings Widget
// =============================================================================
export function DashboardSidebar() {
    const navigate = useNavigate();
    return (_jsxs("aside", { className: "w-80 bg-gray-50 border-r border-gray-200 p-6 space-y-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Quick Settings" }), _jsx(SettingsWidget, { onOpenFullSettings: () => navigate('/settings'), className: "shadow-md" })] }));
}
// =============================================================================
// EXAMPLE 5: Programmatic Profile Updates
// =============================================================================
export function OnboardingWizard() {
    const { profile, updateProfile, updateOnboardingProgress, completeOnboardingStep, uploadAvatar } = useUserProfile();
    const [step, setStep] = React.useState(0);
    const steps = [
        { id: 'welcome', title: 'Welcome', description: 'Get started with CourtLens' },
        { id: 'profile', title: 'Profile', description: 'Set up your profile' },
        { id: 'preferences', title: 'Preferences', description: 'Customize your experience' },
        { id: 'tour', title: 'Tour', description: 'Learn the basics' },
        { id: 'complete', title: 'Complete', description: 'You\'re all set!' }
    ];
    const handleStepComplete = async (stepId) => {
        await completeOnboardingStep(stepId);
        if (step < steps.length - 1) {
            setStep(step + 1);
        }
        else {
            // Mark onboarding as complete
            await updateOnboardingProgress({
                steps: steps.map(s => s.id),
                currentStep: steps.length,
                completedSteps: steps.map(s => s.id),
                skippedSteps: []
            });
        }
    };
    const handleProfileUpdate = async (data) => {
        await updateProfile(data);
        await handleStepComplete('profile');
    };
    const handleAvatarUpload = async (file) => {
        await uploadAvatar(file);
    };
    return (_jsxs("div", { className: "max-w-2xl mx-auto p-6", children: [_jsxs("div", { className: "mb-8", children: [_jsx("div", { className: "flex justify-between mb-2", children: steps.map((s, i) => (_jsx("div", { className: `text-xs font-medium ${i <= step ? 'text-blue-600' : 'text-gray-400'}`, children: s.title }, s.id))) }), _jsx("div", { className: "h-2 bg-gray-200 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-blue-600 transition-all duration-300", style: { width: `${((step + 1) / steps.length) * 100}%` } }) })] }), _jsx("div", { className: "bg-white rounded-lg shadow-lg p-8", children: step === 1 && (_jsxs("div", { className: "space-y-6", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Set Up Your Profile" }), _jsx("p", { className: "text-gray-600", children: "Tell us about yourself so colleagues can find and connect with you." }), _jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", placeholder: "First Name", defaultValue: profile?.firstName, className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500", onBlur: (e) => handleProfileUpdate({ firstName: e.target.value }) }), _jsx("input", { type: "text", placeholder: "Last Name", defaultValue: profile?.lastName, className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500", onBlur: (e) => handleProfileUpdate({ lastName: e.target.value }) }), _jsx("input", { type: "text", placeholder: "Job Title", defaultValue: profile?.title, className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500", onBlur: (e) => handleProfileUpdate({ title: e.target.value }) }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Profile Picture" }), _jsx("input", { type: "file", accept: "image/*", onChange: (e) => {
                                                const file = e.target.files?.[0];
                                                if (file)
                                                    handleAvatarUpload(file);
                                            }, className: "w-full" })] })] }), _jsx("button", { onClick: () => handleStepComplete('profile'), className: "w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium", children: "Continue" })] })) })] }));
}
// =============================================================================
// EXAMPLE 6: Theme Switcher Component
// =============================================================================
export function ThemeSwitcher() {
    const { profile, updateUIPreferences } = useUserProfile();
    const currentTheme = profile?.uiPreferences?.theme || 'light';
    const themes = [
        { value: 'light', label: 'Light', icon: '☀️' },
        { value: 'dark', label: 'Dark', icon: '🌙' },
        { value: 'system', label: 'System', icon: '💻' }
    ];
    return (_jsx("div", { className: "flex items-center space-x-2", children: themes.map(theme => (_jsxs("button", { onClick: () => updateUIPreferences({ theme: theme.value }), className: `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentTheme === theme.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`, children: [_jsx("span", { className: "mr-2", children: theme.icon }), theme.label] }, theme.value))) }));
}
// =============================================================================
// EXAMPLE 7: Notification Preferences Quick Toggle
// =============================================================================
export function NotificationToggle() {
    const { profile, updateNotificationPreferences } = useUserProfile();
    const emailEnabled = profile?.notificationPreferences?.email?.enabled ?? true;
    return (_jsxs("div", { className: "flex items-center justify-between p-4 bg-white rounded-lg shadow", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "text-2xl mr-3", children: "\uD83D\uDCE7" }), _jsxs("div", { children: [_jsx("div", { className: "font-medium text-gray-900", children: "Email Notifications" }), _jsx("div", { className: "text-sm text-gray-600", children: "Receive updates via email" })] })] }), _jsx("button", { onClick: () => {
                    updateNotificationPreferences({
                        email: {
                            enabled: !emailEnabled,
                            frequency: 'daily',
                            types: []
                        }
                    });
                }, className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailEnabled ? 'bg-blue-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailEnabled ? 'translate-x-6' : 'translate-x-1'}` }) })] }));
}
// =============================================================================
// EXAMPLE 8: Complete App Integration
// =============================================================================
export function AppWithProfileManagement() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/profile", element: _jsx(UserProfilePage, {}) }), _jsx(Route, { path: "/settings", element: _jsx(SettingsRoute, {}) }), _jsx(Route, { path: "/onboarding", element: _jsx(OnboardingWizard, {}) }), _jsx(Route, { path: "/dashboard", element: _jsxs("div", { className: "flex h-screen", children: [_jsx(DashboardSidebar, {}), _jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx(DashboardHeader, {}), _jsx("main", { className: "flex-1 overflow-y-auto p-6" })] })] }) })] }));
}
// =============================================================================
// EXAMPLE 9: Profile Completeness Indicator
// =============================================================================
export function ProfileCompletenessWidget() {
    const { profile, isProfileComplete } = useUserProfile();
    const navigate = useNavigate();
    if (isProfileComplete)
        return null;
    const completeness = profile?.profileCompleteness || 0;
    const missingFields = [];
    if (!profile?.firstName)
        missingFields.push('First name');
    if (!profile?.lastName)
        missingFields.push('Last name');
    if (!profile?.title)
        missingFields.push('Job title');
    if (!profile?.avatarUrl)
        missingFields.push('Profile picture');
    if (!profile?.bio)
        missingFields.push('Bio');
    return (_jsxs("div", { className: "bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-1", children: "Complete Your Profile" }), _jsxs("p", { className: "text-sm text-gray-600", children: [completeness, "% complete"] })] }), _jsx("div", { className: "text-3xl", children: "\uD83D\uDCDD" })] }), _jsx("div", { className: "mb-4", children: _jsx("div", { className: "h-2 bg-gray-200 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300", style: { width: `${completeness}%` } }) }) }), _jsxs("div", { className: "space-y-2 mb-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: "Still needed:" }), _jsx("ul", { className: "text-sm text-gray-600 space-y-1", children: missingFields.map(field => (_jsxs("li", { className: "flex items-center", children: [_jsx("span", { className: "text-gray-400 mr-2", children: "\u2022" }), field] }, field))) })] }), _jsx("button", { onClick: () => navigate('/settings'), className: "w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium text-sm", children: "Complete Now" })] }));
}
// =============================================================================
// USAGE IN MAIN APP
// =============================================================================
/*
// In your app's main router file:

import { AppWithProfileManagement } from './examples/ProfileIntegration';

function App() {
  return (
    <AuthProvider>
      <AppWithProfileManagement />
    </AuthProvider>
  );
}

// Or use individual components:

import { UserProfilePage, SettingsRoute } from './examples/ProfileIntegration';

<Route path="/profile" element={<UserProfilePage />} />
<Route path="/settings" element={<SettingsRoute />} />
*/
export default {
    UserProfilePage,
    SettingsRoute,
    DashboardHeader,
    DashboardSidebar,
    OnboardingWizard,
    ThemeSwitcher,
    NotificationToggle,
    ProfileCompletenessWidget
};
//# sourceMappingURL=ProfileIntegrationExamples.js.map