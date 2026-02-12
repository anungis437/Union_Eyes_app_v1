import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  User,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, formatDistanceToNow } from 'date-fns';

interface ApprovalRequest {
  id: string;
  instanceId: string;
  nodeExecutionId: string;
  workflowName: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  requestedAt: string;
  respondedAt?: string;
  claimId?: string;
  context?: any;
}

interface ApprovalQueueProps {
  organizationId: string;
  userId: string;
  onApprovalProcessed?: (approvalId: string, approved: boolean) => void;
  className?: string;
}

export function ApprovalQueue({
  organizationId,
  userId,
  onApprovalProcessed,
  className = '',
}: ApprovalQueueProps) {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(
    null
  );
  const [showDialog, setShowDialog] = useState(false);
  const [responseType, setResponseType] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // Fetch approval requests
  const fetchApprovals = useCallback(async () => {
    try {
      const response = await fetch('/api/approvals', {
        headers: {
          'X-Organization-ID': organizationId,
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch approvals');

      const data = await response.json();
      setApprovals(data);
      calculateStats(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [organizationId, userId]);

  // Calculate statistics
  const calculateStats = (data: ApprovalRequest[]) => {
    const stats = {
      pending: data.filter((a) => a.status === 'pending').length,
      approved: data.filter((a) => a.status === 'approved').length,
      rejected: data.filter((a) => a.status === 'rejected').length,
    };
    setStats(stats);
  };

  // Auto-refresh
  useEffect(() => {
    fetchApprovals();

    const interval = setInterval(() => {
      fetchApprovals();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [fetchApprovals]);

  // Open approval dialog
  const openApprovalDialog = (approval: ApprovalRequest, type: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setResponseType(type);
    setComments('');
    setShowDialog(true);
  };

  // Submit approval response
  const handleSubmitResponse = async () => {
    if (!selectedApproval) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/api/approvals/${selectedApproval.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-ID': organizationId,
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          approved: responseType === 'approve',
          comments,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit approval response');

      // Refresh approvals list
      await fetchApprovals();

      // Notify parent component
      if (onApprovalProcessed) {
        onApprovalProcessed(selectedApproval.id, responseType === 'approve');
      }

      // Close dialog
      setShowDialog(false);
      setSelectedApproval(null);
    } catch (error) {
    } finally {
      setSubmitting(false);
    }
  };

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const completedApprovals = approvals.filter((a) => a.status !== 'pending');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-yellow-500">
              <Clock className="w-4 h-4" />
              Pending
            </div>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-green-500">
              <CheckCircle className="w-4 h-4" />
              Approved
            </div>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-red-500">
              <XCircle className="w-4 h-4" />
              Rejected
            </div>
            <div className="text-2xl font-bold">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pending Approvals</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchApprovals}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <Card key={approval.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-1">
                          {approval.workflowName}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDistanceToNow(new Date(approval.requestedAt), {
                              addSuffix: true,
                            })}
                          </div>
                          {approval.claimId && (
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {approval.claimId}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-yellow-500 text-white">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>

                    {approval.message && (
                      <Alert className="mb-4">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>{approval.message}</AlertDescription>
                      </Alert>
                    )}

                    {approval.context && (
                      <div className="mb-4">
                        <h5 className="text-sm font-semibold mb-2">Context</h5>
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(approval.context, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => openApprovalDialog(approval, 'approve')}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => openApprovalDialog(approval, 'reject')}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval History */}
      <Card>
        <CardHeader>
          <CardTitle>Approval History</CardTitle>
        </CardHeader>
        <CardContent>
          {completedApprovals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No approval history
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Responded</TableHead>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedApprovals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell className="font-medium">
                        {approval.workflowName}
                      </TableCell>
                      <TableCell>
                        {approval.status === 'approved' ? (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500 text-white">
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(approval.requestedAt), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {approval.respondedAt
                          ? format(new Date(approval.respondedAt), 'MMM d, yyyy HH:mm')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {approval.claimId ? (
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {approval.claimId}
                          </code>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {approval.message || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Response Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseType === 'approve' ? 'Approve' : 'Reject'} Workflow
            </DialogTitle>
            <DialogDescription>
              {selectedApproval && (
                <>
                  <div className="mb-2">
                    <strong>Workflow:</strong> {selectedApproval.workflowName}
                  </div>
                  {selectedApproval.claimId && (
                    <div className="mb-2">
                      <strong>Claim ID:</strong> {selectedApproval.claimId}
                    </div>
                  )}
                  {selectedApproval.message && (
                    <Alert className="my-2">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{selectedApproval.message}</AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Comments (Optional)</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any comments or notes..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={submitting}
              className={
                responseType === 'approve'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              }
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : responseType === 'approve' ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {responseType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
