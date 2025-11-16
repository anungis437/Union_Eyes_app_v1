import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Calendar,
  Clock,
  Loader2,
  CheckCircle,
  Send,
  FileSpreadsheet,
  FileImage
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@unioneyes/ui/components/card';
import { Button } from '@unioneyes/ui/components/button';
import { Textarea } from '@unioneyes/ui/components/textarea';
import { Input } from '@unioneyes/ui/components/input';
import { Label } from '@unioneyes/ui/components/label';
import { Badge } from '@unioneyes/ui/components/badge';
import { Alert, AlertDescription } from '@unioneyes/ui/components/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@unioneyes/ui/components/select';
import { Progress } from '@unioneyes/ui/components/progress';

interface Report {
  id: string;
  title: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  downloadUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface ReportGeneratorProps {
  tenantId: string;
  onReportGenerated?: (report: Report) => void;
  className?: string;
}

const reportTemplates = [
  {
    id: 'claims-summary',
    name: 'Claims Summary Report',
    description: 'Overview of all claims with key metrics',
    example: 'Generate a summary of all active claims from the last 30 days, including status distribution, average resolution time, and top claimants.',
  },
  {
    id: 'financial-analysis',
    name: 'Financial Analysis Report',
    description: 'Settlement amounts, costs, and trends',
    example: 'Create a financial analysis showing total settlements paid, pending liabilities, and cost trends by claim type for Q1 2024.',
  },
  {
    id: 'performance-metrics',
    name: 'Performance Metrics Report',
    description: 'Team performance and efficiency metrics',
    example: 'Analyze steward performance metrics including cases handled, average resolution time, and member satisfaction ratings.',
  },
  {
    id: 'custom',
    name: 'Custom Report',
    description: 'Define your own report criteria',
    example: 'Describe exactly what data and analysis you need in your report.',
  },
];

export function ReportGenerator({
  tenantId,
  onReportGenerated,
  className = '',
}: ReportGeneratorProps) {
  const [specification, setSpecification] = useState('');
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<'pdf' | 'excel' | 'word'>('pdf');
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [reportHistory, setReportHistory] = useState<Report[]>([]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = reportTemplates.find((t) => t.id === templateId);
    if (template && template.example) {
      setSpecification(template.example);
      setTitle(template.name);
    }
  };

  const generateReport = async () => {
    if (!specification.trim() || !title.trim()) return;

    setIsGenerating(true);

    const jobId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newReport: Report = {
      id: jobId,
      title,
      format,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };

    setCurrentReport(newReport);
    setReportHistory((prev) => [newReport, ...prev]);

    try {
      // Submit report generation job
      const response = await fetch('/api/ai/report/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          specification,
          title,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report generation job');
      }

      const { jobId: serverJobId } = await response.json();

      // Update report with server job ID
      const updatedReport = { ...newReport, id: serverJobId, status: 'processing' as const };
      setCurrentReport(updatedReport);
      updateReportInHistory(updatedReport);

      // Poll for job status
      pollJobStatus(serverJobId);
    } catch (error) {
      console.error('Report generation failed:', error);
      const failedReport = { ...newReport, status: 'failed' as const };
      setCurrentReport(failedReport);
      updateReportInHistory(failedReport);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ai/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Tenant-ID': tenantId,
          },
        });

        if (!response.ok) {
          clearInterval(pollInterval);
          return;
        }

        const { job } = await response.json();

        const updatedReport: Report = {
          id: jobId,
          title: currentReport?.title || title,
          format,
          status: job.status,
          progress: job.progress || 0,
          downloadUrl: job.result?.downloadUrl,
          createdAt: currentReport?.createdAt || new Date(),
          completedAt: job.status === 'completed' ? new Date() : undefined,
        };

        setCurrentReport(updatedReport);
        updateReportInHistory(updatedReport);

        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(pollInterval);

          if (job.status === 'completed' && onReportGenerated) {
            onReportGenerated(updatedReport);
          }
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds
  };

  const updateReportInHistory = (updatedReport: Report) => {
    setReportHistory((prev) =>
      prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
    );
  };

  const getFormatIcon = (fmt: string) => {
    switch (fmt) {
      case 'pdf':
        return <FileImage className="h-4 w-4" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'word':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Report Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            AI Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Selection */}
          <div>
            <Label>Report Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {reportTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {template.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Report Title */}
          <div>
            <Label htmlFor="report-title">Report Title</Label>
            <Input
              id="report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter report title..."
            />
          </div>

          {/* Report Specification */}
          <div>
            <Label htmlFor="report-spec">Report Specification</Label>
            <Textarea
              id="report-spec"
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder="Describe what you want in the report using natural language..."
              className="min-h-[150px]"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Be as specific as possible. Include data sources, date ranges, metrics,
              and any specific formatting requirements.
            </div>
          </div>

          {/* Output Format */}
          <div>
            <Label>Output Format</Label>
            <div className="flex gap-2 mt-2">
              {['pdf', 'excel', 'word'].map((fmt) => (
                <Button
                  key={fmt}
                  variant={format === fmt ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat(fmt as any)}
                  className="flex items-center gap-2"
                >
                  {getFormatIcon(fmt)}
                  {fmt.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateReport}
            disabled={!specification.trim() || !title.trim() || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting Report Job...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>

          {/* Info Alert */}
          <Alert>
            <AlertDescription className="text-xs">
              Report generation may take several minutes depending on the data volume.
              You'll be able to download the report once it's ready.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Current Report Progress */}
      {currentReport && currentReport.status !== 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Report Generation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{currentReport.title}</span>
              <Badge className={getStatusColor(currentReport.status)}>
                {currentReport.status}
              </Badge>
            </div>
            {currentReport.progress !== undefined && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span>{currentReport.progress}%</span>
                </div>
                <Progress value={currentReport.progress} />
              </div>
            )}
            {currentReport.status === 'processing' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating report... This may take a few minutes.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report History */}
      {reportHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Report History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportHistory.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getFormatIcon(report.format)}
                      <span className="font-medium text-sm">{report.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                      <Badge className={getStatusColor(report.status)} variant="outline">
                        {report.status}
                      </Badge>
                    </div>
                  </div>
                  {report.status === 'completed' && report.downloadUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={report.downloadUrl} download>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  )}
                  {report.status === 'processing' && report.progress !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      {report.progress}%
                    </div>
                  )}
                  {report.status === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
