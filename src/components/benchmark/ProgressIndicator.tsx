import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import type { VerificationProgress } from '../../types';
import { formatDuration, formatShortDuration } from '../../utils/time';

interface FinishedTemplateData {
  question: string;
  [key: string]: unknown;
}

interface ProgressIndicatorProps {
  isRunning: boolean;
  progress: VerificationProgress | null;
  selectedTestsCount: number;
  answeringModelsCount: number;
  parsingModelsCount: number;
  replicateCount: number;
  finishedTemplates?: Array<[string, FinishedTemplateData]>;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  isRunning,
  progress,
  selectedTestsCount,
  answeringModelsCount,
  parsingModelsCount,
  replicateCount,
  finishedTemplates,
}) => {
  // State for live clock calculation
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);

  // Set up live clock timer when start_time is available
  useEffect(() => {
    // Only set up timer if we have a start_time and job is running
    if (!progress?.start_time || progress.status === 'completed' || progress.status === 'failed') {
      setElapsedSeconds(null);
      return;
    }

    // Calculate initial elapsed time
    const calculateElapsed = () => {
      if (progress.start_time) {
        return (Date.now() - progress.start_time * 1000) / 1000;
      }
      return null;
    };

    // Update immediately
    setElapsedSeconds(calculateElapsed());

    // Set up interval to update every second
    const intervalId = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    // Cleanup interval on unmount or when dependencies change
    return () => clearInterval(intervalId);
  }, [progress?.start_time, progress?.status]);

  if (!isRunning) {
    return null;
  }

  const totalTests = selectedTestsCount * answeringModelsCount * parsingModelsCount * replicateCount;

  // Helper to get question text from question ID
  const getQuestionText = (questionId: string): string => {
    if (!finishedTemplates) {
      return questionId;
    }
    const template = finishedTemplates.find(([id]) => id === questionId);
    if (!template) {
      return questionId;
    }
    const question = template[1].question || questionId;
    // Truncate long questions
    return question.length > 60 ? `${question.substring(0, 60)}...` : question;
  };

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

          {/* Concurrent Tasks Display */}
          {progress.in_progress_questions && progress.in_progress_questions.length > 0 && (
            <div className="mt-3">
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Currently Processing ({progress.in_progress_questions.length}):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {progress.in_progress_questions.map((questionId, index) => (
                  <span
                    key={`${questionId}-${index}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700"
                    title={
                      finishedTemplates
                        ? finishedTemplates.find(([id]) => id === questionId)?.[1]?.question || questionId
                        : questionId
                    }
                  >
                    {getQuestionText(questionId)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Current Question (fallback for when in_progress_questions is empty) */}
          {(!progress.in_progress_questions || progress.in_progress_questions.length === 0) &&
            progress.current_question && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Current: {progress.current_question}</p>
            )}
          {/* Show elapsed time while running (live clock), total time when complete */}
          {(elapsedSeconds !== null || progress.duration_seconds !== undefined) && (
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 space-y-1">
              <p>
                {progress.status === 'completed'
                  ? `Completed in: ${formatDuration(progress.duration_seconds)}`
                  : `Running for: ${formatDuration(elapsedSeconds ?? progress.duration_seconds)}`}
              </p>
              {/* Show last task duration only while running and if available */}
              {progress.status === 'running' &&
                progress.last_task_duration !== null &&
                progress.last_task_duration !== undefined && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Last item took: {formatShortDuration(progress.last_task_duration)}
                  </p>
                )}
            </div>
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
