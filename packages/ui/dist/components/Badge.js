import { jsx as _jsx } from "react/jsx-runtime";
export const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
    const variantClasses = {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-blue-100 text-blue-800',
        secondary: 'bg-gray-100 text-gray-600',
        success: 'bg-green-100 text-green-800',
        danger: 'bg-red-100 text-red-800',
        warning: 'bg-yellow-100 text-yellow-800',
        outline: 'border border-gray-300 text-gray-700 bg-transparent'
    };
    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-base'
    };
    const classes = [
        'inline-flex items-center font-medium rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className
    ].filter(Boolean).join(' ');
    return (_jsx("span", { className: classes, children: children }));
};
//# sourceMappingURL=Badge.js.map