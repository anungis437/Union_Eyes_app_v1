'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, AlertCircle, Sparkles } from 'lucide-react';
import type { AiAnswer, AiSource } from '@unioneyes/ai';

interface AiSearchPanelProps {
  onSearchComplete?: (answer: AiAnswer) => void;
}

export function AiSearchPanel({ onSearchComplete }: AiSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    employer: '',
    arbitrator: '',
    issue_type: '',
    date_range: {
      start: '',
      end: '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          filters: {
            employer: filters.employer || undefined,
            arbitrator: filters.arbitrator || undefined,
            issue_type: filters.issue_type || undefined,
            date_range:
              filters.date_range.start || filters.date_range.end
                ? {
                    start: filters.date_range.start || undefined,
                    end: filters.date_range.end || undefined,
                  }
                : undefined,
          },
          max_sources: 5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data: AiAnswer = await response.json();
      setAnswer(data);
      
      if (onSearchComplete) {
        onSearchComplete(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <CardTitle>AI Case Search</CardTitle>
            <Badge variant="secondary" className="ml-auto">Beta</Badge>
          </div>
          <CardDescription>
            Search arbitration awards, policies, and past grievances using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Query */}
          <div className="space-y-2">
            <Label htmlFor="query">Search Query</Label>
            <Input
              id="query"
              placeholder="e.g., 'What are precedents for unjust dismissal due to tardiness?'"
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employer">Employer (optional)</Label>
              <Input
                id="employer"
                placeholder="e.g., 'City of Toronto'"
                value={filters.employer}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters({ ...filters, employer: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arbitrator">Arbitrator (optional)</Label>
              <Input
                id="arbitrator"
                placeholder="e.g., 'John Smith'"
                value={filters.arbitrator}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters({ ...filters, arbitrator: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue_type">Issue Type (optional)</Label>
              <Input
                id="issue_type"
                placeholder="e.g., 'Disciplinary'"
                value={filters.issue_type}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters({ ...filters, issue_type: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_range">Date Range (optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.date_range.start}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({
                      ...filters,
                      date_range: { ...filters.date_range, start: e.target.value },
                    })
                  }
                  disabled={loading}
                />
                <Input
                  type="date"
                  value={filters.date_range.end}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({
                      ...filters,
                      date_range: { ...filters.date_range, end: e.target.value },
                    })
                  }
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {answer && (
            <div className="pt-4">
              <AiAnswerCard answer={answer} queryId={null} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface AiAnswerCardProps {
  answer: AiAnswer;
  queryId: string | null;
}

function AiAnswerCard({ answer, queryId }: AiAnswerCardProps) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleFeedback = async (rating: 'good' | 'bad') => {
    if (!queryId) {
      return;
    }

    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query_id: queryId,
          rating,
        }),
      });

      setFeedbackSubmitted(true);
    } catch (_err) {
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={variants[confidence as keyof typeof variants]}>
        {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">AI Response</CardTitle>
          {getConfidenceBadge(answer.confidence)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Answer Text */}
        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap">{answer.answer}</div>
        </div>

        {/* Sources */}
        {answer.sources.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Sources:</h4>
            <div className="space-y-2">
              {answer.sources.map((source: AiSource, idx: number) => (
                <div
                  key={source.chunk_id}
                  className="p-3 bg-muted rounded-md text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="font-medium">
                        [{idx + 1}] {source.title}
                      </div>
                      {source.citation && (
                        <div className="text-xs text-muted-foreground">
                          Citation: {source.citation}
                        </div>
                      )}
                      {showDetails && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {source.snippet}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {Math.round(source.relevance_score * 100)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        )}

        {/* Feedback */}
        {queryId && !feedbackSubmitted && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Was this helpful?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback('good')}
              >
                👍 Yes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback('bad')}
              >
                👎 No
              </Button>
            </div>
          </div>
        )}

        {feedbackSubmitted && (
          <Alert>
            <AlertDescription>
              Thank you for your feedback!
            </AlertDescription>
          </Alert>
        )}

        {/* Disclaimer */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This is an AI-generated response. Always verify with primary sources and consult with experienced representatives before making decisions.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export { AiAnswerCard };
