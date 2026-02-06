/**
 * usePasswordValidation Hook
 * 
 * React hook for real-time password validation with debouncing
 */

import { useState, useEffect, useMemo } from 'react';
import {
  validatePassword,
  calculatePasswordStrength,
  PasswordPolicyConfig,
  PasswordValidationResult,
  PasswordStrength,
  DEFAULT_PASSWORD_POLICY,
} from '../utils/passwordPolicy';

interface UsePasswordValidationOptions {
  config?: PasswordPolicyConfig;
  userInfo?: { email?: string; name?: string; username?: string };
  debounceMs?: number;
  validateOnMount?: boolean;
}

interface UsePasswordValidationReturn {
  validation: PasswordValidationResult | null;
  strength: PasswordStrength | null;
  isValidating: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function usePasswordValidation(
  password: string,
  options: UsePasswordValidationOptions = {}
): UsePasswordValidationReturn {
  const {
    config = DEFAULT_PASSWORD_POLICY,
    userInfo,
    debounceMs = 300,
    validateOnMount = false,
  } = options;

  const [validation, setValidation] = useState<PasswordValidationResult | null>(null);
  const [strength, setStrength] = useState<PasswordStrength | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    // Don't validate empty password unless validateOnMount is true
    if (!password && !validateOnMount) {
      setValidation(null);
      setStrength(null);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);

    // Debounce validation
    const timeoutId = setTimeout(() => {
      const result = validatePassword(password, config, userInfo);
      const strengthResult = calculatePasswordStrength(password, config, userInfo);

      setValidation(result);
      setStrength(strengthResult);
      setIsValidating(false);
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [password, config, userInfo, debounceMs, validateOnMount]);

  const isValid = useMemo(() => validation?.valid ?? false, [validation]);
  const errors = useMemo(() => validation?.errors ?? [], [validation]);
  const warnings = useMemo(() => validation?.warnings ?? [], [validation]);

  return {
    validation,
    strength,
    isValidating,
    isValid,
    errors,
    warnings,
  };
}
