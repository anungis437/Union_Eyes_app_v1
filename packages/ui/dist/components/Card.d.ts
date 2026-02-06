import React from 'react';
export interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'sm' | 'md' | 'lg';
    shadow?: 'sm' | 'md' | 'lg' | 'xl';
    hover?: boolean;
}
export declare const Card: React.FC<CardProps>;
export interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
}
export declare const CardHeader: React.FC<CardHeaderProps>;
export interface CardTitleProps {
    children: React.ReactNode;
    className?: string;
}
export declare const CardTitle: React.FC<CardTitleProps>;
export interface CardContentProps {
    children: React.ReactNode;
    className?: string;
}
export declare const CardContent: React.FC<CardContentProps>;
export interface GameCardProps {
    title: string;
    description: string;
    image?: string;
    difficulty: string;
    estimatedTime: number;
    onPlay: () => void;
    isLocked?: boolean;
    progress?: number;
}
export declare const GameCard: React.FC<GameCardProps>;
//# sourceMappingURL=Card.d.ts.map