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
  finishedTemplates?: Array<[string, FinishedTemplateData]>;
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
  finishedTemplates,
}) => {
  if (!isRunning) {
    return null;
  }

  const totalTests = selectedTestsCount * answeringModelsCount * parsingModelsCount;

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
