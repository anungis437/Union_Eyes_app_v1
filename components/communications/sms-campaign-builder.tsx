/**
 * SMS Campaign Builder Component (Phase 5 - Week 1)
 * Multi-step wizard for creating and sending SMS campaigns
 * 
 * Features:
 * - Step 1: Select template or write custom message
 * - Step 2: Select recipients with filtering
 * - Step 3: Preview and schedule
 * - Step 4: Send confirmation
 * - Progress tracking and validation
 * - Cost estimation
 */

'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Users,
  MessageSquare,
  Calendar,
  DollarSign,
  CheckCircle,
} from 'lucide-react';

interface SmsCampaignBuilderProps {
  tenantId: string;
  onComplete?: (campaign: any) => void;
  onCancel?: () => void;
}

interface Template {
  id: string;
  name: string;
  messageTemplate: string;
  category: string;
}

const STEPS = [
  { number: 1, title: 'Message', icon: MessageSquare },
  { number: 2, title: 'Recipients', icon: Users },
  { number: 3, title: 'Schedule', icon: Calendar },
  { number: 4, title: 'Confirm', icon: CheckCircle },
];

export function SmsCampaignBuilder({
  tenantId,
  onComplete,
  onCancel,
}: SmsCampaignBuilderProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Campaign data
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [scheduledDate, setScheduledDate] = useState<string>('');

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/communications/sms/templates?tenantId=${tenantId}`);
      if (!response.ok) throw new Error('Failed to load templates');
      const { templates } = await response.json();
      setTemplates(templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    }
  };

  // Calculate segments and cost
  const calculateSegments = (text: string): number => {
    const length = text.length;
    if (length === 0) return 0;
    if (length <= 160) return 1;
    return Math.ceil(length / 153);
  };

  const segments = calculateSegments(message);
  const costPerMessage = segments * 0.0075;
  const totalCost = costPerMessage * recipientCount;

  // Step validation
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return campaignName.trim() !== '' && message.trim() !== '';
      case 2:
        return recipientCount > 0;
      case 3:
        return true; // Schedule is optional
      default:
        return false;
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setMessage(template.messageTemplate);
    }
  };

  // Handle next step
  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Create campaign
  const handleCreateCampaign = async () => {
    setIsLoading(true);

    try {
      // Create campaign
      const createResponse = await fetch('/api/communications/sms/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: campaignName,
          message,
          templateId: selectedTemplateId || undefined,
          scheduledFor: scheduledDate || undefined,
        }),
      });

      if (!createResponse.ok) throw new Error('Failed to create campaign');
      const { campaign } = await createResponse.json();

      toast({
        title: 'Success',
        description: 'Campaign created successfully',
      });

      // Move to final step
      setCurrentStep(4);
      return campaign;
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to create campaign',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Send campaign
  const handleSendCampaign = async () => {
    setIsSending(true);

    try {
      const campaign = await handleCreateCampaign();
      if (!campaign) return;

      // Send campaign
      const sendResponse = await fetch(`/api/communications/sms/campaigns/${campaign.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipients.map((r) => ({
            phoneNumber: r.phoneNumber,
            userId: r.userId,
          })),
        }),
      });

      if (!sendResponse.ok) throw new Error('Failed to send campaign');
      const result = await sendResponse.json();

      toast({
        title: 'Success',
        description: `Campaign sent to ${result.sent} recipients`,
      });

      onComplete?.(campaign);
    } catch (error) {
      console.error('Failed to send campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to send campaign',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
                <CardDescription>Name your campaign and compose the message</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name *</Label>
                  <Input
                    id="campaign-name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., December Meeting Reminder"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">Use Template (Optional)</Label>
                  <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template or write custom message" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message here..."
                    rows={6}
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{message.length} characters</span>
                    <Badge variant={segments > 3 ? 'destructive' : 'secondary'}>
                      {segments} segment{segments !== 1 ? 's' : ''} (~${costPerMessage.toFixed(4)}{' '}
                      each)
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Recipients</CardTitle>
                <CardDescription>Choose who will receive this message</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Selected Recipients</div>
                      <div className="text-2xl font-bold">{recipientCount}</div>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <strong>TODO:</strong> Implement recipient selection UI with filters (role,
                  status, tags, etc.)
                </div>

                {/* Temporary mock data */}
                <Button
                  onClick={() => {
                    setRecipientCount(50);
                    setRecipients(
                      Array.from({ length: 50 }, (_, i) => ({
                        userId: `user-${i}`,
                        phoneNumber: `+1415555${String(i).padStart(4, '0')}`,
                      }))
                    );
                  }}
                >
                  Select All Active Members (50)
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Campaign</CardTitle>
                <CardDescription>Send now or schedule for later</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule">Send Date & Time (Optional)</Label>
                  <Input
                    id="schedule"
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave blank to send immediately
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review & Send</CardTitle>
                <CardDescription>Review your campaign before sending</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Campaign Summary */}
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Campaign Name</div>
                    <div className="text-lg font-semibold">{campaignName}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Message</div>
                    <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                      {message}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Recipients</div>
                      <div className="text-lg font-semibold">{recipientCount}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Estimated Cost
                      </div>
                      <div className="text-lg font-semibold">${totalCost.toFixed(2)}</div>
                    </div>
                  </div>

                  {scheduledDate && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Scheduled For
                      </div>
                      <div className="text-lg font-semibold">
                        {new Date(scheduledDate).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cost Breakdown */}
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Cost per message:</span>
                    <span className="font-medium">${costPerMessage.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Number of recipients:</span>
                    <span className="font-medium">{recipientCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>SMS segments per message:</span>
                    <span className="font-medium">{segments}</span>
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between font-semibold">
                    <span>Total estimated cost:</span>
                    <span>${totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Create SMS Campaign</h2>
        <p className="text-muted-foreground">Send bulk SMS to your members</p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <Progress value={progress} />
        <div className="flex justify-between">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isComplete = currentStep > step.number;

            return (
              <div
                key={step.number}
                className={`flex items-center gap-2 ${
                  isActive
                    ? 'text-primary'
                    : isComplete
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={currentStep === 1 ? onCancel : handlePrevious}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentStep === 1 ? 'Cancel' : 'Previous'}
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSendCampaign} disabled={isSending}>
            <Send className="mr-2 h-4 w-4" />
            {isSending
              ? 'Sending...'
              : scheduledDate
              ? 'Schedule Campaign'
              : 'Send Now'}
          </Button>
        )}
      </div>
    </div>
  );
}
