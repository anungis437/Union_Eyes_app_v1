import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Play,
  Save,
  Plus,
  Trash2,
  Settings,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  description?: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

interface WorkflowDefinition {
  id?: string;
  name: string;
  description: string;
  category: 'claim-processing' | 'approval' | 'notification' | 'custom';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, any>;
  isActive: boolean;
}

interface WorkflowBuilderProps {
  organizationId: string;
  existingWorkflow?: WorkflowDefinition;
  onSave?: (workflow: WorkflowDefinition) => void;
  onTest?: (workflow: WorkflowDefinition) => void;
  className?: string;
}

const nodeTypes = [
  { type: 'start', label: 'Start', color: 'bg-green-500' },
  { type: 'end', label: 'End', color: 'bg-red-500' },
  { type: 'task', label: 'Task', color: 'bg-blue-500' },
  { type: 'decision', label: 'Decision', color: 'bg-yellow-500' },
  { type: 'approval', label: 'Approval', color: 'bg-purple-500' },
  { type: 'notification', label: 'Notification', color: 'bg-indigo-500' },
  { type: 'ai-prediction', label: 'AI Prediction', color: 'bg-pink-500' },
  { type: 'delay', label: 'Delay', color: 'bg-gray-500' },
  { type: 'api-call', label: 'API Call', color: 'bg-teal-500' },
  { type: 'parallel', label: 'Parallel', color: 'bg-orange-500' },
];

