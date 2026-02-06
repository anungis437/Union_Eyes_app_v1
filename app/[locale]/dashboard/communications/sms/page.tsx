/**
 * SMS Communications Dashboard (Phase 5 - Week 1)
 * Main page for SMS management
 * 
 * Features:
 * - Quick stats (messages sent, delivered, failed, cost)
 * - Campaign list with status
 * - Template library
 * - SMS inbox for two-way conversations
 * - Quick actions (new campaign, new template, send single SMS)
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MessageSquare,
  Send,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  FileText,
  Plus,
  Inbox,
} from 'lucide-react';
import { SmsTemplateEditor } from '@/components/communications/sms-template-editor';
import { SmsCampaignBuilder } from '@/components/communications/sms-campaign-builder';
import { SmsInbox } from '@/components/communications/sms-inbox';

interface SmsPageProps {
  params: {
    locale: string;
  };
}

export default function SmsPage({ params }: SmsPageProps) {
  const [activeView, setActiveView] = useState<'dashboard' | 'template' | 'campaign' | 'inbox'>(
    'dashboard'
  );
  const tenantId = 'CURRENT_TENANT_ID'; // TODO: Get from auth context

  // Mock stats - TODO: Load from API
  const stats = {
    messagesSent: 1247,
    messagesDelivered: 1189,
    messagesFailed: 12,
    totalCost: 11.23,
    campaignsActive: 3,
    templatesCount: 15,
    unreadMessages: 5,
  };

  // Render main dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messagesSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messagesDelivered.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.messagesDelivered / stats.messagesSent) * 100).toFixed(1)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messagesFailed}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.messagesFailed / stats.messagesSent) * 100).toFixed(1)}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${(stats.totalCost / stats.messagesSent).toFixed(4)} per message
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common SMS tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={() => setActiveView('campaign')}>
            <Send className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
          <Button variant="outline" onClick={() => setActiveView('template')}>
            <FileText className="mr-2 h-4 w-4" />
            Create Template
          </Button>
          <Button variant="outline" onClick={() => setActiveView('inbox')}>
            <Inbox className="mr-2 h-4 w-4" />
            View Inbox {stats.unreadMessages > 0 && `(${stats.unreadMessages})`}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
          <CardDescription>Latest SMS campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            TODO: Implement campaign list with status, recipients, and cost
          </div>
        </CardContent>
      </Card>

      {/* Templates Library */}
      <Card>
        <CardHeader>
          <CardTitle>Template Library</CardTitle>
          <CardDescription>{stats.templatesCount} templates available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            TODO: Implement template grid with categories and usage stats
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Communications</h1>
          <p className="text-muted-foreground">
            Send bulk SMS, manage templates, and handle two-way conversations
          </p>
        </div>
        {activeView !== 'dashboard' && (
          <Button variant="outline" onClick={() => setActiveView('dashboard')}>
            Back to Dashboard
          </Button>
        )}
      </div>

      {/* Content */}
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'template' && (
        <SmsTemplateEditor
          tenantId={tenantId}
          onSave={() => setActiveView('dashboard')}
          onCancel={() => setActiveView('dashboard')}
        />
      )}
      {activeView === 'campaign' && (
        <SmsCampaignBuilder
          tenantId={tenantId}
          onComplete={() => setActiveView('dashboard')}
          onCancel={() => setActiveView('dashboard')}
        />
      )}
      {activeView === 'inbox' && <SmsInbox tenantId={tenantId} />}
    </div>
  );
}
