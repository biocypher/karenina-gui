import React from 'react';
import { CheckCircle } from 'lucide-react';

interface BenchmarkCardProps {
  id: string;
  name: string;
  totalQuestions: number;
  finishedCount: number;
  unfinishedCount: number;
  lastModified?: string;
  isSelected: boolean;
  onClick: () => void;
}

export const BenchmarkCard: React.FC<BenchmarkCardProps> = ({
  name,
  totalQuestions,
  finishedCount,
  unfinishedCount,
  lastModified,
  isSelected,
  onClick,
}) => {
  // Format the last modified timestamp
  const formatTimestamp = (timestamp?: string): string => {
    if (!timestamp) return 'Never';

    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
        }
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return 'Unknown';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 rounded-lg border transition-all
        ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium text-gray-900 dark:text-white">{name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
            {finishedCount > 0 && (
              <span className="ml-2">
                ({finishedCount} finished, {unfinishedCount} unfinished)
              </span>
            )}
          </div>
          {lastModified && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Last modified: {formatTimestamp(lastModified)}
            </div>
          )}
        </div>
        {isSelected && <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />}
      </div>
    </button>
  );
};
