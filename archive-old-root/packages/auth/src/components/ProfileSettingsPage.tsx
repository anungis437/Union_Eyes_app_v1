// Profile Settings Page
// Comprehensive settings interface for user profile management
// Part of Phase 2 Week 1 Day 6 - Unified User Profile Management

import React, { useState } from 'react';
import { User, Bell, Palette, Lock, Eye, Settings as SettingsIcon, X } from 'lucide-react';
import { ProfileCard, ProfileEditor } from './ProfileComponents';
import { 
  NotificationPreferencesPanel, 
  UIPreferencesPanel, 
  PrivacySettingsPanel, 
  SecuritySettingsPanel 
} from './PreferencesPanels';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type SettingsTab = 
  | 'profile' 
  | 'notifications' 
  | 'appearance' 
  | 'privacy' 
  | 'security';

export interface SettingsPageProps {
  defaultTab?: SettingsTab;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

const tabs: Array<{
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
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

export const ProfileSettingsPage: React.FC<SettingsPageProps> = ({
  defaultTab = 'profile',
  onClose,
  showCloseButton = false,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);
  const [isEditing, setIsEditing] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {!isEditing ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      This is how others will see you on the platform
                    </p>
                  </div>
                </div>
                <ProfileCard 
                  showCompleteness={true}
                  onEditClick={() => setIsEditing(true)}
                />
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Update your personal information
                  </p>
                </div>
                <ProfileEditor
                  onSave={() => setIsEditing(false)}
                  onCancel={() => setIsEditing(false)}
                />
              </div>
            )}
          </div>
        );

      case 'notifications':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <NotificationPreferencesPanel />
          </div>
        );

      case 'appearance':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <UIPreferencesPanel />
          </div>
        );

      case 'privacy':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <PrivacySettingsPanel />
          </div>
        );

      case 'security':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <SecuritySettingsPanel />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <SettingsIcon className="h-8 w-8 text-gray-700 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your account settings and preferences
                </p>
              </div>
            </div>
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
                aria-label="Close settings"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="bg-white rounded-lg shadow">
              <ul className="divide-y divide-gray-200">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => {
                          setActiveTab(tab.id);
                          setIsEditing(false); // Reset editing state when switching tabs
                        }}
                        className={`w-full text-left px-4 py-4 flex items-start hover:bg-gray-50 transition-colors ${
                          isActive ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 mr-3 flex-shrink-0 mt-0.5 ${
                            isActive ? 'text-blue-600' : 'text-gray-400'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              isActive ? 'text-blue-900' : 'text-gray-900'
                            }`}
                          >
                            {tab.label}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {tab.description}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Help Section */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Need Help?</h3>
              <p className="text-xs text-blue-800 mb-3">
                Learn more about these settings in our documentation
              </p>
              <a
                href="/docs/settings"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View Documentation →
              </a>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// COMPACT SETTINGS MODAL COMPONENT
// =============================================================================

export interface CompactSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: SettingsTab;
}

export const CompactSettingsModal: React.FC<CompactSettingsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'profile'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
        
        {/* Modal */}
        <div className="relative bg-gray-50 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <ProfileSettingsPage
            defaultTab={defaultTab}
            onClose={onClose}
            showCloseButton={true}
            className="max-h-[90vh] overflow-y-auto"
          />
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SETTINGS WIDGET COMPONENT (Compact)
// =============================================================================

export interface SettingsWidgetProps {
  onOpenFullSettings?: () => void;
  className?: string;
}

export const SettingsWidget: React.FC<SettingsWidgetProps> = ({
  onOpenFullSettings,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const renderQuickSettings = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileCard showCompleteness={true} />;
      case 'notifications':
        return <NotificationPreferencesPanel />;
      case 'appearance':
        return <UIPreferencesPanel />;
      case 'privacy':
        return <PrivacySettingsPanel />;
      case 'security':
        return <SecuritySettingsPanel />;
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Quick Settings</h2>
          {onOpenFullSettings && (
            <button
              onClick={onOpenFullSettings}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-3 border-b border-gray-200">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title={tab.description}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-h-96 overflow-y-auto">
        {renderQuickSettings()}
      </div>
    </div>
  );
};

// =============================================================================
// EXPORT ALL COMPONENTS
// =============================================================================

export default {
  ProfileSettingsPage,
  CompactSettingsModal,
  SettingsWidget
};
