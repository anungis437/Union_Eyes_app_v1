// Preferences Panel Components
// Components for managing user preferences across different categories
// Part of Phase 2 Week 1 Day 6 - Unified User Profile Management

import React, { useState } from 'react';
import { Bell, Moon, Sun, Eye, EyeOff, Shield, Lock, Smartphone, Mail, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
import type { 
  NotificationPreferences, 
  UIPreferences, 
  PrivacySettings, 
  SecuritySettings 
} from '../services/userProfileService';

// =============================================================================
// NOTIFICATION PREFERENCES PANEL
// =============================================================================

export interface NotificationPreferencesPanelProps {
  className?: string;
}

export const NotificationPreferencesPanel: React.FC<NotificationPreferencesPanelProps> = ({
  className = ''
}) => {
  const { profile, updateNotificationPreferences } = useUserProfile();
  const [saving, setSaving] = useState(false);
  
  const preferences = profile?.notificationPreferences || {
    email: { enabled: true, frequency: 'immediate', types: [] },
    push: { enabled: false, frequency: 'immediate', types: [] },
    sms: { enabled: false, frequency: 'immediate', types: [] },
    inApp: { enabled: true, frequency: 'immediate', types: [] }
  };

  const handleToggleChannel = async (channel: keyof NotificationPreferences, enabled: boolean) => {
    try {
      setSaving(true);
      await updateNotificationPreferences({
        [channel]: { ...preferences[channel], enabled }
      });
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFrequency = async (channel: keyof NotificationPreferences, frequency: 'immediate' | 'daily' | 'weekly') => {
    try {
      setSaving(true);
      await updateNotificationPreferences({
        [channel]: { ...preferences[channel], frequency }
      });
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
        <p className="mt-1 text-sm text-gray-600">
          Choose how and when you want to receive notifications
        </p>
      </div>

      {/* Email Notifications */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Mail className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Email Notifications</p>
              <p className="text-xs text-gray-600">Receive notifications via email</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleChannel('email', !preferences.email.enabled)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              preferences.email.enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                preferences.email.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        
        {preferences.email.enabled && (
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-700">Frequency</label>
            <select
              value={preferences.email.frequency}
              onChange={(e) => handleUpdateFrequency('email', e.target.value as any)}
              disabled={saving}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
            >
              <option value="immediate">Immediate</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Digest</option>
            </select>
          </div>
        )}
      </div>

      {/* Push Notifications */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Push Notifications</p>
              <p className="text-xs text-gray-600">Receive push notifications on your devices</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleChannel('push', !preferences.push.enabled)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              preferences.push.enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                preferences.push.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        
        {preferences.push.enabled && (
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-700">Frequency</label>
            <select
              value={preferences.push.frequency}
              onChange={(e) => handleUpdateFrequency('push', e.target.value as any)}
              disabled={saving}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
            >
              <option value="immediate">Immediate</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Digest</option>
            </select>
          </div>
        )}
      </div>

      {/* SMS Notifications */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageSquare className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">SMS Notifications</p>
              <p className="text-xs text-gray-600">Receive notifications via text message</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleChannel('sms', !preferences.sms.enabled)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              preferences.sms.enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                preferences.sms.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Smartphone className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">In-App Notifications</p>
              <p className="text-xs text-gray-600">Show notifications within the application</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleChannel('inApp', !preferences.inApp.enabled)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              preferences.inApp.enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                preferences.inApp.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// UI PREFERENCES PANEL
// =============================================================================

export interface UIPreferencesPanelProps {
  className?: string;
}

export const UIPreferencesPanel: React.FC<UIPreferencesPanelProps> = ({
  className = ''
}) => {
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

  const handleUpdatePreference = async <K extends keyof UIPreferences>(
    key: K,
    value: UIPreferences[K]
  ) => {
    try {
      setSaving(true);
      await updateUIPreferences({ [key]: value });
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-gray-900">UI Preferences</h3>
        <p className="mt-1 text-sm text-gray-600">
          Customize how the application looks and behaves
        </p>
      </div>

      {/* Theme */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-900 mb-3">
          <div className="flex items-center">
            {preferences.theme === 'dark' ? (
              <Moon className="h-5 w-5 text-gray-400 mr-2" />
            ) : (
              <Sun className="h-5 w-5 text-gray-400 mr-2" />
            )}
            Theme
          </div>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleUpdatePreference('theme', 'light')}
            disabled={saving}
            className={`p-3 border-2 rounded-lg text-center text-sm font-medium transition-colors ${
              preferences.theme === 'light'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Sun className="h-5 w-5 mx-auto mb-1" />
            Light
          </button>
          <button
            onClick={() => handleUpdatePreference('theme', 'dark')}
            disabled={saving}
            className={`p-3 border-2 rounded-lg text-center text-sm font-medium transition-colors ${
              preferences.theme === 'dark'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Moon className="h-5 w-5 mx-auto mb-1" />
            Dark
          </button>
          <button
            onClick={() => handleUpdatePreference('theme', 'system')}
            disabled={saving}
            className={`p-3 border-2 rounded-lg text-center text-sm font-medium transition-colors ${
              preferences.theme === 'system'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            System
          </button>
        </div>
      </div>

      {/* Color Scheme */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-900 mb-3">Accent Color</label>
        <div className="grid grid-cols-5 gap-3">
          {['blue', 'green', 'purple', 'red', 'orange'].map((color) => (
            <button
              key={color}
              onClick={() => handleUpdatePreference('colorScheme', color as any)}
              disabled={saving}
              className={`h-10 rounded-lg border-2 transition-all ${
                preferences.colorScheme === color
                  ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900'
                  : 'border-gray-200 hover:border-gray-300'
              } bg-${color}-500`}
              aria-label={color}
            />
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-900 mb-3">Font Size</label>
        <select
          value={preferences.fontSize}
          onChange={(e) => handleUpdatePreference('fontSize', e.target.value as any)}
          disabled={saving}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      {/* Compact Mode */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Compact Mode</p>
            <p className="text-xs text-gray-600">Show more content with less spacing</p>
          </div>
          <button
            onClick={() => handleUpdatePreference('compactMode', !preferences.compactMode)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              preferences.compactMode ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                preferences.compactMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Date Format */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-900 mb-3">Date Format</label>
        <select
          value={preferences.dateFormat}
          onChange={(e) => handleUpdatePreference('dateFormat', e.target.value)}
          disabled={saving}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
        >
          <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
        </select>
      </div>

      {/* Time Format */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-900 mb-3">Time Format</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleUpdatePreference('timeFormat', '12h')}
            disabled={saving}
            className={`p-3 border-2 rounded-lg text-center text-sm font-medium transition-colors ${
              preferences.timeFormat === '12h'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            12-hour (2:30 PM)
          </button>
          <button
            onClick={() => handleUpdatePreference('timeFormat', '24h')}
            disabled={saving}
            className={`p-3 border-2 rounded-lg text-center text-sm font-medium transition-colors ${
              preferences.timeFormat === '24h'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            24-hour (14:30)
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// PRIVACY SETTINGS PANEL
// =============================================================================

export interface PrivacySettingsPanelProps {
  className?: string;
}

export const PrivacySettingsPanel: React.FC<PrivacySettingsPanelProps> = ({
  className = ''
}) => {
  const { profile, updatePrivacySettings } = useUserProfile();
  const [saving, setSaving] = useState(false);
  
  const settings = profile?.privacySettings || {
    profileVisibility: 'organization',
    showEmail: false,
    showPhone: false,
    showActivity: true,
    allowDirectMessages: true
  };

  const handleToggleSetting = async <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => {
    try {
      setSaving(true);
      await updatePrivacySettings({ [key]: value });
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
        <p className="mt-1 text-sm text-gray-600">
          Control who can see your information
        </p>
      </div>

      {/* Profile Visibility */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-900 mb-3">
          <div className="flex items-center">
            <Eye className="h-5 w-5 text-gray-400 mr-2" />
            Profile Visibility
          </div>
        </label>
        <select
          value={settings.profileVisibility}
          onChange={(e) => handleToggleSetting('profileVisibility', e.target.value as any)}
          disabled={saving}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
        >
          <option value="public">Public - Visible to everyone</option>
          <option value="organization">Organization - Visible to organization members</option>
          <option value="private">Private - Only visible to you</option>
        </select>
      </div>

      {/* Show Email */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Mail className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Show Email Address</p>
              <p className="text-xs text-gray-600">Make your email visible on your profile</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleSetting('showEmail', !settings.showEmail)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.showEmail ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.showEmail ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Show Phone */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Smartphone className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Show Phone Number</p>
              <p className="text-xs text-gray-600">Make your phone number visible on your profile</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleSetting('showPhone', !settings.showPhone)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.showPhone ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.showPhone ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Show Activity */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Show Activity Status</p>
              <p className="text-xs text-gray-600">Let others see when you're online</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleSetting('showActivity', !settings.showActivity)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.showActivity ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.showActivity ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Allow Direct Messages */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageSquare className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Allow Direct Messages</p>
              <p className="text-xs text-gray-600">Let others send you direct messages</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleSetting('allowDirectMessages', !settings.allowDirectMessages)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.allowDirectMessages ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.allowDirectMessages ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SECURITY SETTINGS PANEL
// =============================================================================

export interface SecuritySettingsPanelProps {
  className?: string;
}

export const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({
  className = ''
}) => {
  const { profile, updateSecuritySettings } = useUserProfile();
  const [saving, setSaving] = useState(false);
  
  const settings = profile?.securitySettings || {
    twoFactorEnabled: false,
    twoFactorMethod: 'app' as const,
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
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSessionTimeout = async (timeout: number) => {
    try {
      setSaving(true);
      await updateSecuritySettings({ sessionTimeout: timeout });
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account security and authentication
        </p>
      </div>

      {/* Two-Factor Authentication */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-xs text-gray-600">Add an extra layer of security to your account</p>
            </div>
          </div>
          <button
            onClick={handleToggle2FA}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        {settings.twoFactorEnabled && (
          <div className="mt-3 p-3 bg-green-50 rounded-md flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Two-factor authentication is enabled</p>
              <p className="text-xs text-green-700 mt-1">Your account is protected with an additional security layer</p>
            </div>
          </div>
        )}
      </div>

      {/* Session Timeout */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-900 mb-3">
          <div className="flex items-center">
            <Lock className="h-5 w-5 text-gray-400 mr-2" />
            Session Timeout
          </div>
        </label>
        <p className="text-xs text-gray-600 mb-3">
          Automatically log out after period of inactivity
        </p>
        <select
          value={settings.sessionTimeout}
          onChange={(e) => handleUpdateSessionTimeout(Number(e.target.value))}
          disabled={saving}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={120}>2 hours</option>
          <option value={240}>4 hours</option>
          <option value={0}>Never</option>
        </select>
      </div>

      {/* Password Requirements (Read-only display) */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Password Requirements
        </label>
        <p className="text-xs text-gray-600 mb-3">
          Organization password policy requirements
        </p>
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-gray-700">Minimum 8 characters</span>
          </div>
          <div className="flex items-center text-sm">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-gray-700">At least one uppercase letter</span>
          </div>
          <div className="flex items-center text-sm">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-gray-700">At least one lowercase letter</span>
          </div>
          <div className="flex items-center text-sm">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-gray-700">At least one number</span>
          </div>
          <div className="flex items-center text-sm">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-gray-700">At least one special character</span>
          </div>
        </div>
      </div>

      {/* Trusted Devices */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Trusted Devices
        </label>
        <p className="text-xs text-gray-600 mb-3">
          Devices you've marked as trusted won't require two-factor authentication
        </p>
        {settings.trustedDevices.length > 0 ? (
          <div className="space-y-2">
            {settings.trustedDevices.map((device, index) => (
              <div key={device.id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">{device.name} - {device.deviceType}</span>
                <button
                  onClick={() => {
                    const updatedDevices = settings.trustedDevices.filter((_, i) => i !== index);
                    updateSecuritySettings({ trustedDevices: updatedDevices });
                  }}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No trusted devices</p>
        )}
      </div>
    </div>
  );
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
