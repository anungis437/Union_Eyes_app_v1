import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Calculator, TrendingUp, Info, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SettlementEstimate {
  min: number;
  max: number;
  mostLikely: number;
  confidence: number;
  factors: string[];
}

interface ClaimData {
  claimType: string;
  severity: number; // 1-10
  jurisdiction: string;
  memberTenure: number; // years
  medicalCosts?: number;
  lostWages?: number;
  additionalFactors?: string[];
}

interface SettlementCalculatorProps {
  tenantId: string;
  initialData?: Partial<ClaimData>;
  onCalculate?: (estimate: SettlementEstimate) => void;
  className?: string;
}

export function SettlementCalculator({
  tenantId,
  initialData,
  onCalculate,
  className = '',
}: SettlementCalculatorProps) {
  const [claimData, setClaimData] = useState<ClaimData>({
    claimType: initialData?.claimType || '',
    severity: initialData?.severity || 5,
    jurisdiction: initialData?.jurisdiction || '',
    memberTenure: initialData?.memberTenure || 1,
    medicalCosts: initialData?.medicalCosts || 0,
    lostWages: initialData?.lostWages || 0,
    additionalFactors: initialData?.additionalFactors || [],
  });

  const [estimate, setEstimate] = useState<SettlementEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [historicalAverage, setHistoricalAverage] = useState<number | null>(null);

  const calculateSettlement = useCallback(async () => {
    if (!claimData.claimType || !claimData.jurisdiction) {
      return;
    }

    setIsCalculating(true);
    try {
      const response = await fetch('/api/ai/predict/settlement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify(claimData),
      });

      if (!response.ok) {
        throw new Error('Calculation failed');
      }

      const { prediction } = await response.json();
      setEstimate(prediction);

      // Fetch historical average for comparison
      fetchHistoricalAverage();

      if (onCalculate) {
        onCalculate(prediction);
      }
    } catch (error) {
      console.error('Settlement calculation failed:', error);
      alert('Failed to calculate settlement. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  }, [claimData, tenantId, onCalculate]);

  useEffect(() => {
    // Auto-calculate when significant fields change
    if (claimData.claimType && claimData.jurisdiction) {
      const debounceTimeout = setTimeout(() => {
        calculateSettlement();
      }, 1000);

      return () => clearTimeout(debounceTimeout);
    }
  }, [claimData, calculateSettlement]);

  const fetchHistoricalAverage = async () => {
    try {
      const response = await fetch(
        `/api/claims/historical-settlements?type=${claimData.claimType}&jurisdiction=${claimData.jurisdiction}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (response.ok) {
        const { average } = await response.json();
        setHistoricalAverage(average);
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const updateClaimData = (field: keyof ClaimData, value: any) => {
    setClaimData((prev) => ({ ...prev, [field]: value }));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          AI Settlement Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Claim Type */}
          <div className="space-y-2">
            <Label htmlFor="claim-type">Claim Type</Label>
            <Select
              value={claimData.claimType}
              onValueChange={(value) => updateClaimData('claimType', value)}
            >
              <SelectTrigger id="claim-type">
                <SelectValue placeholder="Select claim type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workers-compensation">Workers Compensation</SelectItem>
                <SelectItem value="wrongful-termination">Wrongful Termination</SelectItem>
                <SelectItem value="discrimination">Discrimination</SelectItem>
                <SelectItem value="wage-dispute">Wage Dispute</SelectItem>
                <SelectItem value="safety-violation">Safety Violation</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Jurisdiction */}
          <div className="space-y-2">
            <Label htmlFor="jurisdiction">Jurisdiction</Label>
            <Select
              value={claimData.jurisdiction}
              onValueChange={(value) => updateClaimData('jurisdiction', value)}
            >
              <SelectTrigger id="jurisdiction">
                <SelectValue placeholder="Select jurisdiction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CA">California</SelectItem>
                <SelectItem value="NY">New York</SelectItem>
                <SelectItem value="TX">Texas</SelectItem>
                <SelectItem value="FL">Florida</SelectItem>
                <SelectItem value="IL">Illinois</SelectItem>
                <SelectItem value="PA">Pennsylvania</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Medical Costs */}
          <div className="space-y-2">
            <Label htmlFor="medical-costs">Medical Costs ($)</Label>
            <Input
              id="medical-costs"
              type="number"
              value={claimData.medicalCosts || ''}
              onChange={(e) =>
                updateClaimData('medicalCosts', parseFloat(e.target.value) || 0)
              }
              placeholder="0"
            />
          </div>

          {/* Lost Wages */}
          <div className="space-y-2">
            <Label htmlFor="lost-wages">Lost Wages ($)</Label>
            <Input
              id="lost-wages"
              type="number"
              value={claimData.lostWages || ''}
              onChange={(e) =>
                updateClaimData('lostWages', parseFloat(e.target.value) || 0)
              }
              placeholder="0"
            />
          </div>

          {/* Member Tenure */}
          <div className="space-y-2">
            <Label htmlFor="tenure">Member Tenure (years)</Label>
            <Input
              id="tenure"
              type="number"
              value={claimData.memberTenure}
              onChange={(e) =>
                updateClaimData('memberTenure', parseFloat(e.target.value) || 1)
              }
              min="0"
              step="0.1"
            />
          </div>
        </div>

        {/* Severity Slider */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="severity">Claim Severity</Label>
            <span className="text-sm font-medium">{claimData.severity}/10</span>
          </div>
          <Slider
            id="severity"
            value={[claimData.severity]}
            onValueChange={(value) => updateClaimData('severity', value[0])}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Minor</span>
            <span>Moderate</span>
            <span>Severe</span>
          </div>
        </div>

        {/* Calculate Button */}
        <Button
          onClick={calculateSettlement}
          disabled={
            !claimData.claimType || !claimData.jurisdiction || isCalculating
          }
          className="w-full"
          size="lg"
        >
          {isCalculating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              Calculate Settlement
            </>
          )}
        </Button>

        {/* Results */}
        {estimate && (
          <div className="space-y-4 pt-4 border-t">
            {/* Primary Estimate */}
            <div className="bg-primary/5 border-2 border-primary rounded-lg p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="h-6 w-6 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Most Likely Settlement
                </span>
              </div>
              <div className="text-4xl font-bold mb-2">
                {formatCurrency(estimate.mostLikely)}
              </div>
              <div className={`text-sm font-medium ${getConfidenceColor(estimate.confidence)}`}>
                {(estimate.confidence * 100).toFixed(0)}% Confidence
              </div>
            </div>

            {/* Range */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Minimum</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(estimate.min)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Maximum</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(estimate.max)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visual Range */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Settlement Range</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComparison(!showComparison)}
                  className="h-auto p-0 text-xs"
                >
                  {showComparison ? 'Hide' : 'Show'} Comparison
                </Button>
              </div>
              <div className="relative h-12 bg-gradient-to-r from-red-100 via-yellow-100 to-green-100 rounded-lg">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg border-2 border-white"
                  style={{
                    left: `${((estimate.mostLikely - estimate.min) /
                      (estimate.max - estimate.min)) *
                      100}%`,
                  }}
                />
                {showComparison && historicalAverage && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-600 rounded-full shadow-lg border-2 border-white"
                    style={{
                      left: `${((historicalAverage - estimate.min) /
                        (estimate.max - estimate.min)) *
                        100}%`,
                    }}
                  />
                )}
              </div>
              <div className="flex justify-between text-xs">
                <span>{formatCurrency(estimate.min)}</span>
                <span>{formatCurrency(estimate.max)}</span>
              </div>
              {showComparison && historicalAverage && (
                <div className="flex items-center justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-primary rounded-full" />
                    <span>AI Estimate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-600 rounded-full" />
                    <span>Historical Avg: {formatCurrency(historicalAverage)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Contributing Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Contributing Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {estimate.factors.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary flex-shrink-0">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This estimate is based on AI analysis of historical data and should be
                used as a guide. Actual settlement values may vary based on specific
                circumstances, negotiations, and legal proceedings.
              </AlertDescription>
            </Alert>

            {/* What-If Scenarios */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Try Different Scenarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => updateClaimData('severity', Math.min(10, claimData.severity + 2))}
                >
                  + Increase Severity
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() =>
                    updateClaimData('medicalCosts', (claimData.medicalCosts || 0) + 5000)
                  }
                >
                  + Add $5,000 Medical Costs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() =>
                    updateClaimData('lostWages', (claimData.lostWages || 0) + 10000)
                  }
                >
                  + Add $10,000 Lost Wages
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
