/**
 * Workflow Engine UI Components
 * 
 * This module provides a complete set of UI components for building,
 * monitoring, and managing workflow automation systems.
 * 
 * @module components/workflow
 */

export { WorkflowBuilder } from './WorkflowBuilder';
export { WorkflowMonitor } from './WorkflowMonitor';
export { WorkflowInstanceDetail } from './WorkflowInstanceDetail';
export { ApprovalQueue } from './ApprovalQueue';
export { WorkflowTemplateGallery } from './WorkflowTemplateGallery';
export { WorkflowAnalytics } from './WorkflowAnalytics';

/**
 * Usage Examples:
 * 
 * 1. Workflow Builder:
 * ```tsx
 * import { WorkflowBuilder } from '@/components/workflow';
 * 
 * <WorkflowBuilder
 *   tenantId="tenant-123"
 *   onSave={(workflow) => console.log('Saved:', workflow)}
 *   onTest={(workflow) => console.log('Testing:', workflow)}
 * />
 * ```
 * 
 * 2. Workflow Monitor:
 * ```tsx
 * import { WorkflowMonitor } from '@/components/workflow';
 * 
 * <WorkflowMonitor
 *   tenantId="tenant-123"
 *   onViewDetails={(instanceId) => navigate(`/workflows/instances/${instanceId}`)}
 * />
 * ```
 * 
 * 3. Workflow Instance Detail:
 * ```tsx
 * import { WorkflowInstanceDetail } from '@/components/workflow';
 * 
 * <WorkflowInstanceDetail
 *   instanceId="instance-456"
 *   tenantId="tenant-123"
 *   onBack={() => navigate('/workflows')}
 * />
 * ```
 * 
 * 4. Approval Queue:
 * ```tsx
 * import { ApprovalQueue } from '@/components/workflow';
 * 
 * <ApprovalQueue
 *   tenantId="tenant-123"
 *   userId="user-789"
 *   onApprovalProcessed={(id, approved) => console.log('Processed:', id, approved)}
 * />
 * ```
 * 
 * 5. Workflow Template Gallery:
 * ```tsx
 * import { WorkflowTemplateGallery } from '@/components/workflow';
 * 
 * <WorkflowTemplateGallery
 *   tenantId="tenant-123"
 *   onCreateFromTemplate={(templateId, customizations) => {
 *     console.log('Creating from template:', templateId);
 *   }}
 *   onPreview={(template) => console.log('Preview:', template)}
 * />
 * ```
 * 
 * 6. Workflow Analytics:
 * ```tsx
 * import { WorkflowAnalytics } from '@/components/workflow';
 * 
 * <WorkflowAnalytics
 *   tenantId="tenant-123"
 *   workflowId="workflow-123" // Optional - shows overview if omitted
 * />
 * ```
 */
