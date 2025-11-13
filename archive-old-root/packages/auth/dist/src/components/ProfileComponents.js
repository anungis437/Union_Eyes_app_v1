import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Profile UI Components
// Reusable components for user profile management
// Part of Phase 2 Week 1 Day 6 - Unified User Profile Management
import { useRef, useState } from 'react';
import { User, Camera, X, Check, Mail, Phone, MapPin, Briefcase, Building2, Globe } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
export const AvatarUploader = ({ currentAvatarUrl, size = 'md', editable = true, showUploadButton = true, onUpload, onDelete, className = '' }) => {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
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
    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
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
            setPreviewUrl(e.target?.result);
        };
        reader.readAsDataURL(file);
        // Upload
        if (onUpload) {
            try {
                setUploading(true);
                await onUpload(file);
                setPreviewUrl(null);
            }
            catch (error) {
                console.error('Error uploading avatar:', error);
                alert('Failed to upload avatar');
            }
            finally {
                setUploading(false);
            }
        }
    };
    const handleDelete = async () => {
        if (!onDelete)
            return;
        if (confirm('Are you sure you want to remove your profile picture?')) {
            try {
                setUploading(true);
                await onDelete();
                setPreviewUrl(null);
            }
            catch (error) {
                console.error('Error deleting avatar:', error);
                alert('Failed to delete avatar');
            }
            finally {
                setUploading(false);
            }
        }
    };
    const displayUrl = previewUrl || currentAvatarUrl;
    return (_jsxs("div", { className: `relative inline-block ${className}`, children: [_jsxs("div", { className: `${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg`, children: [displayUrl ? (_jsx("img", { src: displayUrl, alt: "Profile", className: "w-full h-full object-cover" })) : (_jsx(User, { className: `${iconSizes[size]} text-gray-400` })), uploading && (_jsx("div", { className: "absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-white" }) }))] }), editable && !uploading && (_jsxs(_Fragment, { children: [showUploadButton && (_jsx("button", { onClick: () => fileInputRef.current?.click(), className: "absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg transition-colors", "aria-label": "Upload profile picture", children: _jsx(Camera, { className: "h-4 w-4" }) })), displayUrl && (_jsx("button", { onClick: handleDelete, className: "absolute top-0 right-0 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg transition-colors", "aria-label": "Remove profile picture", children: _jsx(X, { className: "h-3 w-3" }) })), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", className: "hidden", onChange: handleFileSelect, "aria-label": "Upload profile picture" })] }))] }));
};
export const ProfileCard = ({ className = '', showCompleteness = true, onEditClick }) => {
    const { profile, fullName, isProfileComplete, uploadAvatar, deleteAvatar } = useUserProfile();
    if (!profile) {
        return (_jsx("div", { className: `bg-white rounded-lg shadow p-6 ${className}`, children: _jsx("div", { className: "animate-pulse", children: _jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("div", { className: "rounded-full bg-gray-200 h-20 w-20" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-3/4" }), _jsx("div", { className: "h-3 bg-gray-200 rounded w-1/2" })] })] }) }) }));
    }
    return (_jsx("div", { className: `bg-white rounded-lg shadow ${className}`, children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsx(AvatarUploader, { currentAvatarUrl: profile.avatarUrl, size: "lg", onUpload: uploadAvatar, onDelete: deleteAvatar }), _jsxs("div", { children: [_jsx("h3", { className: "text-2xl font-bold text-gray-900", children: fullName }), profile.title && (_jsxs("p", { className: "text-sm text-gray-600 mt-1 flex items-center", children: [_jsx(Briefcase, { className: "h-4 w-4 mr-1" }), profile.title] })), profile.department && (_jsxs("p", { className: "text-sm text-gray-600 mt-1 flex items-center", children: [_jsx(Building2, { className: "h-4 w-4 mr-1" }), profile.department] })), _jsxs("div", { className: "mt-2 flex items-center space-x-2", children: [_jsx("span", { className: `px-2 py-1 text-xs rounded-full ${profile.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                                                        profile.role === 'org_admin' ? 'bg-blue-100 text-blue-800' :
                                                            profile.role === 'lawyer' ? 'bg-green-100 text-green-800' :
                                                                profile.role === 'paralegal' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-gray-100 text-gray-800'}`, children: profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }), profile.isActive ? (_jsx("span", { className: "px-2 py-1 text-xs rounded-full bg-green-100 text-green-800", children: "Active" })) : (_jsx("span", { className: "px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800", children: "Inactive" }))] })] })] }), onEditClick && (_jsx("button", { onClick: onEditClick, className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors", children: "Edit Profile" }))] }), profile.bio && (_jsx("p", { className: "mt-4 text-gray-700", children: profile.bio })), _jsxs("div", { className: "mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4", children: [profile.email && (_jsxs("div", { className: "flex items-center text-sm text-gray-600", children: [_jsx(Mail, { className: "h-4 w-4 mr-2 text-gray-400" }), profile.email] })), profile.phoneNumber && (_jsxs("div", { className: "flex items-center text-sm text-gray-600", children: [_jsx(Phone, { className: "h-4 w-4 mr-2 text-gray-400" }), profile.phoneNumber] })), profile.location && (_jsxs("div", { className: "flex items-center text-sm text-gray-600", children: [_jsx(MapPin, { className: "h-4 w-4 mr-2 text-gray-400" }), profile.location] })), profile.timezone && profile.timezone !== 'UTC' && (_jsxs("div", { className: "flex items-center text-sm text-gray-600", children: [_jsx(Globe, { className: "h-4 w-4 mr-2 text-gray-400" }), profile.timezone] }))] }), showCompleteness && (_jsxs("div", { className: "mt-6 pt-6 border-t border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "Profile Completeness" }), _jsxs("span", { className: "text-sm font-semibold text-gray-900", children: [profile.profileCompleteness, "%"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all ${isProfileComplete ? 'bg-green-600' : 'bg-blue-600'}`, style: { width: `${profile.profileCompleteness}%` } }) }), !isProfileComplete && (_jsx("p", { className: "mt-2 text-xs text-gray-600", children: "Complete your profile to unlock all features" }))] }))] }) }));
};
export const ProfileEditor = ({ onSave, onCancel, className = '' }) => {
    const { profile, updateProfile } = useUserProfile();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
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
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await updateProfile(formData);
            onSave?.();
        }
        catch (error) {
            console.error('Error saving profile:', error);
            alert('Failed to save profile');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: `space-y-6 ${className}`, children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "firstName", className: "block text-sm font-medium text-gray-700", children: "First Name" }), _jsx("input", { type: "text", id: "firstName", value: formData.firstName, onChange: (e) => handleChange('firstName', e.target.value), className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "lastName", className: "block text-sm font-medium text-gray-700", children: "Last Name" }), _jsx("input", { type: "text", id: "lastName", value: formData.lastName, onChange: (e) => handleChange('lastName', e.target.value), className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "displayName", className: "block text-sm font-medium text-gray-700", children: "Display Name" }), _jsx("input", { type: "text", id: "displayName", value: formData.displayName, onChange: (e) => handleChange('displayName', e.target.value), className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border", placeholder: "How you'd like to be called" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "phoneNumber", className: "block text-sm font-medium text-gray-700", children: "Phone Number" }), _jsx("input", { type: "tel", id: "phoneNumber", value: formData.phoneNumber, onChange: (e) => handleChange('phoneNumber', e.target.value), className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border", placeholder: "+1 (555) 123-4567" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "title", className: "block text-sm font-medium text-gray-700", children: "Job Title" }), _jsx("input", { type: "text", id: "title", value: formData.title, onChange: (e) => handleChange('title', e.target.value), className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border", placeholder: "e.g., Senior Attorney" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "department", className: "block text-sm font-medium text-gray-700", children: "Department" }), _jsx("input", { type: "text", id: "department", value: formData.department, onChange: (e) => handleChange('department', e.target.value), className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border", placeholder: "e.g., Corporate Law" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "location", className: "block text-sm font-medium text-gray-700", children: "Location" }), _jsx("input", { type: "text", id: "location", value: formData.location, onChange: (e) => handleChange('location', e.target.value), className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border", placeholder: "City, Country" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "timezone", className: "block text-sm font-medium text-gray-700", children: "Timezone" }), _jsxs("select", { id: "timezone", value: formData.timezone, onChange: (e) => handleChange('timezone', e.target.value), className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border", children: [_jsx("option", { value: "UTC", children: "UTC" }), _jsx("option", { value: "America/New_York", children: "Eastern Time" }), _jsx("option", { value: "America/Chicago", children: "Central Time" }), _jsx("option", { value: "America/Denver", children: "Mountain Time" }), _jsx("option", { value: "America/Los_Angeles", children: "Pacific Time" }), _jsx("option", { value: "Europe/London", children: "London" }), _jsx("option", { value: "Europe/Paris", children: "Paris" }), _jsx("option", { value: "Asia/Tokyo", children: "Tokyo" }), _jsx("option", { value: "Australia/Sydney", children: "Sydney" })] })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "bio", className: "block text-sm font-medium text-gray-700", children: "Bio" }), _jsx("textarea", { id: "bio", rows: 4, value: formData.bio, onChange: (e) => handleChange('bio', e.target.value), className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border", placeholder: "Tell us about yourself..." }), _jsx("p", { className: "mt-1 text-xs text-gray-500", children: "Brief description for your profile. Maximum 500 characters." })] }), _jsxs("div", { className: "flex justify-end space-x-3", children: [onCancel && (_jsx("button", { type: "button", onClick: onCancel, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500", disabled: saving, children: "Cancel" })), _jsx("button", { type: "submit", className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center", disabled: saving, children: saving ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" }), "Saving..."] })) : (_jsxs(_Fragment, { children: [_jsx(Check, { className: "h-4 w-4 mr-2" }), "Save Changes"] })) })] })] }));
};
// =============================================================================
// EXPORT ALL COMPONENTS
// =============================================================================
export default {
    AvatarUploader,
    ProfileCard,
    ProfileEditor
};
//# sourceMappingURL=ProfileComponents.js.map