import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const Card = ({ children, className = '', padding = 'md', shadow = 'md', hover = false }) => {
    const paddingClasses = {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
    };
    const shadowClasses = {
        sm: 'shadow-sm',
        md: 'shadow-md',
        lg: 'shadow-lg',
        xl: 'shadow-xl'
    };
    const classes = [
        'bg-white rounded-lg border border-gray-200',
        paddingClasses[padding],
        shadowClasses[shadow],
        hover ? 'hover:shadow-lg transition-shadow duration-200' : '',
        className
    ].filter(Boolean).join(' ');
    return (_jsx("div", { className: classes, children: children }));
};
export const CardHeader = ({ children, className = '' }) => {
    return (_jsx("div", { className: `pb-4 border-b border-gray-200 ${className}`, children: children }));
};
export const CardTitle = ({ children, className = '' }) => {
    return (_jsx("h3", { className: `text-lg font-semibold text-gray-900 ${className}`, children: children }));
};
export const CardContent = ({ children, className = '' }) => {
    return (_jsx("div", { className: `pt-4 ${className}`, children: children }));
};
export const GameCard = ({ title, description, image, difficulty, estimatedTime, onPlay, isLocked = false, progress }) => {
    const difficultyColors = {
        easy: 'bg-green-100 text-green-800',
        medium: 'bg-yellow-100 text-yellow-800',
        hard: 'bg-red-100 text-red-800',
        adaptive: 'bg-blue-100 text-blue-800'
    };
    return (_jsxs(Card, { hover: true, className: "max-w-sm", children: [_jsxs("div", { className: "relative", children: [image ? (_jsx("img", { src: image, alt: title, className: "w-full h-32 object-cover rounded-t-lg" })) : (_jsx("div", { className: "w-full h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-t-lg flex items-center justify-center", children: _jsx("span", { className: "text-white text-4xl", children: "\u001F9e0" }) })), isLocked && (_jsx("div", { className: "absolute inset-0 bg-black bg-opacity-50 rounded-t-lg flex items-center justify-center", children: _jsx("span", { className: "text-white text-2xl", children: "\u001F512" }) }))] }), _jsxs("div", { className: "p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: title }), _jsx("p", { className: "text-gray-600 text-sm mb-4", children: description }), _jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${difficultyColors[difficulty] ||
                                    difficultyColors.medium}`, children: difficulty }), _jsxs("span", { className: "text-sm text-gray-500", children: ["~", estimatedTime, " min"] })] }), progress !== undefined && (_jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex justify-between text-sm text-gray-600 mb-1", children: [_jsx("span", { children: "Progress" }), _jsxs("span", { children: [Math.round(progress), "%"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full transition-all duration-300", style: { width: `${progress}%` } }) })] })), _jsx("button", { onClick: onPlay, disabled: isLocked, className: `w-full py-2 px-4 rounded-md font-medium transition-colors duration-200 ${isLocked
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'}`, children: isLocked ? 'Locked' : 'Play Game' })] })] }));
};
//# sourceMappingURL=Card.js.map