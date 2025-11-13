# Unified User Profile Management System

**Phase 2 Week 1 Day 6 - Integration Hub**  
**Status**: ✅ Production-Ready (100% Complete)  
**Lines of Code**: 3,300+ lines  
**Last Updated**: December 2024

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Service Layer](#service-layer)
5. [React Hooks](#react-hooks)
6. [UI Components](#ui-components)
7. [Usage Examples](#usage-examples)
8. [API Reference](#api-reference)
9. [Migration Guide](#migration-guide)
10. [Testing](#testing)
11. [Best Practices](#best-practices)

---

## 🎯 Overview

The Unified User Profile Management System provides a comprehensive, production-ready solution for managing user profiles, preferences, and settings across the Court Lens application. Built with world-class standards, it includes:

- **Complete Profile Management**: CRUD operations for user profiles with 30+ fields
- **Avatar Upload**: Supabase Storage integration with 2MB limit, image validation
- **Preferences System**: 4 categories (Notifications, UI, Privacy, Security)
- **Real-time Updates**: Supabase subscriptions for live profile sync
- **Optimistic UI**: Instant feedback with automatic rollback on errors
- **Activity Tracking**: Login history, last activity, onboarding progress
- **Profile Completeness**: Auto-calculated score (0-100) with triggers
- **Type Safety**: Comprehensive TypeScript interfaces throughout

### Key Features

✅ **Database Layer**: Extended schema with 20+ new columns, storage bucket, RLS policies  
✅ **Service Layer**: 20+ methods covering all profile operations  
✅ **React Hooks**: Real-time subscriptions, optimistic updates, activity auto-tracking  
✅ **UI Components**: 10+ reusable components for profile display and editing  
✅ **Settings Page**: Tabbed interface with comprehensive preference management  
✅ **Accessibility**: WCAG 2.1 AA compliant with ARIA labels  
✅ **Responsive Design**: Mobile-first approach with Tailwind CSS  
✅ **Error Handling**: Graceful failures with user-friendly messages  

---

## 🏗 Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
├─────────────────────────────────────────────────────────────┤
│  ProfileCard | ProfileEditor | AvatarUploader | Settings    │
│  NotificationPanel | UIPanel | PrivacyPanel | SecurityPanel │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      React Hooks Layer                       │
├─────────────────────────────────────────────────────────────┤
│  useUserProfile Hook (650 lines)                            │
│  • State Management (profile, loading, error)               │
│  • Real-time Subscriptions (Supabase)                       │
│  • Optimistic UI Updates                                    │
│  • Activity Auto-tracking                                   │
│  • Computed Properties                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│  UserProfileService (950 lines)                             │
│  • Profile CRUD (4 methods)                                 │
│  • Avatar Management (2 methods)                            │
│  • Preferences (4 categories × update methods)              │
│  • Onboarding (2 methods)                                   │
│  • Activity Tracking (2 methods)                            │
│  • Utilities (3 helper methods)                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Schema (Migration 016 - 420 lines)              │
│  • user_profiles (extended with 20+ columns)                │
│  • user_preferences (granular settings)                     │
│  • Storage Bucket (avatars)                                 │
│  • Helper Functions (5 PostgreSQL functions)                │
│  • RLS Policies (10+ security policies)                     │
│  • Performance Indexes (10+ indexes)                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Action** → Component event handler
2. **Optimistic Update** → Immediate UI update
3. **Service Call** → UserProfileService method
4. **Database Operation** → Supabase client query
5. **Real-time Sync** → Supabase subscription broadcasts change
6. **Hook Update** → useUserProfile refreshes state
7. **Component Re-render** → UI reflects server state

---

## 💾 Database Schema

### Extended user_profiles Table

**Migration**: `016_extend_user_profiles.sql`

#### Personal Information Columns
```sql
first_name VARCHAR(100)
last_name VARCHAR(100)
title VARCHAR(100)           -- Job title
department VARCHAR(100)
bio TEXT                     -- Up to 500 characters
location VARCHAR(200)        -- City, Country
timezone VARCHAR(50)         -- IANA timezone
language VARCHAR(10)         -- ISO 639-1 code
```

#### Preference Columns (JSONB)
```sql
notification_preferences JSONB  -- Email, push, SMS, in-app settings
ui_preferences JSONB            -- Theme, colors, font, layout
privacy_settings JSONB          -- Visibility, contact settings
security_settings JSONB         -- 2FA, session timeout, trusted devices
```

#### Activity Tracking
```sql
last_activity_at TIMESTAMP
login_count INTEGER DEFAULT 0
failed_login_count INTEGER DEFAULT 0
last_failed_login_at TIMESTAMP
```

#### Onboarding
```sql
onboarding_completed BOOLEAN DEFAULT FALSE
onboarding_progress JSONB      -- Steps tracking
```

#### Metadata
```sql
profile_completeness INTEGER   -- Score 0-100 (auto-calculated)
metadata JSONB                 -- Additional custom data
deleted_at TIMESTAMP           -- Soft delete support
```

### user_preferences Table

**Purpose**: Granular settings storage for frequently-changing preferences

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,  -- notification, ui, privacy, security, workflow, integration, custom
  key VARCHAR(100) NOT NULL,      -- Preference key within category
  value JSONB NOT NULL,           -- Preference value
  description TEXT,               -- Optional description
  is_system BOOLEAN DEFAULT FALSE,-- System-managed preference
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_preference UNIQUE(user_id, category, key)
);
```

### Storage Configuration

**Bucket**: `avatars`

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);
```

**Policies**:
- Users can upload their own avatar
- Users can update their own avatar
- Users can delete their own avatar
- Public read access to all avatars

### Helper Functions

#### 1. calculate_profile_completeness(p_user_id UUID)
**Returns**: INTEGER (0-100)  
**Purpose**: Calculate profile completion score based on filled fields

```sql
-- Checks 20+ fields and returns percentage
SELECT calculate_profile_completeness('user-uuid-here');
-- Returns: 75
```

#### 2. update_profile_completeness()
**Trigger Function**: Automatically updates profile_completeness after INSERT/UPDATE

```sql
-- Automatically called on user_profiles changes
-- Updates profile_completeness column
```

#### 3. get_user_full_name(p_user_id UUID)
**Returns**: TEXT  
**Purpose**: Get formatted name (display_name > first+last > email)

```sql
SELECT get_user_full_name('user-uuid-here');
-- Returns: "John Doe" or "johndoe@example.com"
```

#### 4. update_notification_preference(p_user_id, p_channel, p_key, p_value)
**Purpose**: Safely update nested JSONB notification preferences

```sql
SELECT update_notification_preference(
  'user-uuid',
  'email',
  'enabled',
  'true'::jsonb
);
```

#### 5. record_login_activity(p_user_id UUID, p_success BOOLEAN)
**Purpose**: Track login attempts and update counters

```sql
SELECT record_login_activity('user-uuid', TRUE);
-- Increments login_count, updates last_login_at
```

### Performance Indexes

```sql
-- B-tree indexes for common queries
CREATE INDEX idx_user_profiles_first_name ON user_profiles(first_name);
CREATE INDEX idx_user_profiles_last_name ON user_profiles(last_name);
CREATE INDEX idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX idx_user_profiles_department ON user_profiles(department);
CREATE INDEX idx_user_profiles_last_activity ON user_profiles(last_activity_at DESC);
CREATE INDEX idx_user_profiles_completeness ON user_profiles(profile_completeness DESC);

-- GIN indexes for JSONB queries
CREATE INDEX idx_user_profiles_notification_prefs ON user_profiles USING GIN(notification_preferences);
CREATE INDEX idx_user_profiles_ui_prefs ON user_profiles USING GIN(ui_preferences);
CREATE INDEX idx_user_profiles_privacy_settings ON user_profiles USING GIN(privacy_settings);
CREATE INDEX idx_user_profiles_security_settings ON user_profiles USING GIN(security_settings);

-- Filtered index for soft deletes
CREATE INDEX idx_user_profiles_deleted ON user_profiles(deleted_at) WHERE deleted_at IS NOT NULL;
```

---

## 🔧 Service Layer

### UserProfileService Class

**File**: `packages/auth/src/services/userProfileService.ts` (950 lines)

#### Initialization

```typescript
import { createUserProfileService, getUserProfileService } from '@court-lens/auth';

// Create new instance
const service = createUserProfileService();

// Get singleton instance
const service = getUserProfileService();
```

#### Profile CRUD Methods

##### getProfile(userId: string)
Get a user's profile by ID

```typescript
const { data, error } = await service.getProfile('user-uuid');
if (data) {
  console.log(`Name: ${data.firstName} ${data.lastName}`);
  console.log(`Role: ${data.role}`);
  console.log(`Completeness: ${data.profileCompleteness}%`);
}
```

##### getCurrentProfile()
Get the currently authenticated user's profile

```typescript
const { data, error } = await service.getCurrentProfile();
if (data) {
  console.log(`Welcome back, ${data.displayName}!`);
}
```

##### updateProfile(userId: string, updates: UpdateProfileInput)
Update profile fields

```typescript
const { data, error } = await service.updateProfile('user-uuid', {
  firstName: 'John',
  lastName: 'Doe',
  title: 'Senior Attorney',
  department: 'Corporate Law',
  bio: 'Experienced attorney specializing in M&A',
  location: 'New York, NY',
  timezone: 'America/New_York',
  language: 'en'
});
```

##### searchProfiles(organizationId: string, query?: string)
Search profiles within an organization

```typescript
const { data, error } = await service.searchProfiles('org-uuid', 'john');
// Returns array of profiles matching "john" in name/email
```

#### Avatar Management

##### uploadAvatar(userId: string, file: File)
Upload user avatar to Supabase Storage

```typescript
const file = event.target.files[0]; // From <input type="file">
const { data, error } = await service.uploadAvatar('user-uuid', file);

if (data) {
  console.log(`Avatar uploaded: ${data.url}`);
  console.log(`File size: ${data.size} bytes`);
  console.log(`Storage path: ${data.path}`);
}
```

**Validation**:
- Max size: 2MB
- Allowed types: JPEG, PNG, WebP, GIF
- Automatic error messages for violations

##### deleteAvatar(userId: string)
Remove user's avatar from storage and database

```typescript
const { error } = await service.deleteAvatar('user-uuid');
if (!error) {
  console.log('Avatar deleted successfully');
}
```

#### Preferences Management

##### updateNotificationPreferences(userId, preferences)
Update notification settings

```typescript
await service.updateNotificationPreferences('user-uuid', {
  email: {
    enabled: true,
    frequency: 'daily',
    types: ['security', 'tasks', 'deadlines']
  },
  push: {
    enabled: true,
    frequency: 'immediate',
    types: ['mentions', 'assignments']
  }
});
```

##### updateUIPreferences(userId, preferences)
Update UI/appearance settings

```typescript
await service.updateUIPreferences('user-uuid', {
  theme: 'dark',
  colorScheme: 'purple',
  fontSize: 'large',
  compactMode: true,
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h'
});
```

##### updatePrivacySettings(userId, settings)
Update privacy controls

```typescript
await service.updatePrivacySettings('user-uuid', {
  profileVisibility: 'organization',
  showEmail: false,
  showPhone: false,
  showActivity: true,
  allowDirectMessages: true
});
```

##### updateSecuritySettings(userId, settings)
Update security configuration

```typescript
await service.updateSecuritySettings('user-uuid', {
  twoFactorEnabled: true,
  twoFactorMethod: 'app',
  sessionTimeout: 3600, // 1 hour in seconds
  trustedDevices: [
    { id: '1', name: 'MacBook Pro', deviceType: 'desktop', lastUsed: new Date(), addedAt: new Date() }
  ]
});
```

#### Onboarding Methods

##### updateOnboardingProgress(userId, progress)
Update onboarding state

```typescript
await service.updateOnboardingProgress('user-uuid', {
  steps: ['welcome', 'profile', 'preferences', 'tour', 'complete'],
  currentStep: 2,
  completedSteps: ['welcome', 'profile'],
  skippedSteps: []
});
```

##### completeOnboardingStep(userId, stepId)
Mark a single step as complete

```typescript
await service.completeOnboardingStep('user-uuid', 'profile');
// Adds 'profile' to completedSteps, increments currentStep
```

#### Activity Tracking

##### recordLoginActivity(userId, success: boolean)
Track login attempts

```typescript
// On successful login
await service.recordLoginActivity('user-uuid', true);
// Increments login_count, updates last_login_at

// On failed login
await service.recordLoginActivity('user-uuid', false);
// Increments failed_login_count, updates last_failed_login_at
```

##### updateLastActivity(userId)
Update last activity timestamp

```typescript
await service.updateLastActivity('user-uuid');
// Updates last_activity_at to NOW()
```

#### Utility Methods

##### calculateCompleteness(userId)
Get profile completeness score

```typescript
const { data: score } = await service.calculateCompleteness('user-uuid');
console.log(`Profile is ${score}% complete`);
```

##### getFullName(userId)
Get formatted name

```typescript
const { data: name } = await service.getFullName('user-uuid');
console.log(`User: ${name}`);
// Returns: "John Doe" or "johndoe@example.com"
```

##### softDeleteProfile(userId)
Soft delete a profile

```typescript
await service.softDeleteProfile('user-uuid');
// Sets is_active=false, deleted_at=NOW()
```

---

## ⚛️ React Hooks

### useUserProfile Hook

**File**: `packages/auth/src/hooks/useUserProfile.ts` (650 lines)

#### Basic Usage

```typescript
import { useUserProfile } from '@court-lens/auth';

function MyComponent() {
  const {
    profile,
    loading,
    error,
    fullName,
    initials,
    isProfileComplete,
    refreshProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar
  } = useUserProfile();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>Welcome, {fullName}!</h1>
      <p>Profile: {isProfileComplete ? '✅ Complete' : '⏳ Incomplete'}</p>
    </div>
  );
}
```

#### Configuration Options

```typescript
interface UseUserProfileOptions {
  userId?: string;              // Override user ID (default: current user)
  enableRealtime?: boolean;     // Enable real-time subscriptions (default: true)
  autoUpdateActivity?: boolean; // Auto-update activity timestamp (default: true)
  activityInterval?: number;    // Activity update interval in ms (default: 60000)
}

// Example: View another user's profile
const { profile } = useUserProfile({
  userId: 'other-user-uuid',
  enableRealtime: false,
  autoUpdateActivity: false
});
```

#### Return Value

```typescript
interface UseUserProfileReturn {
  // State
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  
  // Computed Properties
  fullName: string;
  initials: string;
  isProfileComplete: boolean;
  
  // Profile Operations
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: UpdateProfileInput) => Promise<void>;
  
  // Avatar Operations
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  
  // Preferences
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  updateUIPreferences: (prefs: Partial<UIPreferences>) => Promise<void>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<void>;
  
  // Onboarding
  completeOnboardingStep: (stepId: string) => Promise<void>;
  updateOnboardingProgress: (progress: Partial<OnboardingProgress>) => Promise<void>;
  
  // Activity
  updateLastActivity: () => Promise<void>;
}
```

#### Optimistic UI Example

```typescript
function ProfileEditor() {
  const { profile, updateProfile } = useUserProfile();
  const [bio, setBio] = useState(profile?.bio || '');

  const handleSave = async () => {
    // UI updates immediately with optimistic value
    await updateProfile({ bio });
    // If error occurs, hook automatically reverts to server state
  };

  return (
    <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
  );
}
```

#### Real-time Updates

The hook automatically subscribes to profile changes and refreshes when:
- Another session updates the profile
- Profile is updated by admin
- Activity tracking updates the timestamp

```typescript
// Real-time updates happen automatically
// No manual polling or refresh needed
const { profile } = useUserProfile(); // Always has latest data
```

---

## 🎨 UI Components

### ProfileCard

**Purpose**: Display user profile summary with avatar and completeness indicator

**File**: `packages/auth/src/components/ProfileComponents.tsx`

```typescript
import { ProfileCard } from '@court-lens/auth';

<ProfileCard
  showCompleteness={true}
  onEditClick={() => setEditing(true)}
  className="mb-6"
/>
```

**Props**:
- `className?: string` - Additional CSS classes
- `showCompleteness?: boolean` - Show progress bar (default: true)
- `onEditClick?: () => void` - Edit button handler

**Features**:
- Avatar with fallback to User icon
- Full name, title, department
- Role badge with color coding
- Active/inactive status badge
- Contact information (email, phone, location, timezone)
- Profile completeness progress bar
- Responsive grid layout
- Loading skeleton

### ProfileEditor

**Purpose**: Form for editing profile fields

```typescript
import { ProfileEditor } from '@court-lens/auth';

<ProfileEditor
  onSave={() => setEditing(false)}
  onCancel={() => setEditing(false)}
  className="p-6"
/>
```

**Props**:
- `onSave?: () => void` - Called after successful save
- `onCancel?: () => void` - Cancel button handler
- `className?: string` - Additional CSS classes

**Features**:
- All editable profile fields
- Real-time character count for bio
- Timezone selector with common zones
- Phone number formatting
- Form validation
- Loading state during save
- Optimistic UI updates
- Error recovery

### AvatarUploader

**Purpose**: Drag-drop avatar upload with preview and validation

```typescript
import { AvatarUploader } from '@court-lens/auth';

<AvatarUploader
  currentAvatarUrl={profile?.avatarUrl}
  size="lg"
  editable={true}
  onUpload={uploadAvatar}
  onDelete={deleteAvatar}
/>
```

**Props**:
- `currentAvatarUrl?: string` - Current avatar URL
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Avatar size (default: 'md')
- `editable?: boolean` - Enable upload/delete (default: true)
- `showUploadButton?: boolean` - Show camera button (default: true)
- `onUpload?: (file: File) => Promise<void>` - Upload handler
- `onDelete?: () => Promise<void>` - Delete handler
- `className?: string` - Additional CSS classes

**Features**:
- Click to upload or drag-drop
- Image preview before upload
- File validation (size, type)
- Upload progress indicator
- Delete confirmation
- Fallback to User icon
- Circular with border and shadow
- Responsive sizing

### NotificationPreferencesPanel

**Purpose**: Manage notification settings across 4 channels

```typescript
import { NotificationPreferencesPanel } from '@court-lens/auth';

<NotificationPreferencesPanel className="bg-white p-6" />
```

**Features**:
- Email notifications with frequency selector
- Push notifications
- SMS notifications
- In-app notifications
- Toggle switches for each channel
- Frequency dropdown (immediate, daily, weekly)
- Real-time save
- Loading states

### UIPreferencesPanel

**Purpose**: Customize appearance and UI behavior

```typescript
import { UIPreferencesPanel } from '@court-lens/auth';

<UIPreferencesPanel className="bg-white p-6" />
```

**Features**:
- Theme selector (Light, Dark, System)
- Accent color picker (5 colors)
- Font size (Small, Medium, Large)
- Compact mode toggle
- Date format selector
- Time format (12h/24h)
- Real-time save
- Visual color swatches

### PrivacySettingsPanel

**Purpose**: Control visibility and privacy

```typescript
import { PrivacySettingsPanel } from '@court-lens/auth';

<PrivacySettingsPanel className="bg-white p-6" />
```

**Features**:
- Profile visibility (Public, Organization, Private)
- Show email toggle
- Show phone toggle
- Show activity status toggle
- Allow direct messages toggle
- Real-time save
- Clear descriptions

### SecuritySettingsPanel

**Purpose**: Manage account security

```typescript
import { SecuritySettingsPanel } from '@court-lens/auth';

<SecuritySettingsPanel className="bg-white p-6" />
```

**Features**:
- Two-factor authentication toggle
- 2FA status indicator
- Session timeout selector
- Password requirements display
- Trusted devices list
- Remove device functionality
- Real-time save
- Security alerts

### ProfileSettingsPage

**Purpose**: Comprehensive settings page with tabbed navigation

```typescript
import { ProfileSettingsPage } from '@court-lens/auth';

<ProfileSettingsPage
  defaultTab="profile"
  onClose={() => navigate('/dashboard')}
  showCloseButton={true}
/>
```

**Props**:
- `defaultTab?: SettingsTab` - Initial tab (default: 'profile')
- `onClose?: () => void` - Close handler
- `showCloseButton?: boolean` - Show X button (default: false)
- `className?: string` - Additional CSS classes

**Tabs**:
1. **Profile** - ProfileCard + ProfileEditor
2. **Notifications** - NotificationPreferencesPanel
3. **Appearance** - UIPreferencesPanel
4. **Privacy** - PrivacySettingsPanel
5. **Security** - SecuritySettingsPanel

**Features**:
- Sidebar navigation with icons
- Tab descriptions
- Help section with docs link
- Responsive layout (mobile/desktop)
- Edit mode for profile tab
- Auto-save in preference tabs

### CompactSettingsModal

**Purpose**: Modal version of settings page

```typescript
import { CompactSettingsModal } from '@court-lens/auth';

const [isOpen, setIsOpen] = useState(false);

<CompactSettingsModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  defaultTab="notifications"
/>
```

**Features**:
- Modal overlay with backdrop
- Full ProfileSettingsPage inside
- Close button
- Max height with scroll
- Esc key to close
- Click outside to close

### SettingsWidget

**Purpose**: Compact widget for quick settings

```typescript
import { SettingsWidget } from '@court-lens/auth';

<SettingsWidget
  onOpenFullSettings={() => navigate('/settings')}
  className="mb-6"
/>
```

**Features**:
- Horizontal tab navigation
- Quick access to all panels
- "View All" button
- Scrollable content area
- Compact size (max-h-96)

---

## 📚 Usage Examples

### Example 1: Profile Display

```typescript
import React from 'react';
import { useUserProfile, ProfileCard } from '@court-lens/auth';

export function UserProfilePage() {
  const { loading } = useUserProfile();

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <ProfileCard
        showCompleteness={true}
        onEditClick={() => alert('Edit clicked')}
      />
    </div>
  );
}
```

### Example 2: Profile Editing

```typescript
import React, { useState } from 'react';
import { ProfileCard, ProfileEditor } from '@court-lens/auth';

export function EditableProfile() {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      {!isEditing ? (
        <ProfileCard onEditClick={() => setIsEditing(true)} />
      ) : (
        <ProfileEditor
          onSave={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </div>
  );
}
```

### Example 3: Avatar Upload

```typescript
import React from 'react';
import { useUserProfile, AvatarUploader } from '@court-lens/auth';

export function AvatarSection() {
  const { profile, uploadAvatar, deleteAvatar } = useUserProfile();

  return (
    <div className="text-center">
      <AvatarUploader
        currentAvatarUrl={profile?.avatarUrl}
        size="xl"
        onUpload={uploadAvatar}
        onDelete={deleteAvatar}
      />
      <p className="mt-2 text-sm text-gray-600">
        Click to upload or drag and drop
      </p>
    </div>
  );
}
```

### Example 4: Notification Settings

```typescript
import React from 'react';
import { NotificationPreferencesPanel } from '@court-lens/auth';

export function NotificationSettings() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Notification Settings</h1>
      <NotificationPreferencesPanel />
    </div>
  );
}
```

### Example 5: Complete Settings Page

```typescript
import React from 'react';
import { ProfileSettingsPage } from '@court-lens/auth';

export function SettingsRoute() {
  return (
    <ProfileSettingsPage
      defaultTab="profile"
      showCloseButton={false}
    />
  );
}
```

### Example 6: Settings Modal

```typescript
import React, { useState } from 'react';
import { CompactSettingsModal } from '@court-lens/auth';

export function Dashboard() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div>
      <button onClick={() => setShowSettings(true)}>
        Open Settings
      </button>
      
      <CompactSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        defaultTab="notifications"
      />
    </div>
  );
}
```

### Example 7: Programmatic Updates

```typescript
import React from 'react';
import { useUserProfile } from '@court-lens/auth';

export function QuickActions() {
  const {
    updateProfile,
    updateUIPreferences,
    updateNotificationPreferences
  } = useUserProfile();

  const enableDarkMode = async () => {
    await updateUIPreferences({ theme: 'dark' });
  };

  const enableAllNotifications = async () => {
    await updateNotificationPreferences({
      email: { enabled: true, frequency: 'immediate', types: [] },
      push: { enabled: true, frequency: 'immediate', types: [] },
      inApp: { enabled: true, types: ['all'] }
    });
  };

  const updateTitle = async () => {
    await updateProfile({ title: 'Senior Partner' });
  };

  return (
    <div className="space-x-2">
      <button onClick={enableDarkMode}>Enable Dark Mode</button>
      <button onClick={enableAllNotifications}>Enable All Notifications</button>
      <button onClick={updateTitle}>Update Title</button>
    </div>
  );
}
```

---

## 📖 API Reference

### TypeScript Interfaces

#### UserProfile
```typescript
interface UserProfile {
  userId: string;
  organizationId: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  title?: string;
  department?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  language?: string;
  notificationPreferences?: NotificationPreferences;
  uiPreferences?: UIPreferences;
  privacySettings?: PrivacySettings;
  securitySettings?: SecuritySettings;
  onboardingCompleted: boolean;
  onboardingProgress?: OnboardingProgress;
  profileCompleteness: number;
  lastActivityAt?: Date;
  loginCount: number;
  failedLoginCount: number;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

#### UpdateProfileInput
```typescript
interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phoneNumber?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  language?: string;
  title?: string;
  department?: string;
}
```

#### NotificationPreferences
```typescript
interface NotificationPreferences {
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    types: NotificationType[];
  };
  push: {
    enabled: boolean;
    frequency: 'immediate' | 'hourly' | 'daily';
    types: NotificationType[];
  };
  sms: {
    enabled: boolean;
    frequency: 'immediate' | 'urgent';
    types: NotificationType[];
  };
  inApp: {
    enabled: boolean;
    types: NotificationType[] | ['all'];
  };
}

type NotificationType =
  | 'security'
  | 'updates'
  | 'mentions'
  | 'tasks'
  | 'deadlines'
  | 'comments'
  | 'assignments'
  | 'system';
```

#### UIPreferences
```typescript
interface UIPreferences {
  theme: 'light' | 'dark' | 'system';
  colorScheme: 'blue' | 'indigo' | 'purple' | 'green' | 'red' | 'orange';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  sidebarCollapsed: boolean;
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  timezone: string;
}
```

#### PrivacySettings
```typescript
interface PrivacySettings {
  profileVisibility: 'public' | 'organization' | 'private';
  showEmail: boolean;
  showPhone: boolean;
  showActivity: boolean;
  allowDirectMessages: boolean;
}
```

#### SecuritySettings
```typescript
interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'app' | 'sms' | 'email';
  sessionTimeout: number; // in seconds
  requirePasswordChange: boolean;
  passwordChangedAt?: Date;
  trustedDevices: TrustedDevice[];
}

interface TrustedDevice {
  id: string;
  name: string;
  deviceType: string;
  lastUsed: Date;
  addedAt: Date;
}
```

---

## 🚀 Migration Guide

### Step 1: Run Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or manually run the migration
psql -d your_database -f packages/supabase/migrations/016_extend_user_profiles.sql
```

### Step 2: Verify Migration

```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles';

-- Check storage bucket created
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Test helper function
SELECT calculate_profile_completeness('your-user-id');
```

### Step 3: Update Package Dependencies

```bash
# In your app directory
pnpm install @court-lens/auth@latest
pnpm install @court-lens/supabase@latest
```

### Step 4: Import and Use Components

```typescript
// In your app
import {
  useUserProfile,
  ProfileCard,
  ProfileEditor,
  ProfileSettingsPage
} from '@court-lens/auth';
```

### Step 5: Test Functionality

1. **Profile Display**: Verify ProfileCard renders with data
2. **Profile Editing**: Test ProfileEditor saves correctly
3. **Avatar Upload**: Upload test image, verify in Supabase Storage
4. **Preferences**: Toggle settings, verify in database
5. **Real-time**: Open two browser tabs, update in one, verify sync

---

## 🧪 Testing

### Unit Tests (Service Layer)

```typescript
// packages/auth/src/services/__tests__/userProfileService.test.ts
import { createUserProfileService } from '../userProfileService';

describe('UserProfileService', () => {
  let service: ReturnType<typeof createUserProfileService>;

  beforeEach(() => {
    service = createUserProfileService();
  });

  test('should get current profile', async () => {
    const { data, error } = await service.getCurrentProfile();
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.userId).toBeTruthy();
  });

  test('should update profile', async () => {
    const updates = { firstName: 'John', lastName: 'Doe' };
    const { data, error } = await service.updateProfile('user-id', updates);
    expect(error).toBeNull();
    expect(data?.firstName).toBe('John');
  });

  test('should validate avatar file size', async () => {
    const largeFile = new File([new ArrayBuffer(3 * 1024 * 1024)], 'large.jpg');
    const { error } = await service.uploadAvatar('user-id', largeFile);
    expect(error).toBeDefined();
    expect(error?.message).toContain('2MB');
  });
});
```

### Hook Tests (React Testing Library)

```typescript
// packages/auth/src/hooks/__tests__/useUserProfile.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useUserProfile } from '../useUserProfile';

describe('useUserProfile', () => {
  test('should load profile on mount', async () => {
    const { result } = renderHook(() => useUserProfile());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.profile).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  test('should update profile optimistically', async () => {
    const { result } = renderHook(() => useUserProfile());
    
    await waitFor(() => expect(result.current.profile).toBeDefined());
    
    const oldBio = result.current.profile?.bio;
    await result.current.updateProfile({ bio: 'New bio' });
    
    // Should update immediately (optimistic)
    expect(result.current.profile?.bio).toBe('New bio');
    
    await waitFor(() => {
      // Server confirms update
      expect(result.current.profile?.bio).toBe('New bio');
    });
  });
});
```

### Component Tests

```typescript
// packages/auth/src/components/__tests__/ProfileCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProfileCard } from '../ProfileComponents';

jest.mock('../hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      role: 'lawyer',
      profileCompleteness: 85
    },
    fullName: 'John Doe',
    isProfileComplete: true
  })
}));

describe('ProfileCard', () => {
  test('should render profile information', () => {
    render(<ProfileCard />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/Lawyer/i)).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/profile-management.spec.ts
import { test, expect } from '@playwright/test';

test('user can update profile', async ({ page }) => {
  await page.goto('/settings');
  
  // Click edit button
  await page.click('button:has-text("Edit Profile")');
  
  // Fill form
  await page.fill('#firstName', 'Jane');
  await page.fill('#lastName', 'Smith');
  await page.fill('#bio', 'Test bio');
  
  // Save
  await page.click('button:has-text("Save Changes")');
  
  // Verify update
  await expect(page.locator('text=Jane Smith')).toBeVisible();
});

test('user can upload avatar', async ({ page }) => {
  await page.goto('/settings');
  
  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/avatar.jpg');
  
  // Wait for upload
  await expect(page.locator('img[alt="Profile"]')).toHaveAttribute('src', /.+/);
});
```

---

## ✅ Best Practices

### 1. Error Handling

Always check for errors from service methods:

```typescript
const { data, error } = await service.updateProfile(userId, updates);
if (error) {
  console.error('Failed to update profile:', error);
  toast.error('Failed to save changes');
  return;
}
toast.success('Profile updated successfully');
```

### 2. Optimistic UI

The `useUserProfile` hook handles optimistic updates automatically, but always provide rollback UX:

```typescript
const { updateProfile } = useUserProfile();

// Hook updates immediately, rolls back on error
await updateProfile({ bio: newBio });
// No manual rollback needed - hook handles it
```

### 3. Real-time Subscriptions

Disable real-time when viewing other users' profiles to avoid unnecessary subscriptions:

```typescript
// Viewing another user
const { profile } = useUserProfile({
  userId: otherUserId,
  enableRealtime: false,
  autoUpdateActivity: false
});
```

### 4. Avatar Validation

Always validate avatar files before upload:

```typescript
const handleFileSelect = async (file: File) => {
  // Check type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }
  
  // Check size
  if (file.size > 2 * 1024 * 1024) {
    alert('Image must be less than 2MB');
    return;
  }
  
  await uploadAvatar(file);
};
```

### 5. Activity Tracking

Use auto-activity tracking for authenticated users only:

```typescript
// In authenticated area
const { profile } = useUserProfile({
  autoUpdateActivity: true,
  activityInterval: 60000 // 1 minute
});

// In public area or viewing others
const { profile } = useUserProfile({
  userId: publicUserId,
  autoUpdateActivity: false
});
```

### 6. Profile Completeness

Encourage users to complete their profile:

```typescript
const { profile, isProfileComplete } = useUserProfile();

if (!isProfileComplete) {
  return (
    <Banner variant="info">
      Your profile is {profile.profileCompleteness}% complete.
      <Link to="/settings">Complete your profile</Link> to unlock all features.
    </Banner>
  );
}
```

### 7. Preference Defaults

Always provide default values for preferences:

```typescript
const theme = profile?.uiPreferences?.theme || 'light';
const notifications = profile?.notificationPreferences?.email?.enabled ?? true;
```

### 8. Security Settings

Never expose sensitive security data in client logs:

```typescript
// ❌ Bad
console.log('Security settings:', profile.securitySettings);

// ✅ Good
console.log('2FA enabled:', profile.securitySettings?.twoFactorEnabled);
```

### 9. Component Composition

Compose components for flexibility:

```typescript
// Flexible layout
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    <ProfileCard />
  </div>
  <div>
    <NotificationPreferencesPanel />
  </div>
</div>
```

### 10. Accessibility

Always provide ARIA labels and semantic HTML:

```typescript
<button
  onClick={handleUpload}
  aria-label="Upload profile picture"
  className="..."
>
  <Camera className="h-4 w-4" />
</button>
```

---

## 📊 Performance Considerations

### Database Queries

- Use indexes for common query patterns
- GIN indexes for JSONB searches
- Filter by `deleted_at IS NULL` for active profiles
- Limit result sets with pagination

### Real-time Subscriptions

- One subscription per user's own profile
- Disable subscriptions when viewing other users
- Unsubscribe on component unmount (handled automatically)

### Avatar Uploads

- 2MB max size enforced
- Image compression recommended before upload
- Use WebP format for better compression
- Lazy load avatars in lists

### State Management

- Optimistic updates for instant feedback
- Automatic rollback on errors
- Local state synchronized with server state
- Debounce rapid updates

---

## 🎓 Training & Documentation

### For Developers

1. **Setup**: Follow [Migration Guide](#migration-guide)
2. **Examples**: Review [Usage Examples](#usage-examples)
3. **API**: Study [API Reference](#api-reference)
4. **Testing**: Write tests using [Testing](#testing) patterns

### For Users

1. **Profile Management**: Update personal information in Profile tab
2. **Avatar Upload**: Click avatar to upload or drag-drop image
3. **Notifications**: Configure channels and frequency in Notifications tab
4. **Appearance**: Customize theme, colors, and layout in Appearance tab
5. **Privacy**: Control visibility in Privacy tab
6. **Security**: Enable 2FA and manage sessions in Security tab

---

## 📝 Changelog

### Version 1.0.0 (December 2024)

**Initial Release** ✅

- ✅ Database migration with 20+ new columns
- ✅ UserProfileService with 20+ methods
- ✅ useUserProfile hook with real-time updates
- ✅ 10+ UI components (ProfileCard, ProfileEditor, AvatarUploader, Preference Panels)
- ✅ ProfileSettingsPage with tabbed navigation
- ✅ Avatar upload to Supabase Storage
- ✅ Optimistic UI patterns
- ✅ Activity tracking
- ✅ Onboarding support
- ✅ Profile completeness calculation
- ✅ Comprehensive TypeScript types
- ✅ Full documentation

**Lines of Code**: 3,300+  
**Files Created**: 5  
**Features**: 50+

---

## 🤝 Support

For questions or issues:

1. **Documentation**: Check this README
2. **Examples**: Review code examples above
3. **Tests**: Run test suite for reference implementations
4. **Team**: Contact development team

---

## 📄 License

Copyright © 2024 Court Lens. All rights reserved.

---

**Status**: ✅ Production-Ready  
**Version**: 1.0.0  
**Last Updated**: December 2024  
**Maintained By**: Court Lens Development Team
