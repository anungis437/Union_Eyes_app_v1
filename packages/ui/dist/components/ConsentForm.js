import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from './Button';
import { Card } from './Card';
export const ConsentForm = ({ consentType, version, content, onConsent, requireSignature = false }) => {
    const [agreed, setAgreed] = useState(false);
    const [signature, setSignature] = useState('');
    const [showContent, setShowContent] = useState(false);
    const handleSubmit = (consented) => {
        if (consented && requireSignature && !signature.trim()) {
            alert('Please provide your digital signature');
            return;
        }
        onConsent(consented, requireSignature ? signature : undefined);
    };
    const consentTitles = {
        GENERAL: 'General Terms and Conditions',
        DATA_COLLECTION: 'Data Collection Consent',
        RESEARCH_PARTICIPATION: 'Research Participation Consent',
        DATA_SHARING: 'Data Sharing Consent'
    };
    return (_jsxs(Card, { className: "max-w-2xl mx-auto", children: [_jsxs("div", { className: "text-center mb-6", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-2", children: consentTitles[consentType] || consentType }), _jsxs("p", { className: "text-gray-600", children: ["Version ", version] })] }), _jsxs("div", { className: "mb-6", children: [_jsxs("button", { onClick: () => setShowContent(!showContent), className: "text-blue-600 hover:text-blue-800 font-medium mb-4", children: [showContent ? 'Hide' : 'Show', " Full Terms"] }), showContent && (_jsx("div", { className: "bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto border", children: _jsx("div", { className: "prose prose-sm max-w-none", dangerouslySetInnerHTML: { __html: content } }) }))] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("label", { className: "flex items-start space-x-3", children: [_jsx("input", { type: "checkbox", checked: agreed, onChange: (e) => setAgreed(e.target.checked), className: "mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" }), _jsx("span", { className: "text-sm text-gray-700", children: "I have read and agree to the terms and conditions outlined above." })] }), requireSignature && agreed && (_jsxs("div", { children: [_jsx("label", { htmlFor: "signature", className: "block text-sm font-medium text-gray-700 mb-2", children: "Digital Signature (Type your full name)" }), _jsx("input", { id: "signature", type: "text", value: signature, onChange: (e) => setSignature(e.target.value), placeholder: "Enter your full name as digital signature", className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" })] })), _jsxs("div", { className: "flex space-x-4 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: () => handleSubmit(false), className: "flex-1", children: "Decline" }), _jsx(Button, { variant: "primary", onClick: () => handleSubmit(true), disabled: !agreed, className: "flex-1", children: "Accept & Continue" })] })] }), _jsx("div", { className: "mt-6 text-xs text-gray-500 text-center", children: "By clicking \"Accept & Continue\", you acknowledge that you understand and agree to be bound by these terms." })] }));
};
//# sourceMappingURL=ConsentForm.js.map