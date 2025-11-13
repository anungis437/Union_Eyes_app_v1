/**
 * ActionConfig - Workflow action configuration component
 *
 * Provides UI for configuring actions with template selection and schema-based config.
 */
import type { WorkflowAction } from '../services/WorkflowEngine';
export interface ActionConfigProps {
    action: WorkflowAction;
    onChange: (action: WorkflowAction) => void;
    workflowActions?: WorkflowAction[];
    className?: string;
}
export declare function ActionConfig({ action, onChange, workflowActions, className }: ActionConfigProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ActionConfig.d.ts.map