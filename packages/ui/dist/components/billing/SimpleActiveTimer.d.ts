/**
 * @fileoverview SimpleActiveTimer - Streamlined timer component
 */
interface TimerData {
    id: string;
    description: string;
    startTime: Date;
    duration: number;
    billableRate: number;
    matterCode: string;
    clientName: string;
    isRunning: boolean;
}
interface SimpleActiveTimerProps {
    timer?: TimerData;
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
export declare function SimpleActiveTimer({ timer, onStart, onPause, onResume, onStop, className }: SimpleActiveTimerProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SimpleActiveTimer.d.ts.map