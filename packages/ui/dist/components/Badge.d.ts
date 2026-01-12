import React from 'react';
export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}
export declare const Badge: React.FC<BadgeProps>;
//# sourceMappingURL=Badge.d.ts.map