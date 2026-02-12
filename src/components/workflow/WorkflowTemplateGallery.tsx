import React, { useState, useEffect, useCallback } from 'react';
import {
  FileInput,
  CheckSquare,
  DollarSign,
  AlertTriangle,
  FileText,
  Plus,
  RefreshCw,
  Filter,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'claim-processing' | 'approval' | 'notification' | 'custom';
  icon: string;
  nodes: any[];
  edges: any[];
  estimatedDuration?: string;
  usageCount?: number;
}

interface WorkflowTemplateGalleryProps {
  organizationId: string;
  onCreateFromTemplate?: (templateId: string, customizations: any) => void;
  onPreview?: (template: WorkflowTemplate) => void;
  className?: string;
}

const categoryIcons = {
  'claim-processing': FileInput,
  approval: CheckSquare,
  notification: AlertTriangle,
  custom: FileText,
};

const categoryColors = {
  'claim-processing': 'bg-blue-500',
  approval: 'bg-green-500',
  notification: 'bg-yellow-500',
  custom: 'bg-purple-500',
};

const categoryLabels = {
  'claim-processing': 'Claim Processing',
  approval: 'Approval',
  notification: 'Notification',
  custom: 'Custom',
};

export function WorkflowTemplateGallery({
  organizationId,
  onCreateFromTemplate,
  onPreview,
  className = '',
}: WorkflowTemplateGalleryProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(
    null
  );
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [customizations, setCustomizations] = useState({
    name: '',
    description: '',
    variables: {} as Record<string, any>,
  });

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }

      const response = await fetch(
        `/api/workflow-templates?${params.toString()}`,
        {
          headers: {
            'X-Organization-ID': organizationId,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      setTemplates(data);
      setFilteredTemplates(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [organizationId, categoryFilter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Open customization dialog
  const openCustomizeDialog = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setCustomizations({
      name: template.name,
      description: template.description,
      variables: {},
    });
    setShowCustomizeDialog(true);
  };

  // Create workflow from template
  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch(
        `/api/workflow-templates/${selectedTemplate.id}/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Organization-ID': organizationId,
          },
          body: JSON.stringify(customizations),
        }
      );

      if (!response.ok) throw new Error('Failed to create workflow from template');

      const workflow = await response.json();

      if (onCreateFromTemplate) {
        onCreateFromTemplate(selectedTemplate.id, customizations);
      }

      setShowCustomizeDialog(false);
      setSelectedTemplate(null);
    } catch (error) {
    }
  };

  // Get template icon
  const getTemplateIcon = (template: WorkflowTemplate) => {
    switch (template.icon) {
      case 'FileInput':
        return FileInput;
      case 'CheckSquare':
        return CheckSquare;
      case 'DollarSign':
        return DollarSign;
      case 'AlertTriangle':
        return AlertTriangle;
      case 'FileText':
        return FileText;
      default:
        return FileText;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Templates</h2>
          <p className="text-gray-500">
            Choose a pre-built template to get started quickly
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="claim-processing">Claim Processing</SelectItem>
              <SelectItem value="approval">Approval</SelectItem>
              <SelectItem value="notification">Notification</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchTemplates} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No templates found for the selected category
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const Icon = getTemplateIcon(template);
            const categoryColor = categoryColors[template.category];
            const categoryLabel = categoryLabels[template.category];

            return (
              <Card
                key={template.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div
                      className={`${categoryColor} text-white rounded-lg p-3 flex items-center justify-center`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge variant="secondary">{categoryLabel}</Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                    {template.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <div>
                      <span className="font-semibold">{template.nodes.length}</span>{' '}
                      nodes
                    </div>
                    <div>
                      <span className="font-semibold">{template.edges.length}</span>{' '}
                      connections
                    </div>
                    {template.estimatedDuration && (
                      <div>≈ {template.estimatedDuration}</div>
                    )}
                  </div>

                  {template.usageCount !== undefined && (
                    <div className="text-xs text-gray-500 mb-4">
                      Used {template.usageCount} times
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onPreview?.(template)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => openCustomizeDialog(template)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Customization Dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Workflow</DialogTitle>
            <DialogDescription>
              Customize the workflow before creating it from the template
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Workflow Name</Label>
                <Input
                  value={customizations.name}
                  onChange={(e) =>
                    setCustomizations({ ...customizations, name: e.target.value })
                  }
                  placeholder="Enter workflow name"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={customizations.description}
                  onChange={(e) =>
                    setCustomizations({
                      ...customizations,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter workflow description"
                  rows={3}
                />
              </div>

              <div>
                <Label>Template Preview</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-4 mb-3">
                    {(() => {
                      const Icon = getTemplateIcon(selectedTemplate);
                      return (
                        <div
                          className={`${
                            categoryColors[selectedTemplate.category]
                          } text-white rounded-lg p-2 flex items-center justify-center`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                      );
                    })()}
                    <div>
                      <div className="font-semibold">{selectedTemplate.name}</div>
                      <div className="text-xs text-gray-500">
                        {selectedTemplate.nodes.length} nodes •{' '}
                        {selectedTemplate.edges.length} connections
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {selectedTemplate.description}
                  </p>
                </div>
              </div>

              <div>
                <Label>Variables (JSON)</Label>
                <Textarea
                  value={JSON.stringify(customizations.variables, null, 2)}
                  onChange={(e) => {
                    try {
                      const variables = JSON.parse(e.target.value);
                      setCustomizations({ ...customizations, variables });
                    } catch {}
                  }}
                  placeholder='{"key": "value"}'
                  rows={5}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Define variables that will be available in the workflow context
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCustomizeDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFromTemplate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
