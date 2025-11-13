import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  hover = false
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  const classes = [
    'bg-white rounded-lg border border-gray-200',
    paddingClasses[padding],
    shadowClasses[shadow],
    hover ? 'hover:shadow-lg transition-shadow duration-200' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

// Card sub-components for more structured layouts
export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`pb-4 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  );
};

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  );
};

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`pt-4 ${className}`}>
      {children}
    </div>
  );
};

export interface GameCardProps {
  title: string;
  description: string;
  image?: string;
  difficulty: string;
  estimatedTime: number;
  onPlay: () => void;
  isLocked?: boolean;
  progress?: number;
}

export const GameCard: React.FC<GameCardProps> = ({
  title,
  description,
  image,
  difficulty,
  estimatedTime,
  onPlay,
  isLocked = false,
  progress
}) => {
  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
    adaptive: 'bg-blue-100 text-blue-800'
  };

  return (
    <Card hover className="max-w-sm">
      <div className="relative">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-32 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-t-lg flex items-center justify-center">
            <span className="text-white text-4xl">9e0</span>
          </div>
        )}
        {isLocked && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-t-lg flex items-center justify-center">
            <span className="text-white text-2xl">512</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-4">{description}</p>
        
        <div className="flex items-center justify-between mb-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              difficultyColors[difficulty as keyof typeof difficultyColors] || 
              difficultyColors.medium
            }`}
          >
            {difficulty}
          </span>
          <span className="text-sm text-gray-500">~{estimatedTime} min</span>
        </div>

        {progress !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={onPlay}
          disabled={isLocked}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors duration-200 ${
            isLocked
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLocked ? 'Locked' : 'Play Game'}
        </button>
      </div>
    </Card>
  );
};
