import React from 'react';

export interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'red';
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
  size = 'md',
  color = 'blue',
  animated = false
}) => {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600'
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} rounded-full transition-all duration-300 ${
            colorClasses[color]
          } ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'gray' | 'white';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export interface ScoreDisplayProps {
  score: number;
  maxScore?: number;
  label?: string;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  maxScore,
  label = 'Score',
  showProgress = false,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  const progress = maxScore ? (score / maxScore) * 100 : undefined;

  return (
    <div className="text-center">
      <div className="mb-2">
        <span className="text-gray-600 text-sm font-medium">{label}</span>
      </div>
      <div className={`font-bold text-gray-900 ${sizeClasses[size]}`}>
        {score.toLocaleString()}
        {maxScore && (
          <span className="text-gray-500 text-base ml-1">
            / {maxScore.toLocaleString()}
          </span>
        )}
      </div>
      {showProgress && progress !== undefined && (
        <div className="mt-3">
          <ProgressBar progress={progress} showPercentage={false} size="sm" />
        </div>
      )}
    </div>
  );
};

export interface TimerDisplayProps {
  timeRemaining: number; // in seconds
  format?: 'mm:ss' | 'hh:mm:ss' | 'seconds';
  warning?: number; // seconds when to show warning color
  critical?: number; // seconds when to show critical color
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timeRemaining,
  format = 'mm:ss',
  warning = 30,
  critical = 10
}) => {
  const formatTime = (seconds: number): string => {
    if (format === 'seconds') {
      return `${seconds}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (format === 'hh:mm:ss') {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };
  const getColorClass = (): string => {
    if (timeRemaining <= critical) return 'text-red-600';
    if (timeRemaining <= warning) return 'text-yellow-600';
    return 'text-gray-900';
  };
  return (
    <div className="text-center">
      <div className="text-gray-600 text-sm font-medium mb-1">Time Remaining</div>
      <div className={`text-2xl font-mono font-bold ${getColorClass()}`}>
        {formatTime(Math.max(0, timeRemaining))}
      </div>
    </div>
  );
};
