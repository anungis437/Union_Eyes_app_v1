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
import React from 'react';
import { PasswordPolicyConfig } from '../utils/passwordPolicy';
interface PasswordStrengthMeterProps {
    password: string;
    config?: PasswordPolicyConfig;
    userInfo?: {
        email?: string;
        name?: string;
        username?: string;
    };
    showRequirements?: boolean;
    showFeedback?: boolean;
    showPolicyDescription?: boolean;
    className?: string;
    compactMode?: boolean;
}
export declare const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps>;
export default PasswordStrengthMeter;
//# sourceMappingURL=PasswordStrengthMeter.d.ts.map