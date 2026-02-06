/**
 * @fileoverview Change Password Page Component
 * 
 * Allows authenticated users to change their password with validation and policy enforcement
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePasswordValidation } from '../hooks/usePasswordValidation';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { checkPasswordHistory } from '../utils/passwordPolicy';
import { createClient } from '@supabase/supabase-js';

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface ChangePasswordPageProps {
  /** Optional redirect path after successful password change */
  redirectTo?: string;
  /** Whether this is a forced password change (expired/must change) */
  isRequired?: boolean;
}

/**
 * Change Password Page Component
 * 
 * Provides a secure password change interface with:
 * - Current password verification
 * - New password strength validation
 * - Password history checking (prevents reuse)
 * - Password confirmation matching
 * - Visual feedback with PasswordStrengthMeter
 * - Dark mode support
 */
export function ChangePasswordPage({ 
  redirectTo = '/dashboard',
  isRequired = false 
}: ChangePasswordPageProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize Supabase client
  const supabaseUrl = (typeof window !== 'undefined' && (window as any).VITE_SUPABASE_URL) || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = (typeof window !== 'undefined' && (window as any).VITE_SUPABASE_ANON_KEY) || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = React.useMemo(() => createClient(supabaseUrl, supabaseKey), [supabaseUrl, supabaseKey]);

  // Validate new password with standard preset
  const passwordValidation = usePasswordValidation(formData.newPassword, {});

  /**
   * Handles form field changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  /**
   * Validates the form data
   */
  const validateForm = (): string | null => {
    if (!formData.currentPassword) {
      return 'Current password is required';
    }

    if (!formData.newPassword) {
      return 'New password is required';
    }

    if (!passwordValidation.isValid) {
      return 'New password does not meet security requirements';
    }

    if (formData.newPassword !== formData.confirmNewPassword) {
      return 'New password and confirmation do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      return 'New password must be different from current password';
    }

    return null;
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: formData.currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Check password history (prevent reuse of last 5 passwords)
      const canUsePassword = await checkPasswordHistory(
        user.id,
        formData.newPassword,
        supabaseUrl,
        supabaseKey,
        5
      );

      if (!canUsePassword) {
        throw new Error('Cannot reuse a password from your recent password history');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Update user metadata to clear must_change_password flag
      await supabase.auth.updateUser({
        data: {
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
        },
      });

      // Success!
      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate(redirectTo);
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles cancel action (only if not required)
   */
  const handleCancel = () => {
    if (!isRequired) {
      navigate(redirectTo);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {isRequired ? 'Password Change Required' : 'Change Your Password'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {isRequired 
              ? 'Your password has expired or must be changed. Please create a new password.'
              : 'Update your password to keep your account secure'
            }
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  Password changed successfully!
                </h3>
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <p>Redirecting you...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  {error}
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="sr-only">
                Current Password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                placeholder="Current Password"
                value={formData.currentPassword}
                onChange={handleChange}
                disabled={isLoading || success}
              />
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="sr-only">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                placeholder="New Password"
                value={formData.newPassword}
                onChange={handleChange}
                disabled={isLoading || success}
              />
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="confirmNewPassword" className="sr-only">
                Confirm New Password
              </label>
              <input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                placeholder="Confirm New Password"
                value={formData.confirmNewPassword}
                onChange={handleChange}
                disabled={isLoading || success}
              />
            </div>
          </div>

          {/* Password Strength Meter */}
          {formData.newPassword && (
            <div className="mt-4">
              <PasswordStrengthMeter
                password={formData.newPassword}
                showRequirements={true}
              />
            </div>
          )}

          {/* Password Requirements */}
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p className="font-medium">Your new password must:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Be at least 8 characters long</li>
              <li>Include at least one uppercase letter</li>
              <li>Include at least one lowercase letter</li>
              <li>Include at least one number</li>
              <li>Include at least one special character</li>
              <li>Not be the same as your current password</li>
              <li>Not match any of your last 5 passwords</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading || !passwordValidation.isValid || success}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </button>

            {!isRequired && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading || success}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Warning for Required Changes */}
        {isRequired && (
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Password change is required
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>You must change your password to continue using the application.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
