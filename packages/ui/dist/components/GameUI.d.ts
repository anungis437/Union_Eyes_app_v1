import React from 'react';
export interface ProgressBarProps {
    progress: number;
    label?: string;
    showPercentage?: boolean;
    size?: 'sm' | 'md' | 'lg';
    color?: 'blue' | 'green' | 'yellow' | 'red';
    animated?: boolean;
}
export declare const ProgressBar: React.FC<ProgressBarProps>;
export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'blue' | 'gray' | 'white';
    className?: string;
}
export declare const LoadingSpinner: React.FC<LoadingSpinnerProps>;
export interface ScoreDisplayProps {
    score: number;
    maxScore?: number;
    label?: string;
    showProgress?: boolean;
    size?: 'sm' | 'md' | 'lg';
}
export declare const ScoreDisplay: React.FC<ScoreDisplayProps>;
export interface TimerDisplayProps {
    timeRemaining: number;
    format?: 'mm:ss' | 'hh:mm:ss' | 'seconds';
    warning?: number;
    critical?: number;
}
export declare const TimerDisplay: React.FC<TimerDisplayProps>;
//# sourceMappingURL=GameUI.d.ts.map