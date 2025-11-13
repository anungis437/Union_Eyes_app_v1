/**
 * @fileoverview Billing Components - Export all billing-related components
 */

// Time Tracking Components
export { SimpleActiveTimer } from './SimpleActiveTimer';
export { SimpleTimeEntryForm } from './SimpleTimeEntryForm';
export { TimerDashboard } from './TimerDashboard';

// Complex components (with external dependencies)
export { ActiveTimer } from './ActiveTimer';
// export { TimeEntryForm } from './TimeEntryForm'; // Temporarily disabled due to missing dependencies

// Invoice Management Components
export { default as InvoiceForm } from './InvoiceForm';

// Trust Account Components
export { default as TrustAccountDashboard } from './TrustAccountDashboard';

// Billing Reports Components
export { default as BillingReports } from './BillingReports';

// Types
export interface TimerData {
  id: string;
  description: string;
  startTime: Date;
  duration: number;
  billableRate: number;
  matterCode: string;
  clientName: string;
  isRunning: boolean;
}

export interface TimeEntryData {
  id: string;
  description: string;
  duration: number;
  date: Date;
  matterCode: string;
  clientName: string;
  billableRate: number;
  billableAmount: number;
  isBillable: boolean;
  notes?: string;
}

export interface MatterData {
  code: string;
  description: string;
  clientName: string;
  clientId: string;
}

export interface TimerCallbacks {
  onStartTimer: (data: { description: string; matterCode: string; billableRate: number }) => Promise<void>;
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
