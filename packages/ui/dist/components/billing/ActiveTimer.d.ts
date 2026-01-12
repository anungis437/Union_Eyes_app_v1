/**
 * @fileoverview ActiveTimer - Real-time timer component with world-class UX
 */
interface ActiveTimerProps {
    timer?: {
        id: string;
        description: string;
        startTime: Date;
        duration: number;
        billableRate: number;
        matterCode: string;
        clientName: string;
        isRunning: boolean;
    };
    onStart: (data: {
        description: string;
        matterCode: string;
        billableRate: number;
    }) => Promise<void>;
    onPause: (timerId: string) => Promise<void>;
    onResume: (timerId: string) => Promise<void>;
    onStop: (timerId: string) => Promise<void>;
    className?: string;
}
export declare function ActiveTimer({ timer, onStart, onPause, onResume, onStop, className }: ActiveTimerProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ActiveTimer.d.ts.map