'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NLQueryInterfaceProps {
  className?: string;
}

interface QueryResult {
  answer: string;
  data?: any;
  sql?: string;
  confidence: number;
  sources: string[];
  suggestions?: string[];
}

/**
 * Natural Language Query Interface
 * Allows users to query data using plain English
 * 
 * Examples:
 * - "Show me top 5 stewards by resolution rate"
 * - "How many claims are overdue?"
 * - "What's our win rate this quarter?"
 */
export function NLQueryInterface({ className = '' }: NLQueryInterfaceProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ query: string; result: QueryResult }>>([]);

  const exampleQueries = [
    'Show me top 5 stewards by win rate this month',
    'How many overdue deadlines do we have?',
    'What is our average resolution time?',
    'Which employer has the most claims?',
    'Compare this quarter with last quarter',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ml/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });

      if (!response.ok) {
        throw new Error('Query failed');
      }

      const data = await response.json();
      setResult(data);
      setHistory([{ query, result: data }, ...history.slice(0, 4)]);
      setQuery('');
    } catch (err) {
      setError('Failed to process query. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Ask Anything</CardTitle>
          </div>
          <CardDescription>
            Query your data using natural language. No SQL knowledge required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Show me top stewards by win rate this month"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !query.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Example Queries */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Examples:</span>
              {exampleQueries.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExampleClick(example)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {example}
                </Button>
              ))}
            </div>
          </form>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Result Display */}
          {result && (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">Answer</h4>
                  <Badge variant="secondary">
                    {Math.round(result.confidence * 100)}% confident
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed">{result.answer}</p>
                
                {result.sources && result.sources.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Sources:</span>
                    {result.sources.map((source, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Data Table */}
              {result.data && Array.isArray(result.data) && result.data.length > 0 && (
                <div className="rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {Object.keys(result.data[0]).map((key) => (
                            <th key={key} className="px-4 py-2 text-left font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.slice(0, 10).map((row: any, i: number) => (
                          <tr key={i} className="border-t">
                            {Object.values(row).map((value: any, j: number) => (
                              <td key={j} className="px-4 py-2">
                                {typeof value === 'number' 
                                  ? value.toLocaleString() 
                                  : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {result.data.length > 10 && (
                    <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30">
                      Showing 10 of {result.data.length} results
                    </div>
                  )}
                </div>
              )}

              {/* SQL Query (for transparency) */}
              {result.sql && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View generated SQL
                  </summary>
                  <pre className="mt-2 p-3 rounded bg-muted overflow-x-auto">
                    <code>{result.sql}</code>
                  </pre>
                </details>
              )}

              {/* Follow-up Suggestions */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>Follow-up questions:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Query History */}
          {history.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Recent Queries</h4>
              <div className="space-y-2">
                {history.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(item.query)}
                    className="w-full text-left text-sm p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="font-medium">{item.query}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {item.result.answer}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
