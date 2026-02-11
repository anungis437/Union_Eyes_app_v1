import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AcceptInvitationPage Component
 *
 * Public page for accepting user invitations
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InvitationService } from '../services/invitationService';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { usePasswordValidation } from '../hooks/usePasswordValidation';
export function AcceptInvitationPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [invitationStatus, setInvitationStatus] = useState(null);
    const [isCheckingToken, setIsCheckingToken] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // Password validation
    const { isValid: isPasswordValid } = usePasswordValidation(password, {
        validateOnMount: false,
    });
    // Initialize service
    const service = new InvitationService((typeof window !== 'undefined' && window.import?.meta?.env?.VITE_SUPABASE_URL) ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'http://localhost:54321', (typeof window !== 'undefined' && window.import?.meta?.env?.VITE_SUPABASE_ANON_KEY) ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        '', typeof window !== 'undefined' ? window.location.origin : '');
    // Check token validity on mount
    useEffect(() => {
        const checkToken = async () => {
            if (!token) {
                setError('Invalid invitation link. No token provided.');
                setIsCheckingToken(false);
                return;
            }
            try {
                const status = await service.checkInvitationStatus(token);
                setInvitationStatus(status);
                if (!status.valid) {
                    setError(status.error || 'This invitation is no longer valid.');
                }
            }
            catch (err) {
                setError('Failed to validate invitation. Please try again later.');
}
            finally {
                setIsCheckingToken(false);
            }
        };
        checkToken();
    }, [token]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        // Validate form
        if (!firstName.trim() || !lastName.trim()) {
            setError('Please enter your first and last name.');
            return;
        }
        if (!isPasswordValid) {
            setError('Password does not meet security requirements.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!token) {
            setError('Invalid invitation token.');
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await service.acceptInvitation({
                token,
                password,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
            });
            if (result.success) {
                setSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
            else {
                setError(result.error || 'Failed to accept invitation. Please try again.');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
}
        finally {
            setIsSubmitting(false);
        }
    };
    // Loading state
    if (isCheckingToken) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" }), _jsx("p", { className: "mt-4 text-gray-600 dark:text-gray-400", children: "Validating invitation..." })] }) }));
    }
    // Invalid token state
    if (!invitationStatus?.valid) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4", children: _jsx("div", { className: "max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30", children: _jsx("span", { className: "text-2xl", children: "\u274C" }) }), _jsx("h2", { className: "mt-4 text-2xl font-bold text-gray-900 dark:text-white", children: "Invalid Invitation" }), _jsx("p", { className: "mt-2 text-gray-600 dark:text-gray-400", children: error || 'This invitation link is no longer valid.' }), _jsx("button", { onClick: () => navigate('/login'), className: "mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: "Go to Login" })] }) }) }));
    }
    // Success state
    if (success) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4", children: _jsx("div", { className: "max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30", children: _jsx("span", { className: "text-2xl", children: "\u2705" }) }), _jsx("h2", { className: "mt-4 text-2xl font-bold text-gray-900 dark:text-white", children: "Account Created!" }), _jsx("p", { className: "mt-2 text-gray-600 dark:text-gray-400", children: "Your account has been successfully created. Redirecting to login..." }), _jsx("div", { className: "mt-6", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" }) })] }) }) }));
    }
    // Accept invitation form
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4", children: _jsxs("div", { className: "max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8", children: [_jsxs("div", { className: "text-center mb-6", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: "Accept Invitation" }), _jsx("p", { className: "mt-2 text-gray-600 dark:text-gray-400", children: "You've been invited to join an organization" }), invitationStatus.invitation && (_jsxs("div", { className: "mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg", children: [_jsxs("p", { className: "text-sm text-blue-800 dark:text-blue-200", children: [_jsx("span", { className: "font-semibold", children: "Email:" }), " ", invitationStatus.invitation.email] }), _jsxs("p", { className: "text-sm text-blue-800 dark:text-blue-200", children: [_jsx("span", { className: "font-semibold", children: "Role:" }), " ", invitationStatus.invitation.role] })] }))] }), error && (_jsx("div", { className: "mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg", children: _jsx("p", { className: "text-sm text-red-800 dark:text-red-200", children: error }) })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "firstName", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "First Name *" }), _jsx("input", { id: "firstName", type: "text", value: firstName, onChange: (e) => setFirstName(e.target.value), required: true, disabled: isSubmitting, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "lastName", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Last Name *" }), _jsx("input", { id: "lastName", type: "text", value: lastName, onChange: (e) => setLastName(e.target.value), required: true, disabled: isSubmitting, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed" })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Password *" }), _jsx("input", { id: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, disabled: isSubmitting, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed" }), password && (_jsx("div", { className: "mt-2", children: _jsx(PasswordStrengthMeter, { password: password }) }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "confirmPassword", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Confirm Password *" }), _jsx("input", { id: "confirmPassword", type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), required: true, disabled: isSubmitting, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed" })] }), _jsx("button", { type: "submit", disabled: isSubmitting || !isPasswordValid || password !== confirmPassword, className: "w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: isSubmitting ? 'Creating Account...' : 'Accept & Create Account' })] }), _jsx("div", { className: "mt-6 text-center text-sm text-gray-500 dark:text-gray-400", children: invitationStatus.invitation && (_jsxs("p", { children: ["Invitation expires: ", new Date(invitationStatus.invitation.expiresAt).toLocaleDateString()] })) })] }) }));
}
//# sourceMappingURL=AcceptInvitationPage.js.map