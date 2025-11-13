/**
 * TriggerConfig - Workflow trigger configuration component
 *
 * Provides UI for configuring different trigger types with their specific options.
 */
import type { WorkflowTrigger } from '../services/WorkflowEngine';
export interface TriggerConfigProps {
    trigger: WorkflowTrigger;
    onChange: (trigger: WorkflowTrigger) => void;
    className?: string;
}
export declare function TriggerConfig({ trigger, onChange, className }: TriggerConfigProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=TriggerConfig.d.ts.map