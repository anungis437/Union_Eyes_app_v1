import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * @fileoverview Login Page Component
 *
 * Reusable login page component for CourtLens applications.
 * Provides email/password authentication with SSO support.
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../unified-auth';
// =========================================================================
// LOGIN PAGE COMPONENT
// =========================================================================
/**
 * LoginPage Component
 *
 * Full-featured login page with email/password authentication.
 * Automatically redirects after successful login.
 *
 * @example
 * <Route path="/login" element={
 *   <LoginPage
 *     appName="CourtLens Admin"
 *     redirectTo="/dashboard"
 *     showSignUpLink={true}
 *   />
 * } />
 */
export const LoginPage = ({ appName = 'CourtLens', logo, redirectTo = '/', showRememberMe = true, showSignUpLink = false, onSignUpClick, className = '', }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    // Get the page user was trying to access (if redirected from ProtectedRoute)
    const from = location.state?.from?.pathname || redirectTo;
    /**
     * Handle form submission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const { error } = await signIn(email, password);
            if (error) {
                setError(error.message || 'Failed to sign in. Please check your credentials.');
                setLoading(false);
                return;
            }
            // Success - redirect to intended page
            navigate(from, { replace: true });
        }
        catch (err) {
            setError('An unexpected error occurred. Please try again.');
            setLoading(false);
        }
    };
    return (_jsx("div", { className: `min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 ${className}`, children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsxs("div", { className: "text-center", children: [logo || (_jsx("div", { className: "mx-auto h-12 w-12 bg-indigo-600 rounded-lg flex items-center justify-center", children: _jsx("svg", { className: "h-8 w-8 text-white", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" }) }) })), _jsxs("h2", { className: "mt-6 text-3xl font-extrabold text-gray-900", children: ["Sign in to ", appName] }), _jsx("p", { className: "mt-2 text-sm text-gray-600", children: "Welcome back! Please enter your credentials." })] }), _jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit, children: [error && (_jsx("div", { className: "rounded-md bg-red-50 p-4", children: _jsxs("div", { className: "flex", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("svg", { className: "h-5 w-5 text-red-400", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }) }) }), _jsx("div", { className: "ml-3", children: _jsx("p", { className: "text-sm font-medium text-red-800", children: error }) })] }) })), _jsxs("div", { className: "rounded-md shadow-sm -space-y-px", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email-address", className: "sr-only", children: "Email address" }), _jsx("input", { id: "email-address", name: "email", type: "email", autoComplete: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm", placeholder: "Email address", disabled: loading })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "sr-only", children: "Password" }), _jsx("input", { id: "password", name: "password", type: "password", autoComplete: "current-password", required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm", placeholder: "Password", disabled: loading })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [showRememberMe && (_jsxs("div", { className: "flex items-center", children: [_jsx("input", { id: "remember-me", name: "remember-me", type: "checkbox", checked: rememberMe, onChange: (e) => setRememberMe(e.target.checked), className: "h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded", disabled: loading }), _jsx("label", { htmlFor: "remember-me", className: "ml-2 block text-sm text-gray-900", children: "Remember me" })] })), _jsx("div", { className: "text-sm", children: _jsx("a", { href: "/forgot-password", className: "font-medium text-indigo-600 hover:text-indigo-500", children: "Forgot your password?" }) })] }), _jsx("div", { children: _jsx("button", { type: "submit", disabled: loading, className: "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed", children: loading ? (_jsxs(_Fragment, { children: [_jsxs("svg", { className: "animate-spin -ml-1 mr-3 h-5 w-5 text-white", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "Signing in..."] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "absolute left-0 inset-y-0 flex items-center pl-3", children: _jsx("svg", { className: "h-5 w-5 text-indigo-500 group-hover:text-indigo-400", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z", clipRule: "evenodd" }) }) }), "Sign in"] })) }) }), showSignUpLink && (_jsx("div", { className: "text-center", children: _jsxs("p", { className: "text-sm text-gray-600", children: ["Don't have an account?", ' ', _jsx("button", { type: "button", onClick: onSignUpClick || (() => navigate('/signup')), className: "font-medium text-indigo-600 hover:text-indigo-500", children: "Sign up" })] }) }))] }), _jsxs("div", { className: "mt-6", children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 flex items-center", children: _jsx("div", { className: "w-full border-t border-gray-300" }) }), _jsx("div", { className: "relative flex justify-center text-sm", children: _jsx("span", { className: "px-2 bg-gray-50 text-gray-500", children: "\uD83D\uDD10 Single Sign-On Enabled" }) })] }), _jsx("p", { className: "mt-2 text-center text-xs text-gray-500", children: "Your session will be synchronized across all CourtLens applications." })] })] }) }));
};
// =========================================================================
// EXPORTS
// =========================================================================
export default LoginPage;
//# sourceMappingURL=LoginPage.js.map