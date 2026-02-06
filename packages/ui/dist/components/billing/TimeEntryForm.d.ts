/**
 * @fileoverview TimeEntryForm - World-class time entry form with smart input parsing
 */
import { z } from 'zod';
declare const timeEntrySchema: z.ZodObject<{
    description: z.ZodString;
    timeInput: z.ZodString;
    date: z.ZodString;
    matterCode: z.ZodString;
    clientId: z.ZodString;
    billableRate: z.ZodString;
    isBillable: z.ZodDefault<z.ZodBoolean>;
    taskCategory: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type TimeEntryFormData = z.infer<typeof timeEntrySchema>;
interface TimeEntryFormProps {
    onSubmit: (data: {
        description: string;
        minutes: number;
        date: Date;
        matterCode: string;
        clientId: string;
        billableRate: number;
        isBillable: boolean;
        taskCategory?: string;
        notes?: string;
    }) => Promise<void>;
    defaultValues?: Partial<TimeEntryFormData>;
    matters?: Array<{
        code: string;
        description: string;
        clientName: string;
        clientId: string;
    }>;
    taskCategories?: Array<{
        value: string;
        label: string;
    }>;
    className?: string;
}
export declare function TimeEntryForm({ onSubmit, defaultValues, matters, taskCategories, className }: TimeEntryFormProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TimeEntryForm.d.ts.map