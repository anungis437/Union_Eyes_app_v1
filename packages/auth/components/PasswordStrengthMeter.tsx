/**
 * Password Strength Meter Component
 * 
 * World-class password strength visualization with:
 * - Real-time strength calculation
 * - Visual progress bar with color coding
 * - Detailed requirement checklist
 * - Helpful feedback messages
 * - Accessible (ARIA labels)
 * - Customizable styling
 */

import React, { useMemo } from 'react';
import {
  calculatePasswordStrength,
  validatePassword,
  generatePolicyDescription,
  PasswordPolicyConfig,
  DEFAULT_PASSWORD_POLICY,
  PasswordStrength,
} from '../utils/passwordPolicy';

// ============================================================================
// Types
// ============================================================================

interface PasswordStrengthMeterProps {
  password: string;
  config?: PasswordPolicyConfig;
  userInfo?: { email?: string; name?: string; username?: string };
  showRequirements?: boolean;
  showFeedback?: boolean;
  showPolicyDescription?: boolean;
  className?: string;
  compactMode?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  config = DEFAULT_PASSWORD_POLICY,
  userInfo,
  showRequirements = true,
  showFeedback = true,
  showPolicyDescription = false,
  className = '',
  compactMode = false,
}) => {
  const strength = useMemo(
    () => calculatePasswordStrength(password, config, userInfo),
    [password, config, userInfo]
  );

  const validation = useMemo(
    () => validatePassword(password, config, userInfo),
    [password, config, userInfo]
  );

  const policyDescription = useMemo(
    () => generatePolicyDescription(config),
    [config]
  );

  // Don't show anything if password is empty
  if (!password || password.length === 0) {
    if (showPolicyDescription) {
      return (
        <div className={`password-strength-meter ${className}`}>
          <div className="policy-description">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">
              Password Requirements:
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {policyDescription.map((req, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`password-strength-meter ${className}`}>
      {/* Strength Bar */}
      <div className="strength-bar-container mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Password Strength
          </span>
          <span className={`text-xs font-semibold ${getStrengthTextColor(strength.level)}`}>
            {getStrengthLabel(strength.level)} ({strength.score}/100)
          </span>
        </div>
        
        <div
          className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={strength.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Password strength: ${strength.score} out of 100`}
        >
          <div
            className={`h-full transition-all duration-300 ${getStrengthBarColor(strength.level)}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && !compactMode && (
        <div className="requirements-checklist mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Requirements:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <RequirementItem
              met={strength.requirements.length}
              label={`${config.minLength}+ characters`}
            />
            {config.requireUppercase && (
              <RequirementItem
                met={strength.requirements.uppercase}
                label="Uppercase letter"
              />
            )}
            {config.requireLowercase && (
              <RequirementItem
                met={strength.requirements.lowercase}
                label="Lowercase letter"
              />
            )}
            {config.requireNumbers && (
              <RequirementItem
                met={strength.requirements.numbers}
                label="Number"
              />
            )}
            {config.requireSpecialChars && (
              <RequirementItem
                met={strength.requirements.specialChars}
                label="Special character"
              />
            )}
            {config.preventCommonPasswords && (
              <RequirementItem
                met={strength.requirements.notCommon}
                label="Not common"
              />
            )}
            {config.preventUserInfo && userInfo && (
              <RequirementItem
                met={strength.requirements.notUserInfo}
                label="No personal info"
              />
            )}
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {showFeedback && !compactMode && strength.feedback.length > 0 && (
        <div className="feedback-messages">
          {validation.errors.length > 0 && (
            <div className="errors mb-2">
              {validation.errors.map((error, idx) => (
                <div
                  key={idx}
                  className="flex items-start text-xs text-red-600 dark:text-red-400 mb-1"
                >
                  <svg
                    className="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="warnings mb-2">
              {validation.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="flex items-start text-xs text-yellow-600 dark:text-yellow-400 mb-1"
                >
                  <svg
                    className="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          <div className="suggestions">
            {strength.feedback.slice(0, 3).map((feedback, idx) => (
              <div
                key={idx}
                className={`flex items-start text-xs mb-1 ${
                  strength.score >= 60
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                <svg
                  className="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{feedback}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compact Mode Feedback */}
      {compactMode && !validation.valid && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          {validation.errors[0]}
        </p>
      )}

      {/* Policy Description (optional) */}
      {showPolicyDescription && !compactMode && (
        <details className="mt-3">
          <summary className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
            View Full Password Policy
          </summary>
          <ul className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1 pl-4">
            {policyDescription.map((req, idx) => (
              <li key={idx} className="list-disc">
                {req}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

interface RequirementItemProps {
  met: boolean;
  label: string;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ met, label }) => (
  <div className="flex items-center text-xs">
    {met ? (
      <svg
        className="w-4 h-4 mr-1.5 text-green-500 dark:text-green-400"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 mr-1.5 text-gray-400 dark:text-gray-500"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    )}
    <span className={met ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}>
      {label}
    </span>
  </div>
);

// ============================================================================
// Helper Functions
// ============================================================================

function getStrengthLabel(level: PasswordStrength['level']): string {
  const labels = {
    'very-weak': 'Very Weak',
    'weak': 'Weak',
    'fair': 'Fair',
    'good': 'Good',
    'strong': 'Strong',
    'very-strong': 'Very Strong',
  };
  return labels[level];
}

function getStrengthBarColor(level: PasswordStrength['level']): string {
  const colors = {
    'very-weak': 'bg-red-500',
    'weak': 'bg-orange-500',
    'fair': 'bg-yellow-500',
    'good': 'bg-blue-500',
    'strong': 'bg-green-500',
    'very-strong': 'bg-emerald-500',
  };
  return colors[level];
}

function getStrengthTextColor(level: PasswordStrength['level']): string {
  const colors = {
    'very-weak': 'text-red-600 dark:text-red-400',
    'weak': 'text-orange-600 dark:text-orange-400',
    'fair': 'text-yellow-600 dark:text-yellow-400',
    'good': 'text-blue-600 dark:text-blue-400',
    'strong': 'text-green-600 dark:text-green-400',
    'very-strong': 'text-emerald-600 dark:text-emerald-400',
  };
  return colors[level];
}

// ============================================================================
// Export
// ============================================================================

export default PasswordStrengthMeter;
