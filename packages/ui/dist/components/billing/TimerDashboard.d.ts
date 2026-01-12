/**
 * @fileoverview TimerDashboard - Complete time tracking dashboard
 */
interface TimeEntry {
    id: string;
    description: string;
    duration: number;
    date: Date;
    matterCode: string;
    clientName: string;
    billableRate: number;
    billableAmount: number;
    isBillable: boolean;
}
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
interface Matter {
    code: string;
    description: string;
    clientName: string;
}
interface TimerDashboardProps {
    activeTimer?: TimerData;
    recentEntries?: TimeEntry[];
    matters?: Matter[];
    onStartTimer: (data: {
        description: string;
        matterCode: string;
        billableRate: number;
    }) => Promise<void>;
    onPauseTimer: (timerId: string) => Promise<void>;
    onResumeTimer: (timerId: string) => Promise<void>;
    onStopTimer: (timerId: string) => Promise<void>;
    onAddTimeEntry: (data: {
        description: string;
        minutes: number;
        date: Date;
        matterCode: string;
        billableRate: number;
        isBillable: boolean;
        notes?: string;
    }) => Promise<void>;
}
export declare function TimerDashboard({ activeTimer, recentEntries, matters, onStartTimer, onPauseTimer, onResumeTimer, onStopTimer, onAddTimeEntry }: TimerDashboardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TimerDashboard.d.ts.map