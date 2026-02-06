// Example Integration: User Profile Management in Dashboard App
// This file demonstrates how to integrate the unified profile management system

// NOTE: This is an example file - imports commented out as they don't exist in current implementation
/* eslint-disable */
// @ts-nocheck

/*
import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  useUserProfile,
  ProfileCard,
  ProfileSettingsPage,
  CompactSettingsModal,
  SettingsWidget
} from '../index';
*/

// =============================================================================
// EXAMPLE 1: Simple Profile Display
// =============================================================================

export function UserProfilePage() {
  const { profile, loading, error, fullName, isProfileComplete } = useUserProfile();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading profile: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Incomplete Profile Banner */}
      {!isProfileComplete && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-900 font-medium mb-2">
            📝 Your profile is {profile?.profileCompleteness}% complete
          </p>
          <p className="text-yellow-800 text-sm mb-3">
            Complete your profile to unlock all features and help colleagues find you.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Profile Card */}
      <ProfileCard
        showCompleteness={true}
        onEditClick={() => navigate('/settings')}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/settings?tab=notifications')}
          className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
        >
          <div className="text-2xl mb-2">🔔</div>
          <div className="font-medium text-gray-900">Notifications</div>
          <div className="text-sm text-gray-600">Manage alerts</div>
        </button>
        
        <button
          onClick={() => navigate('/settings?tab=appearance')}
          className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
        >
          <div className="text-2xl mb-2">🎨</div>
          <div className="font-medium text-gray-900">Appearance</div>
          <div className="text-sm text-gray-600">Customize UI</div>
        </button>
        
        <button
          onClick={() => navigate('/settings?tab=security')}
          className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
        >
          <div className="text-2xl mb-2">🔒</div>
          <div className="font-medium text-gray-900">Security</div>
          <div className="text-sm text-gray-600">2FA & sessions</div>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// EXAMPLE 2: Full Settings Page with Routing
// =============================================================================

export function SettingsRoute() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const defaultTab = (searchParams.get('tab') as any) || 'profile';

  return (
    <ProfileSettingsPage
      defaultTab={defaultTab}
      onClose={() => navigate(-1)}
      showCloseButton={true}
    />
  );
}

// =============================================================================
// EXAMPLE 3: Settings Modal Trigger
// =============================================================================

export function DashboardHeader() {
  const [showSettings, setShowSettings] = React.useState(false);
  const { profile, fullName, initials } = useUserProfile();

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          
          <div className="flex items-center space-x-4">
            {/* User Menu Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {/* Avatar */}
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={fullName}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                  {initials}
                </div>
              )}
              
              {/* Name and Role */}
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">{fullName}</div>
                <div className="text-xs text-gray-600 capitalize">{profile?.role}</div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <CompactSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        defaultTab="profile"
      />
    </>
  );
}

// =============================================================================
// EXAMPLE 4: Sidebar Settings Widget
// =============================================================================

export function DashboardSidebar() {
  const navigate = useNavigate();

  return (
    <aside className="w-80 bg-gray-50 border-r border-gray-200 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Quick Settings</h2>
      
      <SettingsWidget
        onOpenFullSettings={() => navigate('/settings')}
        className="shadow-md"
      />
    </aside>
  );
}

// =============================================================================
// EXAMPLE 5: Programmatic Profile Updates
// =============================================================================

