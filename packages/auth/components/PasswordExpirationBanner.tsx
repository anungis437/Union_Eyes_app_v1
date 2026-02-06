/**
 * @fileoverview Password Expiration Banner Component
 * 
 * Displays a warning banner when user's password is expiring soon
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface PasswordExpirationBannerProps {
  /** Number of days until password expires */
  daysUntilExpiration: number;
  /** Path to change password page */
  changePasswordPath?: string;
  /** Whether the banner can be dismissed */
  dismissible?: boolean;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
}

/**
 * Password Expiration Banner Component
 * 
 * Shows a warning banner at the top of the app when user's password is expiring soon
 * Features:
 * - Color-coded urgency (yellow for 7+ days, orange for 3-6 days, red for <3 days)
 * - Dismissible with sessionStorage persistence
 * - Click to navigate to change password page
 * - Dark mode support
 */
export function PasswordExpirationBanner({
  daysUntilExpiration,
  changePasswordPath = '/change-password',
  dismissible = true,
  onDismiss,
}: PasswordExpirationBannerProps) {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if banner was dismissed this session
  useEffect(() => {
    if (dismissible) {
      const dismissed = sessionStorage.getItem('password-expiration-banner-dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }
  }, [dismissible]);

  /**
   * Handles dismiss action
   */
  const handleDismiss = () => {
    setIsDismissed(true);
    if (dismissible) {
      sessionStorage.setItem('password-expiration-banner-dismissed', 'true');
    }
    onDismiss?.();
  };

  /**
   * Handles navigation to change password page
   */
  const handleChangePassword = () => {
    navigate(changePasswordPath);
  };

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  // Determine urgency level and colors
  const getUrgencyConfig = () => {
    if (daysUntilExpiration < 3) {
      return {
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        iconColor: 'text-red-400',
        textColor: 'text-red-800 dark:text-red-200',
        buttonColor: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
        message: 'Critical: Your password expires very soon!',
      };
    } else if (daysUntilExpiration < 7) {
      return {
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        iconColor: 'text-orange-400',
        textColor: 'text-orange-800 dark:text-orange-200',
        buttonColor: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600',
        message: 'Warning: Your password is expiring soon',
      };
    } else {
      return {
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        iconColor: 'text-yellow-400',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        buttonColor: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600',
        message: 'Reminder: Your password will expire soon',
      };
    }
  };

  const config = getUrgencyConfig();

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border-b px-4 py-3`}
      role="alert"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex items-center flex-1">
            {/* Warning Icon */}
            <div className="flex-shrink-0">
              <svg
                className={`h-5 w-5 ${config.iconColor}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* Message */}
            <div className={`ml-3 ${config.textColor}`}>
              <p className="text-sm font-medium">
                {config.message}
              </p>
              <p className="text-sm">
                Your password expires in{' '}
                <span className="font-semibold">
                  {daysUntilExpiration} {daysUntilExpiration === 1 ? 'day' : 'days'}
                </span>
                . Please change it to maintain account security.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4">
            {/* Change Password Button */}
            <button
              onClick={handleChangePassword}
              className={`${config.buttonColor} text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-blue-500 transition-colors`}
              aria-label="Change password now"
            >
              Change Password
            </button>

            {/* Dismiss Button */}
            {dismissible && (
              <button
                onClick={handleDismiss}
                className={`${config.textColor} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-blue-500 rounded-md p-1 transition-opacity`}
                aria-label="Dismiss password expiration warning"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to calculate days until password expiration
 * 
 * @param expiresAt - ISO date string of when password expires
 * @returns Number of days until expiration (null if no expiration)
 */
export function useDaysUntilExpiration(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;

  const now = new Date();
  const expirationDate = new Date(expiresAt);
  const diffMs = expirationDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}
