/**
 * @fileoverview SimpleActiveTimer - Streamlined timer component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Clock, DollarSign, FileText } from 'lucide-react';
import { Button } from '../Button';
import { Card } from '../Card';

// Simple utility functions
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
};

interface TimerData {
  id: string;
  description: string;
  startTime: Date;
  duration: number;
  billableRate: number;
  matterCode: string;
  clientName: string;
  isRunning: boolean;
}

interface SimpleActiveTimerProps {
  timer?: TimerData;
  onStart: (data: { description: string; matterCode: string; billableRate: number }) => Promise<void>;
  onPause: (timerId: string) => Promise<void>;
  onResume: (timerId: string) => Promise<void>;
  onStop: (timerId: string) => Promise<void>;
  className?: string;
}

export function SimpleActiveTimer({
  timer,
  onStart,
  onPause,
  onResume,
  onStop,
  className = ''
}: SimpleActiveTimerProps) {
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

  const billableAmount = timer ? (currentDuration / 60) * timer.billableRate : 0;

  if (!timer) {
    return (
      <Card className={`w-full p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No Active Timer</p>
          <p className="text-sm">Start a new timer to track your time</p>
        </div>
      </Card>
    );
  }

  const borderColor = timer.isRunning ? 'border-l-green-500' : 'border-l-yellow-500';
  const iconColor = timer.isRunning ? 'text-green-500' : 'text-yellow-500';
  const timerColor = timer.isRunning ? 'text-green-600' : 'text-yellow-600';
  const statusBadgeClass = timer.isRunning ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

  return (
    <Card className={`w-full border-l-4 ${borderColor} ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className={`h-5 w-5 ${iconColor} ${timer.isRunning ? 'animate-pulse' : ''}`} />
            Active Timer
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusBadgeClass}`}>
            {timer.isRunning ? 'Running' : 'Paused'}
          </span>
        </div>

        {/* Timer Display */}
        <div className="text-center mb-6">
          <div className={`text-4xl font-mono font-bold tracking-wider ${timerColor}`}>
            {formatDuration(currentDuration)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Started at {new Date(timer.startTime).toLocaleTimeString()}
          </div>
        </div>

        {/* Timer Details */}
        <div className="space-y-4 border-t pt-4 mb-6">
          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{timer.description}</p>
              <p className="text-xs text-gray-500">
                {timer.matterCode} • {timer.clientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-gray-500">
                Rate: {formatCurrency(timer.billableRate)}/hr
              </span>
              <span className="font-medium text-sm">
                Amount: {formatCurrency(billableAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex gap-2 mb-4">
          {timer.isRunning ? (
            <Button
              onClick={handlePause}
              disabled={isLoading}
              variant="secondary"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          ) : (
            <Button
              onClick={handleResume}
              disabled={isLoading}
              variant="primary"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Play className="h-4 w-4" />
              Resume
            </Button>
          )}
          
          <Button
            onClick={handleStop}
            disabled={isLoading}
            variant="danger"
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 text-xs">
          <button className="px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
            Add Note
          </button>
          <button className="px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
            Change Rate
          </button>
          <button className="px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
            Mark Non-Billable
          </button>
        </div>
      </div>
    </Card>
  );
}
