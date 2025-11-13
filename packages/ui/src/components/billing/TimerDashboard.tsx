/**
 * @fileoverview TimerDashboard - Complete time tracking dashboard
 */

import React, { useState, useEffect } from 'react';
import { Clock, Plus, BarChart3, Calendar, DollarSign } from 'lucide-react';
import { Button } from '../Button';
import { Card } from '../Card';
import { SimpleActiveTimer } from './SimpleActiveTimer';
import { SimpleTimeEntryForm } from './SimpleTimeEntryForm';

// Types
interface TimeEntry {
  id: string;
  description: string;
  duration: number;
  date: Date;
  matterCode: string;
  clientName: string;
  billableRate: number;
  billableAmount: number;
  isBillable: boolean;
}

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

interface Matter {
  code: string;
  description: string;
  clientName: string;
}

interface TimerDashboardProps {
  activeTimer?: TimerData;
  recentEntries?: TimeEntry[];
  matters?: Matter[];
  onStartTimer: (data: { description: string; matterCode: string; billableRate: number }) => Promise<void>;
  onPauseTimer: (timerId: string) => Promise<void>;
  onResumeTimer: (timerId: string) => Promise<void>;
  onStopTimer: (timerId: string) => Promise<void>;
  onAddTimeEntry: (data: {
    description: string;
    minutes: number;
    date: Date;
    matterCode: string;
    billableRate: number;
    isBillable: boolean;
    notes?: string;
  }) => Promise<void>;
}

// Utility functions
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

export function TimerDashboard({
  activeTimer,
  recentEntries = [],
  matters = [],
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  onAddTimeEntry
}: TimerDashboardProps) {
  const [showTimeEntryForm, setShowTimeEntryForm] = useState(false);
  const [todayStats, setTodayStats] = useState({
    totalMinutes: 0,
    billableMinutes: 0,
    totalAmount: 0
  });

  // Calculate today's stats
  useEffect(() => {
    const today = new Date();
    const todayEntries = recentEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.toDateString() === today.toDateString();
    });

    const stats = todayEntries.reduce((acc, entry) => {
      acc.totalMinutes += entry.duration;
      if (entry.isBillable) {
        acc.billableMinutes += entry.duration;
        acc.totalAmount += entry.billableAmount;
      }
      return acc;
    }, { totalMinutes: 0, billableMinutes: 0, totalAmount: 0 });

    // Add active timer to today's stats
    if (activeTimer) {
      stats.totalMinutes += activeTimer.duration;
      if (activeTimer.isRunning) {
        // Estimate current duration
        const now = new Date();
        const startTime = new Date(activeTimer.startTime);
        const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
        stats.totalMinutes += elapsedMinutes;
      }
    }

    setTodayStats(stats);
  }, [recentEntries, activeTimer]);

  const handleAddTimeEntry = async (data: any) => {
    await onAddTimeEntry(data);
    setShowTimeEntryForm(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-600" />
            Time Tracking
          </h1>
          <p className="text-gray-600 mt-1">Track your time and manage billing efficiently</p>
        </div>
        
        <Button
          onClick={() => setShowTimeEntryForm(!showTimeEntryForm)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {showTimeEntryForm ? 'Hide Form' : 'Add Time Entry'}
        </Button>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Time</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(todayStats.totalMinutes)}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Billable Time</p>
              <p className="text-2xl font-bold text-green-600">{formatDuration(todayStats.billableMinutes)}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(todayStats.totalAmount)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Utilization</p>
              <p className="text-2xl font-bold text-blue-600">
                {todayStats.totalMinutes > 0 
                  ? Math.round((todayStats.billableMinutes / todayStats.totalMinutes) * 100)
                  : 0}%
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Active Timer */}
        <div className="space-y-6">
          <SimpleActiveTimer
            timer={activeTimer}
            onStart={onStartTimer}
            onPause={onPauseTimer}
            onResume={onResumeTimer}
            onStop={onStopTimer}
          />

          {showTimeEntryForm && (
            <SimpleTimeEntryForm
              onSubmit={handleAddTimeEntry}
              matters={matters}
            />
          )}
        </div>

        {/* Right Column - Recent Entries */}
        <div>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Time Entries</h3>
            
            {recentEntries.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No time entries yet</p>
                <p className="text-sm">Start tracking your time to see entries here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentEntries.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {entry.description}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{entry.matterCode}</span>
                        <span>•</span>
                        <span>{entry.clientName}</span>
                        <span>•</span>
                        <span>{formatDate(entry.date)}</span>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDuration(entry.duration)}
                      </p>
                      <p className={`text-xs ${entry.isBillable ? 'text-green-600' : 'text-gray-500'}`}>
                        {entry.isBillable ? formatCurrency(entry.billableAmount) : 'Non-billable'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recentEntries.length > 10 && (
              <div className="mt-4 text-center">
                <Button variant="secondary" className="text-sm">
                  View All Entries
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
