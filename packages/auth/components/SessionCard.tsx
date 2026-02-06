/**
 * Session Card Component
 * 
 * Displays individual session with device info, location, and actions
 */

import React from 'react';
import { SessionInfo } from '../services/sessionManagement';

interface SessionCardProps {
  session: SessionInfo;
  isCurrent?: boolean;
  onTerminate?: (sessionId: string) => void;
  showTerminateButton?: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  isCurrent = false,
  onTerminate,
  showTerminateButton = true,
}) => {
  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      case 'desktop':
        return '💻';
      default:
        return '🖥️';
    }
  };

  const getBrowserIcon = (browser?: string) => {
    switch (browser?.toLowerCase()) {
      case 'chrome':
        return '🌐';
      case 'firefox':
        return '🦊';
      case 'safari':
        return '🧭';
      case 'edge':
        return '🌊';
      default:
        return '🌐';
    }
  };

  const formatLastActive = (date?: Date) => {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleTerminate = () => {
    if (onTerminate && window.confirm('Are you sure you want to sign out this session?')) {
      onTerminate(session.id);
    }
  };

  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm
      ${isCurrent ? 'border-blue-500 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'}
      ${!session.isActive ? 'opacity-60' : ''}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{getDeviceIcon(session.deviceType)}</div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {session.deviceName || `${session.deviceType || 'Unknown'} Device`}
              {isCurrent && (
                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">
                  Current
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>{getBrowserIcon(session.browser)}</span>
              <span>{session.browser || 'Unknown Browser'}</span>
              {session.os && (
                <>
                  <span>•</span>
                  <span>{session.os}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {session.isActive ? (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Active
            </span>
          ) : (
            <span className="inline-flex items-center text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
              Terminated
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        {/* Location */}
        {(session.city || session.country) && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span>📍</span>
            <span>
              {[session.city, session.country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}

        {/* IP Address */}
        {session.ipAddress && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span>🌐</span>
            <span className="font-mono text-xs">{session.ipAddress}</span>
          </div>
        )}

        {/* Last Active */}
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <span>⏱️</span>
          <span>Last active {formatLastActive(session.lastActivityAt)}</span>
        </div>

        {/* Created */}
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <span>📅</span>
          <span>
            Signed in {new Date(session.createdAt).toLocaleDateString()} at{' '}
            {new Date(session.createdAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      {showTerminateButton && session.isActive && !isCurrent && onTerminate && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleTerminate}
            className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md transition-colors"
          >
            Sign Out This Session
          </button>
        </div>
      )}
    </div>
  );
};