export function OnboardingWizard() {
  const {
    profile,
    updateProfile,
    updateOnboardingProgress,
    completeOnboardingStep,
    uploadAvatar
  } = useUserProfile();
  const [step, setStep] = React.useState(0);

  const steps = [
    { id: 'welcome', title: 'Welcome', description: 'Get started with CourtLens' },
    { id: 'profile', title: 'Profile', description: 'Set up your profile' },
    { id: 'preferences', title: 'Preferences', description: 'Customize your experience' },
    { id: 'tour', title: 'Tour', description: 'Learn the basics' },
    { id: 'complete', title: 'Complete', description: 'You\'re all set!' }
  ];

  const handleStepComplete = async (stepId: string) => {
    await completeOnboardingStep(stepId);
    
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Mark onboarding as complete
      await updateOnboardingProgress({
        steps: steps.map(s => s.id),
        currentStep: steps.length,
        completedSteps: steps.map(s => s.id),
        skippedSteps: []
      });
    }
  };

  const handleProfileUpdate = async (data: any) => {
    await updateProfile(data);
    await handleStepComplete('profile');
  };

  const handleAvatarUpload = async (file: File) => {
    await uploadAvatar(file);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`text-xs font-medium ${
                i <= step ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              {s.title}
            </div>
          ))}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Set Up Your Profile</h2>
            <p className="text-gray-600">
              Tell us about yourself so colleagues can find and connect with you.
            </p>
            
            {/* Simple Profile Form */}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="First Name"
                defaultValue={profile?.firstName}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onBlur={(e) => handleProfileUpdate({ firstName: e.target.value })}
              />
              <input
                type="text"
                placeholder="Last Name"
                defaultValue={profile?.lastName}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onBlur={(e) => handleProfileUpdate({ lastName: e.target.value })}
              />
              <input
                type="text"
                placeholder="Job Title"
                defaultValue={profile?.title}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onBlur={(e) => handleProfileUpdate({ title: e.target.value })}
              />
              
              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                  }}
                  className="w-full"
                />
              </div>
            </div>

            <button
              onClick={() => handleStepComplete('profile')}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
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

  return (
    <div className="flex items-center space-x-2">
      {themes.map(theme => (
        <button
          key={theme.value}
          onClick={() => updateUIPreferences({ theme: theme.value as any })}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentTheme === theme.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="mr-2">{theme.icon}</span>
          {theme.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// EXAMPLE 7: Notification Preferences Quick Toggle
// =============================================================================

export function NotificationToggle() {
  const { profile, updateNotificationPreferences } = useUserProfile();
  const emailEnabled = profile?.notificationPreferences?.email?.enabled ?? true;

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
      <div className="flex items-center">
        <span className="text-2xl mr-3">📧</span>
        <div>
          <div className="font-medium text-gray-900">Email Notifications</div>
          <div className="text-sm text-gray-600">
            Receive updates via email
          </div>
        </div>
      </div>
      
      <button
        onClick={() => {
          updateNotificationPreferences({
            email: {
              enabled: !emailEnabled,
              frequency: 'daily',
              types: []
            }
          });
        }}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          emailEnabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            emailEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// =============================================================================
// EXAMPLE 8: Complete App Integration
// =============================================================================

export function AppWithProfileManagement() {
  return (
    <Routes>
      {/* Profile Routes */}
      <Route path="/profile" element={<UserProfilePage />} />
      <Route path="/settings" element={<SettingsRoute />} />
      <Route path="/onboarding" element={<OnboardingWizard />} />
      
      {/* Dashboard with Profile Integration */}
      <Route
        path="/dashboard"
        element={
          <div className="flex h-screen">
            <DashboardSidebar />
            <div className="flex-1 flex flex-col">
              <DashboardHeader />
              <main className="flex-1 overflow-y-auto p-6">
                {/* Dashboard content */}
              </main>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

// =============================================================================
// EXAMPLE 9: Profile Completeness Indicator
// =============================================================================

export function ProfileCompletenessWidget() {
  const { profile, isProfileComplete } = useUserProfile();
  const navigate = useNavigate();

  if (isProfileComplete) return null;

  const completeness = profile?.profileCompleteness || 0;
  const missingFields = [];

  if (!profile?.firstName) missingFields.push('First name');
  if (!profile?.lastName) missingFields.push('Last name');
  if (!profile?.title) missingFields.push('Job title');
  if (!profile?.avatarUrl) missingFields.push('Profile picture');
  if (!profile?.bio) missingFields.push('Bio');

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Complete Your Profile
          </h3>
          <p className="text-sm text-gray-600">
            {completeness}% complete
          </p>
        </div>
        <div className="text-3xl">📝</div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>

      {/* Missing Fields */}
      <div className="space-y-2 mb-4">
        <p className="text-sm font-medium text-gray-700">Still needed:</p>
        <ul className="text-sm text-gray-600 space-y-1">
          {missingFields.map(field => (
            <li key={field} className="flex items-center">
              <span className="text-gray-400 mr-2">•</span>
              {field}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => navigate('/settings')}
        className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium text-sm"
      >
        Complete Now
      </button>
    </div>
  );
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
