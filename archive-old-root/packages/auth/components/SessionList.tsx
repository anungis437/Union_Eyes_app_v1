/**
 * Session List Component
 * 
 * List of all sessions with filtering and sorting
 */

import React, { useState } from 'react';
import { SessionInfo } from '../services/sessionManagement';
import { SessionCard } from './SessionCard';

interface SessionListProps {
  sessions: SessionInfo[];
  currentSessionId?: string;
  onTerminateSession?: (sessionId: string) => void;
  onTerminateOthers?: () => void;
  isLoading?: boolean;
  showTerminateButtons?: boolean;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  currentSessionId,
  onTerminateSession,
  onTerminateOthers,
  isLoading = false,
  showTerminateButtons = true,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'terminated'>('active');
  const [sortBy, setSortBy] = useState<'lastActive' | 'created'>('lastActive');

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    if (filter === 'active') return session.isActive;
    if (filter === 'terminated') return !session.isActive;
    return true;
  });

  // Sort sessions
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    if (sortBy === 'lastActive') {
      const aTime = a.lastActivityAt?.getTime() || 0;
      const bTime = b.lastActivityAt?.getTime() || 0;
      return bTime - aTime;
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Separate current session
  const currentSession = sortedSessions.find(s => s.id === currentSessionId);
  const otherSessions = sortedSessions.filter(s => s.id !== currentSessionId);
  
  const activeCount = sessions.filter(s => s.isActive).length;
  const otherActiveCount = otherSessions.filter(s => s.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Stats */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Active Session{activeCount !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="h-12 w-px bg-gray-200 dark:bg-gray-700"></div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {sessions.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Session{sessions.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Filter sessions"
            >
              <option value="active">Active Only</option>
              <option value="all">All Sessions</option>
              <option value="terminated">Terminated Only</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Sort sessions"
            >
              <option value="lastActive">Last Active</option>
              <option value="created">Recently Created</option>
            </select>

            {/* Terminate Others Button */}
            {showTerminateButtons && otherActiveCount > 0 && onTerminateOthers && (
              <button
                onClick={() => {
                  if (window.confirm(`Sign out ${otherActiveCount} other session${otherActiveCount !== 1 ? 's' : ''}?`)) {
                    onTerminateOthers();
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md transition-colors whitespace-nowrap"
              >
                Sign Out Other Devices ({otherActiveCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {sortedSessions.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-4xl mb-2">🔒</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            No Sessions Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'active' && 'No active sessions to display.'}
            {filter === 'terminated' && 'No terminated sessions found.'}
            {filter === 'all' && 'No sessions found.'}
          </p>
        </div>
      )}

      {/* Current Session */}
      {currentSession && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Current Session
          </h3>
          <SessionCard
            session={currentSession}
            isCurrent={true}
            showTerminateButton={false}
          />
        </div>
      )}

      {/* Other Sessions */}
      {otherSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Other Sessions
          </h3>
          <div className="space-y-3">
            {otherSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                isCurrent={false}
                onTerminate={onTerminateSession}
                showTerminateButton={showTerminateButtons}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
