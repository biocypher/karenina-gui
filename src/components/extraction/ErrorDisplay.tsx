import React from 'react';
import { AlertCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ErrorDisplayProps {
  error: string | null | undefined;
  previewError?: string | null | undefined;
  extractionError?: string | null | undefined;
  localError?: string | null | undefined;
  onDismiss?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, localError, onDismiss }) => {
  const errorMessage = error || localError;

  if (!errorMessage) {
    return null;
  }

  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Error</span>
        </div>
        {localError && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
          >
            Dismiss
          </button>
        )}
      </div>
      <p className="text-red-700 dark:text-red-300 mt-1">{errorMessage}</p>
    </div>
  );
};
