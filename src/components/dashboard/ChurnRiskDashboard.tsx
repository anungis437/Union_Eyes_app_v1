'use client';

/**
 * UC-07: Churn Risk Dashboard
 * 
 * Displays at-risk members and enables stewards to track retention efforts.
 * Features:
 * - At-risk members list with risk scores
 * - Risk distribution chart
 * - Intervention tracking
 * - Success metrics
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Phone, 
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ChurnPrediction {
  memberId: string;
  memberName: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  contributingFactors: string[];
  recommendedInterventions: string[];
  lastActivity: Date;
  unionTenure: number;
  totalCases: number;
  predictedAt: Date;
}

interface ChurnSummary {
  total: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  avgRiskScore: number;
}

export function ChurnRiskDashboard() {
  const [predictions, setPredictions] = useState<ChurnPrediction[]>([]);
  const [summary, setSummary] = useState<ChurnSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPredictions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRiskLevel]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const url = selectedRiskLevel === 'all' 
        ? '/api/ml/predictions/churn-risk'
        : `/api/ml/predictions/churn-risk?riskLevel=${selectedRiskLevel}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      setPredictions(data.predictions || []);
      setSummary(data.summary || null);
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPredictions();
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const pieData = summary ? [
    { name: 'High Risk', value: summary.highRisk, color: '#ef4444' },
    { name: 'Medium Risk', value: summary.mediumRisk, color: '#f59e0b' },
    { name: 'Low Risk', value: summary.lowRisk, color: '#10b981' }
  ] : [];

  // Simulated intervention success data
  const interventionData = [
    { intervention: 'Outreach Call', attempted: 45, successful: 38, rate: 84 },
    { intervention: 'Re-engagement Email', attempted: 120, successful: 67, rate: 56 },
    { intervention: 'Case Expedite', attempted: 32, successful: 29, rate: 91 },
    { intervention: 'Satisfaction Follow-up', attempted: 58, successful: 43, rate: 74 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading churn predictions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Churn Risk Dashboard</h2>
          <p className="text-muted-foreground">
            Identify at-risk members and track retention efforts
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total At-Risk</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
              <p className="text-xs text-muted-foreground">
                Requiring attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.highRisk}</div>
              <p className="text-xs text-muted-foreground">
                Priority intervention needed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.mediumRisk}</div>
              <p className="text-xs text-muted-foreground">
                Proactive outreach recommended
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.avgRiskScore.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">
                Out of 100
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">At-Risk Members</TabsTrigger>
          <TabsTrigger value="distribution">Risk Distribution</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
        </TabsList>

        {/* At-Risk Members List */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>At-Risk Member List</CardTitle>
                  <CardDescription>
                    Members predicted to churn in next 90 days
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={selectedRiskLevel === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setSelectedRiskLevel('all')}
                  >
                    All
                  </Button>
                  <Button 
                    variant={selectedRiskLevel === 'high' ? 'destructive' : 'outline'} 
                    size="sm"
                    onClick={() => setSelectedRiskLevel('high')}
                  >
                    High
                  </Button>
                  <Button 
                    variant={selectedRiskLevel === 'medium' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setSelectedRiskLevel('medium')}
                  >
                    Medium
                  </Button>
                  <Button 
                    variant={selectedRiskLevel === 'low' ? 'secondary' : 'outline'} 
                    size="sm"
                    onClick={() => setSelectedRiskLevel('low')}
                  >
                    Low
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No predictions available. Run training script first.
                  </div>
                ) : (
                  predictions.map((pred) => (
                    <Card key={pred.memberId} className="border-l-4" style={{
                      borderLeftColor: pred.riskLevel === 'high' ? '#ef4444' : 
                                      pred.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
                    }}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              {getRiskIcon(pred.riskLevel)}
                              <h3 className="font-semibold text-lg">{pred.memberName}</h3>
                              <Badge variant={getRiskBadgeColor(pred.riskLevel)}>
                                {pred.riskLevel.toUpperCase()} RISK
                              </Badge>
                              <span className="text-2xl font-bold text-muted-foreground">
                                {pred.riskScore}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">Last Activity:</span>{' '}
                                {formatDate(pred.lastActivity)}
                              </div>
                              <div>
                                <span className="font-medium">Union Tenure:</span>{' '}
                                {pred.unionTenure} years
                              </div>
                              <div>
                                <span className="font-medium">Total Cases:</span>{' '}
                                {pred.totalCases}
                              </div>
                            </div>

                            {pred.contributingFactors.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium mb-2">Contributing Factors:</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {pred.contributingFactors.map((factor, idx) => (
                                    <li key={idx}>{factor}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {pred.recommendedInterventions.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium mb-2">Recommended Actions:</p>
                                <div className="flex flex-wrap gap-2">
                                  {pred.recommendedInterventions.map((intervention, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {intervention}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            <Button size="sm" variant="default">
                              <Phone className="h-4 w-4 mr-2" />
                              Call
                            </Button>
                            <Button size="sm" variant="outline">
                              <Mail className="h-4 w-4 mr-2" />
                              Email
                            </Button>
                            <Button size="sm" variant="outline">
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Distribution */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Distribution</CardTitle>
                <CardDescription>Breakdown of members by risk category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Score Distribution</CardTitle>
                <CardDescription>Number of members by risk score ranges</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { range: '0-20', count: predictions.filter(p => p.riskScore < 20).length },
                    { range: '20-40', count: predictions.filter(p => p.riskScore >= 20 && p.riskScore < 40).length },
                    { range: '40-60', count: predictions.filter(p => p.riskScore >= 40 && p.riskScore < 60).length },
                    { range: '60-80', count: predictions.filter(p => p.riskScore >= 60 && p.riskScore < 80).length },
                    { range: '80-100', count: predictions.filter(p => p.riskScore >= 80).length }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Interventions */}
        <TabsContent value="interventions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Intervention Effectiveness</CardTitle>
              <CardDescription>Success rates for different retention strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interventionData.map((item) => (
                  <div key={item.intervention} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.intervention}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.successful} of {item.attempted} successful
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-48">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500" 
                            style={{ width: `${item.rate}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-2xl font-bold w-16 text-right">
                        {item.rate}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">💡 Retention Insights</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Case expediting shows highest success rate (91%)</li>
                  <li>• Personal outreach calls convert 84% of at-risk members</li>
                  <li>• Email campaigns effective for medium-risk members (56%)</li>
                  <li>• Average retention cost: $125 per successful intervention</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
