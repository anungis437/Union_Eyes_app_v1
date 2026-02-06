import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Lightbulb, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  sources?: string[];
  data?: any;
  sql?: string;
}

interface AIQueryResponse {
  answer: string;
  confidence: number;
  sources?: string[];
  data?: any;
  sql?: string;
}

interface ChatInterfaceProps {
  tenantId: string;
  context?: Record<string, any>;
  onQueryResult?: (result: AIQueryResponse) => void;
  className?: string;
}

export function ChatInterface({
  tenantId,
  context,
  onQueryResult,
  className = '',
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI assistant. Ask me anything about your claims, members, or union activities. I can analyze data, generate reports, and provide insights.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendQuery = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Call AI service
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          question,
          tenantId,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      const { result } = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        confidence: result.confidence,
        sources: result.sources,
        data: result.data,
        sql: result.sql,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Notify parent component
      if (onQueryResult) {
        onQueryResult(result);
      }

      // Get suggested follow-up questions
      fetchSuggestedQuestions(question, result.answer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query failed';
      setError(errorMessage);

      const errorResponse: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const fetchSuggestedQuestions = async (question: string, answer: string) => {
    try {
      const response = await fetch('/api/ai/query/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({ question, answer }),
      });

      if (response.ok) {
        const { suggestions } = await response.json();
        setSuggestedQuestions(suggestions);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery(input);
    }
  };

  const formatSources = (sources: string[]) => {
    return sources.map((source, idx) => (
      <Badge key={idx} variant="outline" className="mr-1">
        {source}
      </Badge>
    ));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Messages */}
        <ScrollArea className="h-[500px] pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>

                  {message.confidence !== undefined && (
                    <div className="mt-2 flex items-center gap-2 text-xs opacity-75">
                      <span>Confidence: {(message.confidence * 100).toFixed(0)}%</span>
                    </div>
                  )}

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs opacity-75 mb-1">Sources:</div>
                      <div className="flex flex-wrap gap-1">
                        {formatSources(message.sources)}
                      </div>
                    </div>
                  )}

                  {message.sql && (
                    <details className="mt-2">
                      <summary className="text-xs opacity-75 cursor-pointer">
                        View SQL Query
                      </summary>
                      <pre className="mt-1 text-xs bg-black/10 p-2 rounded overflow-x-auto">
                        {message.sql}
                      </pre>
                    </details>
                  )}

                  <div className="mt-2 text-xs opacity-50">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Suggested Questions */}
        {suggestedQuestions.length > 0 && !isLoading && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Suggested Questions:
            </div>
            <div className="space-y-2">
              {suggestedQuestions.map((question, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 px-3"
                  onClick={() => handleSuggestedQuestion(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your claims, members, or analytics..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Quick Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput('How many claims were filed last month?')}
          >
            Claims Count
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput('Show me the most common types of grievances')}
          >
            Top Grievances
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput('What is the average resolution time?')}
          >
            Avg Resolution
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput('Generate a summary report for last quarter')}
          >
            Quarterly Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