export function WorkflowBuilder({
  organizationId,
  existingWorkflow,
  onSave,
  onTest,
  className = '',
}: WorkflowBuilderProps) {
  const [workflow, setWorkflow] = useState<WorkflowDefinition>(
    existingWorkflow || {
      name: '',
      description: '',
      category: 'custom',
      nodes: [],
      edges: [],
      variables: {},
      isActive: true,
    }
  );

  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<WorkflowEdge | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Add node to canvas
  const addNode = useCallback((type: string, position: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
      config: {},
      position,
    };

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

    setSelectedNode(newNode);
  }, []);

  // Handle drag start from palette
  const handleDragStart = (type: string) => {
    setDraggedNodeType(type);
    setIsDragging(true);
  };

  // Handle drop on canvas
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNodeType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    addNode(draggedNodeType, { x, y });

    setIsDragging(false);
    setDraggedNodeType(null);
  };

  // Update node
  const updateNode = (nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
    }));

    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // Delete node
  const deleteNode = (nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    }));

    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  // Start connection
  const startConnection = (nodeId: string) => {
    setConnectionMode(true);
    setConnectionStart(nodeId);
  };

  // Complete connection
  const completeConnection = (targetId: string) => {
    if (!connectionStart || connectionStart === targetId) {
      setConnectionMode(false);
      setConnectionStart(null);
      return;
    }

    const newEdge: WorkflowEdge = {
      id: `edge-${Date.now()}`,
      source: connectionStart,
      target: targetId,
    };

    setWorkflow(prev => ({
      ...prev,
      edges: [...prev.edges, newEdge],
    }));

    setConnectionMode(false);
    setConnectionStart(null);
  };

  // Delete edge
  const deleteEdge = (edgeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      edges: prev.edges.filter(e => e.id !== edgeId),
    }));

    if (selectedEdge?.id === edgeId) {
      setSelectedEdge(null);
    }
  };

  // Validate workflow
  const validateWorkflow = (): boolean => {
    const errors: string[] = [];

    if (!workflow.name) errors.push('Workflow name is required');
    if (workflow.nodes.length === 0) errors.push('At least one node is required');

    const hasStart = workflow.nodes.some(n => n.type === 'start');
    const hasEnd = workflow.nodes.some(n => n.type === 'end');

    if (!hasStart) errors.push('Workflow must have a Start node');
    if (!hasEnd) errors.push('Workflow must have an End node');

    // Check for orphaned nodes
    const connectedNodes = new Set<string>();
    workflow.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    workflow.nodes.forEach(node => {
      if (node.type !== 'start' && node.type !== 'end' && !connectedNodes.has(node.id)) {
        errors.push(`Node "${node.name}" is not connected`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Save workflow
  const handleSave = async () => {
    if (!validateWorkflow()) {
      return;
    }

    try {
      const response = await fetch('/api/workflows', {
        method: workflow.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-ID': organizationId,
        },
        body: JSON.stringify(workflow),
      });

      if (!response.ok) throw new Error('Failed to save workflow');

      const saved = await response.json();
      setWorkflow(saved);

      if (onSave) {
        onSave(saved);
      }
    } catch (error) {
    }
  };

  // Test workflow
  const handleTest = () => {
    if (!validateWorkflow()) {
      return;
    }

    if (onTest) {
      onTest(workflow);
    }
  };

  // Export workflow
  const exportWorkflow = () => {
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name || 'workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import workflow
  const importWorkflow = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setWorkflow(imported);
      } catch (error) {
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`flex h-full ${className}`}>
      {/* Left Sidebar - Node Palette */}
      <div className="w-64 border-r p-4 bg-gray-50 overflow-y-auto">
        <h3 className="font-semibold mb-4">Node Types</h3>
        <div className="space-y-2">
          {nodeTypes.map(({ type, label, color }) => (
            <div
              key={type}
              draggable
              onDragStart={() => handleDragStart(type)}
              className={`${color} text-white p-3 rounded cursor-move hover:opacity-80 transition-opacity`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-4">Workflow Settings</h3>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={workflow.name}
                onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Workflow name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={workflow.description}
                onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the workflow"
                rows={3}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={workflow.category}
                onValueChange={(value: any) => setWorkflow(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claim-processing">Claim Processing</SelectItem>
                  <SelectItem value="approval">Approval</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b p-2 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleTest} variant="outline" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Test
            </Button>
            <Button onClick={exportWorkflow} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => document.getElementById('import-file')?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={importWorkflow}
              className="hidden"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Canvas Area */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden bg-gray-100"
          onDrop={handleCanvasDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
          >
            {/* Grid pattern */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#ccc" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Edges */}
            {workflow.edges.map(edge => {
              const sourceNode = workflow.nodes.find(n => n.id === edge.source);
              const targetNode = workflow.nodes.find(n => n.id === edge.target);

              if (!sourceNode || !targetNode) return null;

              return (
                <g key={edge.id}>
                  <line
                    x1={sourceNode.position.x + 50}
                    y1={sourceNode.position.y + 25}
                    x2={targetNode.position.x + 50}
                    y2={targetNode.position.y + 25}
                    stroke="#666"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                    onClick={() => setSelectedEdge(edge)}
                    className="cursor-pointer hover:stroke-blue-500"
                  />
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3, 0 6" fill="#666" />
                    </marker>
                  </defs>
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {workflow.nodes.map(node => {
            const nodeType = nodeTypes.find(nt => nt.type === node.type);

            return (
              <div
                key={node.id}
                className={`absolute ${nodeType?.color} text-white p-3 rounded-lg cursor-move shadow-lg ${
                  selectedNode?.id === node.id ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                  transformOrigin: 'top left',
                  width: '100px',
                }}
                onClick={() => setSelectedNode(node)}
              >
                <div className="text-sm font-semibold">{node.name}</div>
                {connectionMode ? (
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      completeConnection(node.id);
                    }}
                  >
                    Connect
                  </Button>
                ) : (
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        startConnection(node.id);
                      }}
                      className="flex-1"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNode(node.id);
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      {(selectedNode || selectedEdge) && (
        <div className="w-80 border-l p-4 bg-white overflow-y-auto">
          {selectedNode && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Node Properties</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNode(null)}
                >
                  ×
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={selectedNode.name}
                    onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={selectedNode.description || ''}
                    onChange={(e) =>
                      updateNode(selectedNode.id, { description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Badge>{selectedNode.type}</Badge>
                </div>
                <div>
                  <Label>Configuration (JSON)</Label>
                  <Textarea
                    value={JSON.stringify(selectedNode.config, null, 2)}
                    onChange={(e) => {
                      try {
                        const config = JSON.parse(e.target.value);
                        updateNode(selectedNode.id, { config });
                      } catch {}
                    }}
                    rows={10}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </>
          )}

          {selectedEdge && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Connection Properties</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEdge(null)}
                >
                  ×
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={selectedEdge.label || ''}
                    onChange={(e) => {
                      setWorkflow(prev => ({
                        ...prev,
                        edges: prev.edges.map(edge =>
                          edge.id === selectedEdge.id
                            ? { ...edge, label: e.target.value }
                            : edge
                        ),
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label>Condition (Optional)</Label>
                  <Textarea
                    value={selectedEdge.condition || ''}
                    onChange={(e) => {
                      setWorkflow(prev => ({
                        ...prev,
                        edges: prev.edges.map(edge =>
                          edge.id === selectedEdge.id
                            ? { ...edge, condition: e.target.value }
                            : edge
                        ),
                      }));
                    }}
                    placeholder="context.amount > 1000"
                    rows={3}
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={() => deleteEdge(selectedEdge.id)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Connection
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
