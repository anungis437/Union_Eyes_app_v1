/**
 * @fileoverview ActiveTimer - Real-time timer component with world-class UX
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Clock, DollarSign, FileText } from 'lucide-react';
import { Button } from '../Button';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';
import { Badge } from '../Badge';
import { cn } from '../../utils/cn';

// Utility functions (temporarily inline until billing package is properly imported)
function calculateBillableAmount(minutes: number, hourlyRate: number): number {
  const hours = minutes / 60;
  return hours * hourlyRate;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
}

function formatDuration(minutes: number, format: 'short' | 'long' = 'short'): string {
  if (minutes < 60) {
    return format === 'short' ? `${minutes}m` : `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    const hourText = format === 'short' ? `${hours}h` : `${hours} hour${hours !== 1 ? 's' : ''}`;
    return hourText;
  }
  
  if (format === 'short') {
    return `${hours}h ${remainingMinutes}m`;
  }
  
  const hourText = `${hours} hour${hours !== 1 ? 's' : ''}`;
  const minuteText = `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  return `${hourText} ${minuteText}`;
}

interface ActiveTimerProps {
  timer?: {
    id: string;
    description: string;
    startTime: Date;
    duration: number;
    billableRate: number;
    matterCode: string;
    clientName: string;
    isRunning: boolean;
  };
  onStart: (data: { description: string; matterCode: string; billableRate: number }) => Promise<void>;
  onPause: (timerId: string) => Promise<void>;
  onResume: (timerId: string) => Promise<void>;
  onStop: (timerId: string) => Promise<void>;
  className?: string;
}

export function ActiveTimer({
  timer,
  onStart,
  onPause,
  onResume,
  onStop,
  className
}: ActiveTimerProps) {
  const [currentDuration, setCurrentDuration] = useState(timer?.duration || 0);
  const [isLoading, setIsLoading] = useState(false);

  // Update duration in real-time when timer is running
  useEffect(() => {
    if (!timer?.isRunning) return;

    const interval = setInterval(() => {
      const now = new Date();
      const startTime = new Date(timer.startTime);
      const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
      setCurrentDuration(timer.duration + elapsedMinutes);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer?.isRunning, timer?.startTime, timer?.duration]);

  // Update duration when timer prop changes
  useEffect(() => {
    if (timer) {
      setCurrentDuration(timer.duration);
    }
  }, [timer?.duration]);

  const handlePause = useCallback(async () => {
    if (!timer) return;
    setIsLoading(true);
    try {
      await onPause(timer.id);
    } finally {
      setIsLoading(false);
    }
  }, [timer, onPause]);

  const handleResume = useCallback(async () => {
    if (!timer) return;
    setIsLoading(true);
    try {
      await onResume(timer.id);
    } finally {
      setIsLoading(false);
    }
  }, [timer, onResume]);

  const handleStop = useCallback(async () => {
    if (!timer) return;
    setIsLoading(true);
    try {
      await onStop(timer.id);
    } finally {
      setIsLoading(false);
    }
  }, [timer, onStop]);

  const billableAmount = timer ? calculateBillableAmount(currentDuration, timer.billableRate) : 0;

  if (!timer) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No Active Timer</p>
            <p className="text-sm">Start a new timer to track your time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full border-l-4", timer.isRunning ? "border-l-green-500" : "border-l-yellow-500", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className={cn("h-5 w-5", timer.isRunning ? "text-green-500 animate-pulse" : "text-yellow-500")} />
            Active Timer
          </CardTitle>
          <Badge variant={timer.isRunning ? "default" : "secondary"} className="capitalize">
            {timer.isRunning ? "Running" : "Paused"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className={cn(
            "text-4xl font-mono font-bold tracking-wider",
            timer.isRunning ? "text-green-600" : "text-yellow-600"
          )}>
            {formatDuration(currentDuration, 'long')}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Started at {new Date(timer.startTime).toLocaleTimeString()}
          </div>
        </div>

        {/* Timer Details */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{timer.description}</p>
              <p className="text-xs text-muted-foreground">
                {timer.matterCode} • {timer.clientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                Rate: {formatCurrency(timer.billableRate)}/hr
              </span>
              <span className="font-medium text-sm">
                Amount: {formatCurrency(billableAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex gap-2 pt-2">
          {timer.isRunning ? (
            <Button
              onClick={handlePause}
              disabled={isLoading}
              variant="secondary"
              size="sm"
              className="flex-1"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          ) : (
            <Button
              onClick={handleResume}
              disabled={isLoading}
              variant="primary"
              size="sm"
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
          
          <Button
            onClick={handleStop}
            disabled={isLoading}
            variant="danger"
            size="sm"
            className="flex-1"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 text-xs">
          <Button variant="secondary" size="sm" className="h-8 text-xs">
            Add Note
          </Button>
          <Button variant="secondary" size="sm" className="h-8 text-xs">
            Change Rate
          </Button>
          <Button variant="secondary" size="sm" className="h-8 text-xs">
            Mark Non-Billable
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
