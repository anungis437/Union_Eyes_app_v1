import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  Download,
  Loader2,
  Scale,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface Clause {
  type: string;
  content: string;
  riskLevel: 'low' | 'medium' | 'high';
  explanation: string;
}

interface ContractAnalysis {
  clauses: Clause[];
  missingClauses: string[];
  recommendations: string[];
  overallRisk: 'low' | 'medium' | 'high';
  summary?: string;
}

interface ContractAnalyzerProps {
  tenantId: string;
  onAnalysisComplete?: (analysis: ContractAnalysis) => void;
  className?: string;
}

export function ContractAnalyzer({
  tenantId,
  onAnalysisComplete,
  className = '',
}: ContractAnalyzerProps) {
  const [contractText, setContractText] = useState('');
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    if (file.type === 'application/pdf') {
      // In production, send to backend for PDF extraction
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/ai/document/extract-pdf', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Tenant-ID': tenantId,
          },
          body: formData,
        });

        if (response.ok) {
          const { text } = await response.json();
          setContractText(text);
        }
      } catch (error) {
        console.error('PDF extraction failed:', error);
      }
    } else if (file.type === 'text/plain') {
      const text = await file.text();
      setContractText(text);
    }
  };

  const analyzeContract = async () => {
    if (!contractText.trim()) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/analyze/contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({ contractText }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const { analysis: result } = await response.json();
      setAnalysis(result);
      setActiveTab('results');

      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (error) {
      console.error('Contract analysis failed:', error);
      alert('Failed to analyze contract. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />;
      case 'high':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const downloadReport = () => {
    if (!analysis) return;

    const report = `
CONTRACT ANALYSIS REPORT
========================

Overall Risk Level: ${analysis.overallRisk.toUpperCase()}

IDENTIFIED CLAUSES
------------------
${analysis.clauses.map((clause, idx) => `
${idx + 1}. ${clause.type} (Risk: ${clause.riskLevel.toUpperCase()})
   ${clause.content}
   Analysis: ${clause.explanation}
`).join('\n')}

MISSING CLAUSES
---------------
${analysis.missingClauses.map((clause, idx) => `${idx + 1}. ${clause}`).join('\n')}

RECOMMENDATIONS
---------------
${analysis.recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join('\n')}

Generated: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-analysis-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAnalysis = () => {
    setContractText('');
    setAnalysis(null);
    setSelectedFile(null);
    setActiveTab('input');
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Contract Analyzer
          </span>
          {analysis && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={clearAnalysis}>
                Clear
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input">Input Contract</TabsTrigger>
            <TabsTrigger value="results" disabled={!analysis}>
              Analysis Results
            </TabsTrigger>
          </TabsList>

          {/* Input Tab */}
          <TabsContent value="input" className="space-y-4">
            {/* File Upload */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="contract-upload"
              />
              <label
                htmlFor="contract-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <div className="text-sm font-medium mb-1">
                  Upload Contract Document
                </div>
                <div className="text-xs text-muted-foreground">
                  Supports PDF and TXT files
                </div>
                {selectedFile && (
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    {selectedFile.name}
                  </div>
                )}
              </label>
            </div>

            {/* Text Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Or paste contract text:
              </label>
              <Textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                placeholder="Paste your contract text here..."
                className="min-h-[300px] font-mono text-sm"
              />
              <div className="text-xs text-muted-foreground mt-2">
                {contractText.length} characters
              </div>
            </div>

            {/* Analyze Button */}
            <Button
              onClick={analyzeContract}
              disabled={!contractText.trim() || isAnalyzing}
              className="w-full"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Contract...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analyze Contract
                </>
              )}
            </Button>

            {/* Info */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Our AI will analyze the contract for potential risks, missing clauses,
                and provide recommendations. This analysis is for informational purposes
                and should not replace legal counsel.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            {analysis && (
              <>
                {/* Overall Risk */}
                <Alert className={getRiskColor(analysis.overallRisk)}>
                  <div className="flex items-center gap-2">
                    {getRiskIcon(analysis.overallRisk)}
                    <AlertDescription>
                      <strong className="block text-lg mb-1">
                        Overall Risk: {analysis.overallRisk.toUpperCase()}
                      </strong>
                      {analysis.summary && (
                        <span className="text-sm">{analysis.summary}</span>
                      )}
                    </AlertDescription>
                  </div>
                </Alert>

                {/* Clauses Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Identified Clauses ({analysis.clauses.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.clauses.map((clause, idx) => (
                      <div key={idx} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold">{clause.type}</h4>
                          <Badge className={getRiskColor(clause.riskLevel)}>
                            {getRiskIcon(clause.riskLevel)}
                            <span className="ml-1">{clause.riskLevel}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground italic">
                          &quot;{clause.content}&quot;
                        </p>
                        <p className="text-sm">{clause.explanation}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Missing Clauses */}
                {analysis.missingClauses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Missing Important Clauses ({analysis.missingClauses.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.missingClauses.map((clause, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-orange-500 flex-shrink-0 mt-1">•</span>
                            <span className="text-sm">{clause}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {analysis.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Recommendations ({analysis.recommendations.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500 flex-shrink-0 mt-1">
                              {idx + 1}.
                            </span>
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Risk Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Risk Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {['low', 'medium', 'high'].map((level) => {
                      const count = analysis.clauses.filter(
                        (c) => c.riskLevel === level
                      ).length;
                      const percentage = (count / analysis.clauses.length) * 100;

                      return (
                        <div key={level}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{level} Risk Clauses</span>
                            <span className="text-muted-foreground">
                              {count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
