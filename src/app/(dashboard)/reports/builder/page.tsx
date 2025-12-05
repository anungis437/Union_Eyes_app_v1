/**
 * Visual Report Builder Page
 * 
 * No-code interface for building custom reports with drag-and-drop
 * Allows non-technical users to create reports without SQL knowledge
 * 
 * Created: November 16, 2025
 * Part of: Area 8 - Analytics Platform
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReportBuilder } from '@/src/components/analytics/ReportBuilder';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ReportConfig {
  name: string;
  description: string;
  dataSourceId: string;
  fields: any[];
  filters: any[];
  groupBy: string[];
  sortBy: any[];
  visualizationType: string;
  chartConfig?: any;
  limit?: number;
}

export default function ReportBuilderPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleSave = async (config: ReportConfig) => {
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      const response = await fetch('/api/reports/builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: config.name,
          description: config.description,
          category: 'custom',
          config: config,
          isPublic: false,
          isTemplate: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save report');
      }

      const result = await response.json();
      setSaveSuccess(`Report "${config.name}" saved successfully!`);
      
      // Redirect to reports list after 2 seconds
      setTimeout(() => {
        router.push('/reports');
      }, 2000);
    } catch (error: any) {
      console.error('Error saving report:', error);
      setSaveError(error.message || 'Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async (config: ReportConfig) => {
    // Execution is handled by ReportPreview component
    // This callback is for additional actions if needed
    console.log('Report executed:', config.name);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/reports')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Reports
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Visual Report Builder
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Create custom reports without writing SQL
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            Getting Started
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Select a data source, add fields, apply filters, and choose a visualization type.
            Preview your report in real-time and save it for later use.
          </AlertDescription>
        </Alert>

        {/* Success Message */}
        {saveSuccess && (
          <Alert className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <AlertTitle className="text-green-900 dark:text-green-100">
              Success!
            </AlertTitle>
            <AlertDescription className="text-green-800 dark:text-green-200">
              {saveSuccess}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {saveError && (
          <Alert className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertTitle className="text-red-900 dark:text-red-100">
              Error
            </AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-200">
              {saveError}
            </AlertDescription>
          </Alert>
        )}

        {/* Report Builder Component */}
        <ReportBuilder
          onSave={handleSave}
          onExecute={handleExecute}
          className="bg-white dark:bg-gray-800 rounded-lg shadow"
        />
      </div>
    </div>
  );
}
