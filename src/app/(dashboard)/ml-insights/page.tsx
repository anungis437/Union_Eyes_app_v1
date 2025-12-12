'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NLQueryInterface } from '@/src/components/ml/NLQueryInterface';
import { SmartRecommendations } from '@/src/components/ml/SmartRecommendations';
import { Sparkles, Lightbulb, TrendingUp } from 'lucide-react';

/**
 * ML & AI Insights Page
 * Central hub for all machine learning and AI features
 */
export default function MLInsightsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AI & Machine Learning</h1>
          <p className="text-muted-foreground">
            Intelligent insights, predictions, and natural language queries
          </p>
        </div>
      </div>

      <Tabs defaultValue="query" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="query" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Query</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Recommendations</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Trends</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="query" className="space-y-6">
          <NLQueryInterface />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SmartRecommendations type="steward" />
            <SmartRecommendations type="deadline" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SmartRecommendations type="strategy" />
            <SmartRecommendations type="priority" />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="rounded-lg border p-6 text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-2">ML Trend Analysis Coming Soon</h3>
            <p className="text-sm">
              Advanced pattern detection and predictive analytics visualization
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
