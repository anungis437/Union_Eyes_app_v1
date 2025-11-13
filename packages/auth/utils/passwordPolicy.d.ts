/**
 * Password Policy Enforcement
 *
 * World-class password validation and policy enforcement with:
 * - Configurable complexity requirements
 * - Password strength scoring (0-100)
 * - Password history tracking
 * - Common password detection
 * - Breach detection ready
 * - Internationalization support
 */
export interface PasswordPolicyConfig {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    minUppercase?: number;
    minLowercase?: number;
    minNumbers?: number;
    minSpecialChars?: number;
    preventCommonPasswords: boolean;
    preventUserInfo: boolean;
    maxConsecutiveChars?: number;
    maxRepeatingChars?: number;
    historyCount?: number;
    expirationDays?: number;
    minStrengthScore?: number;
}
export interface PasswordStrength {
    score: number;
    level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
    feedback: string[];
    passed: boolean;
    requirements: {
        length: boolean;
        uppercase: boolean;
        lowercase: boolean;
        numbers: boolean;
        specialChars: boolean;
        notCommon: boolean;
        notUserInfo: boolean;
        notConsecutive: boolean;
        notRepeating: boolean;
    };
}
export interface PasswordValidationResult {
    valid: boolean;
    strength: PasswordStrength;
    errors: string[];
    warnings: string[];
}
export declare const DEFAULT_PASSWORD_POLICY: PasswordPolicyConfig;
export declare const PASSWORD_POLICY_PRESETS: {
    basic: PasswordPolicyConfig;
    standard: PasswordPolicyConfig;
    high_security: PasswordPolicyConfig;
    compliance_hipaa: PasswordPolicyConfig;
    compliance_pci_dss: PasswordPolicyConfig;
};
/**
 * Calculate password strength score (0-100)
 * Uses multiple factors: length, character variety, patterns, entropy
 */
export declare function calculatePasswordStrength(password: string, config?: PasswordPolicyConfig, userInfo?: {
    email?: string;
    name?: string;
    username?: string;
}): PasswordStrength;
/**
 * Validate password against policy
 */
export declare function validatePassword(password: string, config?: PasswordPolicyConfig, userInfo?: {
    email?: string;
    name?: string;
    username?: string;
}): PasswordValidationResult;
/**
 * Check if password has been used before (requires Supabase)
 */
export declare function checkPasswordHistory(userId: string, newPassword: string, supabaseUrl: string, supabaseKey: string, historyCount?: number): Promise<boolean>;
export declare function generatePolicyDescription(config: PasswordPolicyConfig): string[];
//# sourceMappingURL=passwordPolicy.d.ts.map