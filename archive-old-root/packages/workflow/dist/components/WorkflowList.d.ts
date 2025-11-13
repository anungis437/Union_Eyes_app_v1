/**
 * WorkflowList - Display and manage workflows
 *
 * Lists workflows with filtering, sorting, and bulk operations.
 */
import type { WorkflowDefinition } from '../services/WorkflowEngine';
export interface WorkflowListProps {
    organizationId: string;
    onWorkflowClick?: (workflow: WorkflowDefinition) => void;
    onWorkflowEdit?: (workflow: WorkflowDefinition) => void;
    onWorkflowDelete?: (workflowId: string) => void;
    onWorkflowCreate?: () => void;
    className?: string;
}
export declare function WorkflowList({ organizationId, onWorkflowClick, onWorkflowEdit, onWorkflowDelete, onWorkflowCreate, className, }: WorkflowListProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=WorkflowList.d.ts.map