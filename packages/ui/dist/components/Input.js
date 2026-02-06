import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const Input = ({ label, error, helpText, leftIcon, rightIcon, className = '', id, ...props }) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const inputClasses = [
        'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm transition-colors duration-200',
        error
            ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
        leftIcon ? 'pl-10' : '',
        rightIcon ? 'pr-10' : '',
        className
    ].filter(Boolean).join(' ');
    return (_jsxs("div", { children: [label && (_jsx("label", { htmlFor: inputId, className: "block text-sm font-medium text-gray-700 mb-1", children: label })), _jsxs("div", { className: "relative", children: [leftIcon && (_jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: _jsx("div", { className: "h-5 w-5 text-gray-400", children: leftIcon }) })), _jsx("input", { id: inputId, className: inputClasses, ...props }), rightIcon && (_jsx("div", { className: "absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none", children: _jsx("div", { className: "h-5 w-5 text-gray-400", children: rightIcon }) }))] }), error && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: error })), helpText && !error && (_jsx("p", { className: "mt-1 text-sm text-gray-500", children: helpText }))] }));
};
//# sourceMappingURL=Input.js.map