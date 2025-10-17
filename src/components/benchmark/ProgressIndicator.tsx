import React from 'react';
import { Loader } from 'lucide-react';

interface VerificationProgress {
  job_id: string;
  status: string;
  percentage: number;
  current_question: string;
  processed_count: number;
  total_count: number;
  successful_count: number;
  failed_count: number;
  estimated_time_remaining?: number;
  error?: string;
  results?: Record<string, unknown>;
}

interface ProgressIndicatorProps {
  isRunning: boolean;
  progress: VerificationProgress | null;
  selectedTestsCount: number;
  answeringModelsCount: number;
  parsingModelsCount: number;
}

const formatDuration = (seconds?: number) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return 'N/A';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  isRunning,
  progress,
  selectedTestsCount,
  answeringModelsCount,
  parsingModelsCount,
}) => {
  if (!isRunning) {
    return null;
  }

  const totalTests = selectedTestsCount * answeringModelsCount * parsingModelsCount;

  return (
    <div className="mb-4">
      {progress && (
        <>
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300 mb-2">
            <span>
              Progress: {progress.processed_count || 0} / {progress.total_count || totalTests}
            </span>
            <span>{Math.round(progress.percentage || 0)}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage || 0}%` }}
            />
          </div>
          {progress.current_question && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Current: {progress.current_question}</p>
          )}
          {progress.estimated_time_remaining && progress.status !== 'completed' && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Estimated time remaining: {formatDuration(progress.estimated_time_remaining)}
            </p>
          )}
        </>
      )}
      {!progress && (
        <>
          <div className="text-center text-slate-600 dark:text-slate-300 mb-2 flex items-center justify-center gap-2">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Initializing verification...</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '10%' }} />
          </div>
        </>
      )}
    </div>
  );
};
