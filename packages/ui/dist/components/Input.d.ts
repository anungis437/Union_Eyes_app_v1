import React from 'react';
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helpText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}
export declare const Input: React.FC<InputProps>;
//# sourceMappingURL=Input.d.ts.map