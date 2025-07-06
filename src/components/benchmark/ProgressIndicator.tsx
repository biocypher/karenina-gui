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
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {progress.total_count || totalTests}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">Total Tests</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {progress.successful_count || 0}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Successful</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">{progress.failed_count || 0}</div>
              <div className="text-sm text-red-600 dark:text-red-400">Failed</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {progress.estimated_time_remaining ? formatDuration(progress.estimated_time_remaining) : 'N/A'}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Estimated Time</div>
            </div>
          </div>
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
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalTests}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">Total Tests</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">0</div>
              <div className="text-sm text-green-600 dark:text-green-400">Successful</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">0</div>
              <div className="text-sm text-red-600 dark:text-red-400">Failed</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                <Loader className="w-6 h-6 animate-spin mx-auto" />
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Starting...</div>
            </div>
          </div>
          <div className="text-center text-slate-600 dark:text-slate-300 mb-2">Initializing verification...</div>
          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '10%' }} />
          </div>
        </>
      )}
    </div>
  );
};
