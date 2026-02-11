// Profile UI Components
// Reusable components for user profile management
// Part of Phase 2 Week 1 Day 6 - Unified User Profile Management

import React, { useRef, useState } from 'react';
import { User, Camera, Upload, X, Check, Mail, Phone, MapPin, Briefcase, Building2, Globe } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
import type { UpdateProfileInput } from '../services/userProfileService';

// =============================================================================
// AVATAR UPLOADER COMPONENT
// =============================================================================

export interface AvatarUploaderProps {
  currentAvatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  showUploadButton?: boolean;
  onUpload?: (file: File) => Promise<any>;
  onDelete?: () => Promise<void>;
  className?: string;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentAvatarUrl,
  size = 'md',
  editable = true,
  showUploadButton = true,
  onUpload,
  onDelete,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  };

  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-18 w-18'
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    if (onUpload) {
      try {
        setUploading(true);
        await onUpload(file);
        setPreviewUrl(null);
      } catch (error) {
        alert('Failed to upload avatar');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    if (confirm('Are you sure you want to remove your profile picture?')) {
      try {
        setUploading(true);
        await onDelete();
        setPreviewUrl(null);
      } catch (error) {
        alert('Failed to delete avatar');
      } finally {
        setUploading(false);
      }
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg`}>
        {displayUrl ? (
          <img 
            src={displayUrl} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        ) : (
          <User className={`${iconSizes[size]} text-gray-400`} />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>
      
      {editable && !uploading && (
        <>
          {showUploadButton && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg transition-colors"
              aria-label="Upload profile picture"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
          
          {displayUrl && (
            <button
              onClick={handleDelete}
              className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg transition-colors"
              aria-label="Remove profile picture"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            aria-label="Upload profile picture"
          />
        </>
      )}
    </div>
  );
};

// =============================================================================
// PROFILE CARD COMPONENT
// =============================================================================

export interface ProfileCardProps {
  className?: string;
  showCompleteness?: boolean;
  onEditClick?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  className = '',
  showCompleteness = true,
  onEditClick
}) => {
  const { profile, fullName, isProfileComplete, uploadAvatar, deleteAvatar } = useUserProfile();

  if (!profile) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-gray-200 h-20 w-20"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <AvatarUploader
              currentAvatarUrl={profile.avatarUrl}
              size="lg"
              onUpload={uploadAvatar}
              onDelete={deleteAvatar}
            />
            
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{fullName}</h3>
              {profile.title && (
                <p className="text-sm text-gray-600 mt-1 flex items-center">
                  <Briefcase className="h-4 w-4 mr-1" />
                  {profile.title}
                </p>
              )}
              {profile.department && (
                <p className="text-sm text-gray-600 mt-1 flex items-center">
                  <Building2 className="h-4 w-4 mr-1" />
                  {profile.department}
                </p>
              )}
              <div className="mt-2 flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  profile.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                  profile.role === 'org_admin' ? 'bg-blue-100 text-blue-800' :
                  profile.role === 'lawyer' ? 'bg-green-100 text-green-800' :
                  profile.role === 'paralegal' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                {profile.isActive ? (
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {onEditClick && (
            <button
              onClick={onEditClick}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        {profile.bio && (
          <p className="mt-4 text-gray-700">{profile.bio}</p>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profile.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2 text-gray-400" />
              {profile.email}
            </div>
          )}
          {profile.phoneNumber && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2 text-gray-400" />
              {profile.phoneNumber}
            </div>
          )}
          {profile.location && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              {profile.location}
            </div>
          )}
          {profile.timezone && profile.timezone !== 'UTC' && (
            <div className="flex items-center text-sm text-gray-600">
              <Globe className="h-4 w-4 mr-2 text-gray-400" />
              {profile.timezone}
            </div>
          )}
        </div>

        {showCompleteness && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Profile Completeness</span>
              <span className="text-sm font-semibold text-gray-900">{profile.profileCompleteness}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  isProfileComplete ? 'bg-green-600' : 'bg-blue-600'
                }`}
                style={{ width: `${profile.profileCompleteness}%` }}
              ></div>
            </div>
            {!isProfileComplete && (
              <p className="mt-2 text-xs text-gray-600">
                Complete your profile to unlock all features
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// PROFILE EDITOR COMPONENT
// =============================================================================

export interface ProfileEditorProps {
  onSave?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({
  onSave,
  onCancel,
  className = ''
}) => {
  const { profile, updateProfile } = useUserProfile();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileInput>({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    displayName: profile?.displayName || '',
    phoneNumber: profile?.phoneNumber || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    timezone: profile?.timezone || 'UTC',
    language: profile?.language || 'en',
    title: profile?.title || '',
    department: profile?.department || ''
  });

  const handleChange = (field: keyof UpdateProfileInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await updateProfile(formData);
      onSave?.();
    } catch (error) {
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
            Display Name
          </label>
          <input
            type="text"
            id="displayName"
            value={formData.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            placeholder="How you'd like to be called"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => handleChange('phoneNumber', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Job Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            placeholder="e.g., Senior Attorney"
          />
        </div>

        {/* Department */}
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-700">
            Department
          </label>
          <input
            type="text"
            id="department"
            value={formData.department}
            onChange={(e) => handleChange('department', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            placeholder="e.g., Corporate Law"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            placeholder="City, Country"
          />
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
            Timezone
          </label>
          <select
            id="timezone"
            value={formData.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
            <option value="Australia/Sydney">Sydney</option>
          </select>
        </div>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          id="bio"
          rows={4}
          value={formData.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          placeholder="Tell us about yourself..."
        />
        <p className="mt-1 text-xs text-gray-500">
          Brief description for your profile. Maximum 500 characters.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={saving}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// =============================================================================
// EXPORT ALL COMPONENTS
// =============================================================================

export default {
  AvatarUploader,
  ProfileCard,
  ProfileEditor
};
