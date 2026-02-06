/**
 * @fileoverview SimpleTimeEntryForm - Streamlined time entry form with smart parsing
 */
interface TimeEntryData {
    description: string;
    minutes: number;
    date: Date;
    matterCode: string;
    billableRate: number;
    isBillable: boolean;
    notes?: string;
}
interface SimpleTimeEntryFormProps {
    onSubmit: (data: TimeEntryData) => Promise<void>;
    matters?: Array<{
        code: string;
        description: string;
        clientName: string;
    }>;
    defaultRate?: number;
    className?: string;
}
export declare function SimpleTimeEntryForm({ onSubmit, matters, defaultRate, className }: SimpleTimeEntryFormProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SimpleTimeEntryForm.d.ts.map