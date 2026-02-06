/**
 * usePasswordValidation Hook
 *
 * React hook for real-time password validation with debouncing
 */
import { PasswordPolicyConfig, PasswordValidationResult, PasswordStrength } from '../utils/passwordPolicy';
interface UsePasswordValidationOptions {
    config?: PasswordPolicyConfig;
    userInfo?: {
        email?: string;
        name?: string;
        username?: string;
    };
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
export declare function usePasswordValidation(password: string, options?: UsePasswordValidationOptions): UsePasswordValidationReturn;
export {};
//# sourceMappingURL=usePasswordValidation.d.ts.map