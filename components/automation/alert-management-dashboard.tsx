"use client";

/**
 * Alert Management Dashboard Component
 * 
 * Centralized dashboard to view, edit, enable/disable, and monitor all alert rules
 * with execution history and performance metrics.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Play,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Bell,
  Activity,
  BarChart3,
  Eye
} from 'lucide-react';

// Sample alert rules data
const SAMPLE_ALERT_RULES = [
  {
    id: '1',
    name: 'Contract Expiration Alert',
    category: 'contract_management',
    description: 'Alert bargaining team when contracts are approaching expiration',
    severity: 'high' as const,
    triggerType: 'schedule' as const,
    frequency: 'daily_digest' as const,
    isEnabled: true,
    lastExecutedAt: '2025-12-07T06:00:00Z',
    lastExecutionStatus: 'success' as const,
    executionCount: 45,
    successCount: 43,
    failureCount: 2,
    conditionsCount: 2,
    actionsCount: 3,
    createdAt: '2025-10-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Dues Arrears Alert',
    category: 'financial',
    description: 'Alert when members fall behind on dues payments',
    severity: 'medium' as const,
    triggerType: 'event' as const,
    frequency: 'every_occurrence' as const,
    isEnabled: true,
    lastExecutedAt: '2025-12-06T14:30:00Z',
    lastExecutionStatus: 'success' as const,
    executionCount: 127,
    successCount: 125,
    failureCount: 2,
    conditionsCount: 2,
    actionsCount: 2,
    createdAt: '2025-09-15T00:00:00Z',
  },
  {
    id: '3',
    name: 'Certification Expiry Alert',
    category: 'training',
    description: 'Alert members when certifications are expiring',
    severity: 'medium' as const,
    triggerType: 'schedule' as const,
    frequency: 'daily_digest' as const,
    isEnabled: true,
    lastExecutedAt: '2025-12-07T06:00:00Z',
    lastExecutionStatus: 'success' as const,
    executionCount: 62,
    successCount: 62,
    failureCount: 0,
    conditionsCount: 1,
    actionsCount: 2,
    createdAt: '2025-10-10T00:00:00Z',
  },
  {
    id: '4',
    name: 'Grievance Deadline Alert',
    category: 'grievances',
    description: 'Alert stewards of approaching grievance deadlines',
    severity: 'critical' as const,
    triggerType: 'schedule' as const,
    frequency: 'every_occurrence' as const,
    isEnabled: true,
    lastExecutedAt: '2025-12-07T08:00:00Z',
    lastExecutionStatus: 'success' as const,
    executionCount: 89,
    successCount: 87,
    failureCount: 2,
    conditionsCount: 1,
    actionsCount: 3,
    createdAt: '2025-09-01T00:00:00Z',
  },
  {
    id: '5',
    name: 'Member Engagement Drop',
    category: 'membership',
    description: 'Alert when member engagement score drops below threshold',
    severity: 'low' as const,
    triggerType: 'threshold' as const,
    frequency: 'rate_limited' as const,
    isEnabled: false,
    lastExecutedAt: '2025-12-03T10:00:00Z',
    lastExecutionStatus: 'failed' as const,
    executionCount: 15,
    successCount: 13,
    failureCount: 2,
    conditionsCount: 2,
    actionsCount: 2,
    createdAt: '2025-11-01T00:00:00Z',
  },
  {
    id: '6',
    name: 'Strike Fund Low Balance',
    category: 'strike_fund',
    description: 'Alert when strike fund balance falls below threshold',
    severity: 'critical' as const,
    triggerType: 'threshold' as const,
    frequency: 'every_occurrence' as const,
    isEnabled: true,
    lastExecutedAt: '2025-12-05T12:00:00Z',
    lastExecutionStatus: 'success' as const,
    executionCount: 3,
    successCount: 3,
    failureCount: 0,
    conditionsCount: 2,
    actionsCount: 2,
    createdAt: '2025-11-20T00:00:00Z',
  },
];

// Sample execution history
const SAMPLE_EXECUTIONS = [
  {
    id: '1',
    alertRuleName: 'Grievance Deadline Alert',
    triggeredBy: 'schedule',
    status: 'success' as const,
    conditionsMet: true,
    startedAt: '2025-12-07T08:00:00Z',
    completedAt: '2025-12-07T08:00:05Z',
    executionTimeMs: 5234,
    actionsExecuted: 3,
    actionsSucceeded: 3,
    actionsFailed: 0,
  },
  {
    id: '2',
    alertRuleName: 'Contract Expiration Alert',
    triggeredBy: 'schedule',
    status: 'success' as const,
    conditionsMet: true,
    startedAt: '2025-12-07T06:00:00Z',
    completedAt: '2025-12-07T06:00:08Z',
    executionTimeMs: 8123,
    actionsExecuted: 3,
    actionsSucceeded: 3,
    actionsFailed: 0,
  },
  {
    id: '3',
    alertRuleName: 'Certification Expiry Alert',
    triggeredBy: 'schedule',
    status: 'success' as const,
    conditionsMet: true,
    startedAt: '2025-12-07T06:00:00Z',
    completedAt: '2025-12-07T06:00:04Z',
    executionTimeMs: 4567,
    actionsExecuted: 2,
    actionsSucceeded: 2,
    actionsFailed: 0,
  },
  {
    id: '4',
    alertRuleName: 'Dues Arrears Alert',
    triggeredBy: 'event',
    status: 'success' as const,
    conditionsMet: true,
    startedAt: '2025-12-06T14:30:00Z',
    completedAt: '2025-12-06T14:30:03Z',
    executionTimeMs: 3245,
    actionsExecuted: 2,
    actionsSucceeded: 2,
    actionsFailed: 0,
  },
  {
    id: '5',
    alertRuleName: 'Member Engagement Drop',
    triggeredBy: 'threshold',
    status: 'failed' as const,
    conditionsMet: true,
    startedAt: '2025-12-03T10:00:00Z',
    completedAt: '2025-12-03T10:00:12Z',
    executionTimeMs: 12456,
    actionsExecuted: 2,
    actionsSucceeded: 1,
    actionsFailed: 1,
  },
];

const SEVERITY_COLORS = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  info: 'bg-gray-500',
};

const STATUS_ICONS = {
  success: { icon: CheckCircle2, color: 'text-green-600' },
  failed: { icon: XCircle, color: 'text-red-600' },
  pending: { icon: Clock, color: 'text-gray-600' },
  running: { icon: Activity, color: 'text-blue-600' },
};

export default function AlertManagementDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Filter alert rules
  const filteredRules = SAMPLE_ALERT_RULES.filter(rule => {
    if (searchQuery && !rule.name.toLowerCase().includes(searchQuery.toLowerCase()) && !rule.category.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCategory !== 'all' && rule.category !== selectedCategory) {
      return false;
    }
    if (selectedSeverity !== 'all' && rule.severity !== selectedSeverity) {
      return false;
    }
    if (selectedStatus === 'enabled' && !rule.isEnabled) {
      return false;
    }
    if (selectedStatus === 'disabled' && rule.isEnabled) {
      return false;
    }
    return true;
  });

  // Calculate statistics
  const totalRules = SAMPLE_ALERT_RULES.length;
  const enabledRules = SAMPLE_ALERT_RULES.filter(r => r.isEnabled).length;
  const totalExecutions = SAMPLE_ALERT_RULES.reduce((sum, r) => sum + r.executionCount, 0);
  const totalSuccesses = SAMPLE_ALERT_RULES.reduce((sum, r) => sum + r.successCount, 0);
  const totalFailures = SAMPLE_ALERT_RULES.reduce((sum, r) => sum + r.failureCount, 0);
  const successRate = totalExecutions > 0 ? ((totalSuccesses / totalExecutions) * 100).toFixed(1) : '0';

  // Toggle alert rule
  const toggleAlertRule = (id: string) => {
    console.log('Toggling alert rule:', id);
    // API call would go here
  };

  // Delete alert rule
  const deleteAlertRule = (id: string) => {
    console.log('Deleting alert rule:', id);
    // API call would go here
  };

  // Test alert rule
  const testAlertRule = (id: string) => {
    console.log('Testing alert rule:', id);
    // API call would go here
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alert Management</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage all alert rules and execution history
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Alert Rule
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">{totalRules}</p>
              </div>
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{enabledRules}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Executions</p>
                <p className="text-2xl font-bold">{totalExecutions}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{successRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failures</p>
                <p className="text-2xl font-bold">{totalFailures}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Alert Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search alert rules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border rounded-md px-3 py-2"
                >
                  <option value="all">All Categories</option>
                  <option value="contract_management">Contract Management</option>
                  <option value="financial">Financial</option>
                  <option value="training">Training</option>
                  <option value="grievances">Grievances</option>
                  <option value="membership">Membership</option>
                  <option value="strike_fund">Strike Fund</option>
                </select>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="border rounded-md px-3 py-2"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Info</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="border rounded-md px-3 py-2"
                >
                  <option value="all">All Status</option>
                  <option value="enabled">Enabled Only</option>
                  <option value="disabled">Disabled Only</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Alert Rules List */}
          <div className="space-y-3">
            {filteredRules.map((rule) => {
              const StatusIcon = STATUS_ICONS[rule.lastExecutionStatus || 'pending'];
              
              return (
                <Card key={rule.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{rule.name}</h3>
                          <Badge className={SEVERITY_COLORS[rule.severity]}>
                            {rule.severity}
                          </Badge>
                          <Badge variant="outline">{rule.triggerType}</Badge>
                          <Badge variant="outline">{rule.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                        
                        <div className="grid md:grid-cols-6 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Frequency</p>
                            <p className="font-medium">{rule.frequency.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Conditions</p>
                            <p className="font-medium">{rule.conditionsCount}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Actions</p>
                            <p className="font-medium">{rule.actionsCount}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Executions</p>
                            <p className="font-medium">{rule.executionCount}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Success Rate</p>
                            <p className="font-medium">
                              {rule.executionCount > 0 
                                ? ((rule.successCount / rule.executionCount) * 100).toFixed(0)
                                : 0}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Run</p>
                            <div className="flex items-center gap-1">
                              <StatusIcon.icon className={`h-4 w-4 ${StatusIcon.color}`} />
                              <p className="font-medium">
                                {rule.lastExecutedAt 
                                  ? new Date(rule.lastExecutedAt).toLocaleDateString()
                                  : 'Never'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Switch
                          checked={rule.isEnabled}
                          onCheckedChange={() => toggleAlertRule(rule.id)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => testAlertRule(rule.id)}>
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteAlertRule(rule.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredRules.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-muted-foreground">No alert rules match your filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Execution History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>View detailed execution history for all alert rules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {SAMPLE_EXECUTIONS.map((execution) => {
                  const StatusIcon = STATUS_ICONS[execution.status];
                  
                  return (
                    <Card key={execution.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <StatusIcon.icon className={`h-5 w-5 ${StatusIcon.color}`} />
                              <h4 className="font-semibold">{execution.alertRuleName}</h4>
                              <Badge variant="outline">{execution.triggeredBy}</Badge>
                            </div>
                            
                            <div className="grid md:grid-cols-6 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Status</p>
                                <p className="font-medium capitalize">{execution.status}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Conditions Met</p>
                                <p className="font-medium">{execution.conditionsMet ? 'Yes' : 'No'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Actions</p>
                                <p className="font-medium">
                                  {execution.actionsSucceeded}/{execution.actionsExecuted}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Execution Time</p>
                                <p className="font-medium">{(execution.executionTimeMs / 1000).toFixed(2)}s</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Started</p>
                                <p className="font-medium">
                                  {new Date(execution.startedAt).toLocaleTimeString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Completed</p>
                                <p className="font-medium">
                                  {new Date(execution.completedAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Execution Trends</CardTitle>
                <CardDescription>Alert executions over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-2" />
                  <p>Chart visualization would go here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Rate by Category</CardTitle>
                <CardDescription>Performance breakdown by alert category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['contract_management', 'financial', 'training', 'grievances'].map((category) => {
                    const categoryRules = SAMPLE_ALERT_RULES.filter(r => r.category === category);
                    const totalExecs = categoryRules.reduce((sum, r) => sum + r.executionCount, 0);
                    const successExecs = categoryRules.reduce((sum, r) => sum + r.successCount, 0);
                    const rate = totalExecs > 0 ? ((successExecs / totalExecs) * 100).toFixed(1) : '0';

                    return (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500" 
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{rate}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Active Rules</CardTitle>
                <CardDescription>Alert rules with highest execution counts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {SAMPLE_ALERT_RULES
                    .sort((a, b) => b.executionCount - a.executionCount)
                    .slice(0, 5)
                    .map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{rule.name}</span>
                        <Badge variant="outline">{rule.executionCount} executions</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Execution Time</CardTitle>
                <CardDescription>Performance metrics by alert rule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {SAMPLE_ALERT_RULES.slice(0, 5).map((rule) => {
                    const avgTime = (Math.random() * 5 + 2).toFixed(2); // Mock data

                    return (
                      <div key={rule.id} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{rule.name}</span>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{avgTime}s</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

