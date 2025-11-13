/**
 * SessionManagementDashboard Component
 * 
 * Full dashboard page for managing user sessions
 */

import React, { useState, useEffect } from 'react';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { SessionList } from './SessionList';

interface SessionManagementDashboardProps {
  userId?: string;
  showAllUsers?: boolean; // For super admins to view all sessions
}

export function SessionManagementDashboard({
  userId,
  showAllUsers = false,
}: SessionManagementDashboardProps) {
  const {
    sessions,
    currentSession,
    isLoading,
    error,
    terminateSession,
    terminateOtherSessions,
    refresh,
  } = useSessionManagement({ userId });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refresh();
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  const handleRefresh = async () => {
    await refresh();
    setLastRefresh(new Date());
  };

  const handleTerminateSession = async (sessionId: string) => {
    const success = await terminateSession(sessionId);
    if (success) {
      await refresh();
    }
    return success;
  };

  const handleTerminateOthers = async () => {
    const success = await terminateOtherSessions();
    if (success) {
      await refresh();
    }
    return success;
  };

  // Calculate stats
  const activeSessions = sessions.filter(s => s.isActive);
  const uniqueDevices = new Set(sessions.map(s => s.deviceType)).size;
  const uniqueLocations = new Set(
    sessions.map(s => s.city && s.country ? `${s.city}, ${s.country}` : 'Unknown')
  ).size;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Session Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage and monitor your active sessions across all devices
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error.message}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Sessions
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {activeSessions.length}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <span className="text-2xl">🟢</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Unique Devices
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {uniqueDevices}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <span className="text-2xl">💻</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Locations
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {uniqueLocations}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <span className="text-2xl">🌍</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
              Refresh
            </button>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="auto-refresh"
                className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Auto-refresh (30s)
              </label>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Session List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <SessionList
          sessions={sessions}
          currentSessionId={currentSession?.id}
          onTerminateSession={handleTerminateSession}
          onTerminateOthers={handleTerminateOthers}
          isLoading={isLoading}
          showTerminateButtons={true}
        />
      </div>

      {/* Security Tips */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          🔒 Security Tips
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li className="flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>
              Regularly review your active sessions and terminate any you don't recognize
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>
              Always sign out when using shared or public computers
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>
              If you see suspicious activity, change your password immediately
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>
              Enable two-factor authentication for additional security (coming soon)
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
