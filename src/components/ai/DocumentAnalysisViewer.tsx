import React, { useState } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  TrendingUp,
  Clock,
  Scale,
  Users,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Entity {
  type: string; // 'person', 'organization', 'date', 'amount', 'location'
  value: string;
  context?: string;
}

interface DocumentAnalysisResult {
  summary: string;
  keyPoints: string[];
  entities: Entity[];
  sentiment: string; // 'positive', 'neutral', 'negative'
  category: string;
  legalIssues: string[];
  suggestedActions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
}

interface ContractAnalysisResult {
  clauses: {
    type: string;
    content: string;
    riskLevel: 'low' | 'medium' | 'high';
    explanation: string;
  }[];
  missingClauses: string[];
  recommendations: string[];
  overallRisk: 'low' | 'medium' | 'high';
}

interface DocumentAnalysisViewerProps {
  analysis: DocumentAnalysisResult | null;
  contractAnalysis?: ContractAnalysisResult | null;
  documentText?: string;
  className?: string;
}

export function DocumentAnalysisViewer({
  analysis,
  contractAnalysis,
  documentText,
  className = '',
}: DocumentAnalysisViewerProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!analysis && !contractAnalysis) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No analysis results available</p>
          <p className="text-sm mt-2">Upload and analyze a document to see results here</p>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      case 'medium':
        return <Info className="h-4 w-4" />;
      case 'high':
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const groupEntitiesByType = (entities: Entity[]) => {
    const grouped: Record<string, Entity[]> = {};
    entities.forEach((entity) => {
      if (!grouped[entity.type]) {
        grouped[entity.type] = [];
      }
      grouped[entity.type].push(entity);
    });
    return grouped;
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'person':
        return <Users className="h-4 w-4" />;
      case 'organization':
        return <Scale className="h-4 w-4" />;
      case 'date':
        return <Clock className="h-4 w-4" />;
      case 'amount':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Document Analysis
          </span>
          {analysis && (
            <Badge className={getRiskColor(analysis.riskLevel)}>
              {getRiskIcon(analysis.riskLevel)}
              <span className="ml-1">{analysis.riskLevel.toUpperCase()} Risk</span>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="entities">Entities</TabsTrigger>
            <TabsTrigger value="legal">Legal Issues</TabsTrigger>
            {contractAnalysis && <TabsTrigger value="contract">Contract</TabsTrigger>}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {analysis && (
              <>
                {/* Summary */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Summary</h3>
                  <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Category</div>
                    <div className="font-medium">{analysis.category}</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Sentiment</div>
                    <div className={`font-medium ${getSentimentColor(analysis.sentiment)}`}>
                      {analysis.sentiment.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Confidence */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Analysis Confidence</span>
                    <span className="text-muted-foreground">
                      {(analysis.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={analysis.confidence * 100} />
                </div>

                {/* Key Points */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Key Points</h3>
                  <ul className="space-y-2">
                    {analysis.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Suggested Actions */}
                {analysis.suggestedActions.length > 0 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">Recommended Actions</div>
                      <ul className="space-y-1">
                        {analysis.suggestedActions.map((action, idx) => (
                          <li key={idx} className="text-sm">
                            • {action}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </TabsContent>

          {/* Entities Tab */}
          <TabsContent value="entities" className="space-y-4">
            {analysis && analysis.entities.length > 0 ? (
              Object.entries(groupEntitiesByType(analysis.entities)).map(
                ([type, entities]) => (
                  <div key={type}>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 capitalize">
                      {getEntityIcon(type)}
                      {type}s ({entities.length})
                    </h3>
                    <div className="space-y-2">
                      {entities.map((entity, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg">
                          <div className="font-medium text-sm">{entity.value}</div>
                          {entity.context && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {entity.context}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No entities extracted
              </p>
            )}
          </TabsContent>

          {/* Legal Issues Tab */}
          <TabsContent value="legal" className="space-y-4">
            {analysis && (
              <>
                {/* Legal Issues */}
                {analysis.legalIssues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Identified Legal Issues</h3>
                    <div className="space-y-2">
                      {analysis.legalIssues.map((issue, idx) => (
                        <Alert key={idx} variant="default">
                          <Scale className="h-4 w-4" />
                          <AlertDescription>{issue}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Assessment */}
                <div className="p-4 border rounded-lg">
                  <h3 className="text-sm font-semibold mb-3">Risk Assessment</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-3 rounded-lg ${getRiskColor(analysis.riskLevel)}`}>
                      {getRiskIcon(analysis.riskLevel)}
                    </div>
                    <div>
                      <div className="font-semibold text-lg capitalize">
                        {analysis.riskLevel} Risk
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Based on document content and legal analysis
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Contract Tab */}
          {contractAnalysis && (
            <TabsContent value="contract" className="space-y-4">
              {/* Overall Risk */}
              <Alert className={getRiskColor(contractAnalysis.overallRisk)}>
                {getRiskIcon(contractAnalysis.overallRisk)}
                <AlertDescription>
                  <strong>Overall Contract Risk: {contractAnalysis.overallRisk.toUpperCase()}</strong>
                </AlertDescription>
              </Alert>

              {/* Clauses */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Contract Clauses</h3>
                <div className="space-y-3">
                  {contractAnalysis.clauses.map((clause, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{clause.type}</h4>
                        <Badge className={getRiskColor(clause.riskLevel)} variant="outline">
                          {clause.riskLevel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {clause.content}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        {clause.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Clauses */}
              {contractAnalysis.missingClauses.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">Missing Important Clauses</div>
                    <ul className="space-y-1">
                      {contractAnalysis.missingClauses.map((clause, idx) => (
                        <li key={idx} className="text-sm">
                          • {clause}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Recommendations */}
              {contractAnalysis.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Recommendations</h3>
                  <ul className="space-y-2">
                    {contractAnalysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
