import React from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { TemplateGenerationProgress, QuestionData } from '../types';
import { formatDuration } from '../utils/time';

interface TemplateProgressProps {
  progress: TemplateGenerationProgress | null;
  questions?: QuestionData;
}

export const TemplateProgress: React.FC<TemplateProgressProps> = ({ progress, questions }) => {
  if (!progress) return null;

  // Helper to get question text from question ID
  const getQuestionText = (questionId: string): string => {
    if (!questions || !questions[questionId]) {
      return questionId;
    }
    const question = questions[questionId].question || questionId;
    // Truncate long questions
    return question.length > 60 ? `${question.substring(0, 60)}...` : question;
  };

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Generation Progress</h3>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300 mb-2">
          <span>Progress</span>
          <span>{Math.round(progress.percentage)}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <span className="text-slate-600 dark:text-slate-300">Status:</span>
          <span className="ml-2 font-medium text-slate-900 dark:text-slate-100 capitalize">{progress.status}</span>
        </div>
        <div>
          <span className="text-slate-600 dark:text-slate-300">Processed:</span>
          <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
            {progress.processed_count} / {progress.total_count}
          </span>
        </div>
      </div>

      {/* Concurrent Tasks Display */}
      {progress.in_progress_questions && progress.in_progress_questions.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>Currently Processing ({progress.in_progress_questions.length}):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {progress.in_progress_questions.map((questionId, index) => (
              <span
                key={`${questionId}-${index}`}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                title={questions?.[questionId]?.question || questionId}
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
          <div className="mb-4 text-sm">
            <span className="text-slate-600 dark:text-slate-300">Current:</span>
            <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">{progress.current_question}</span>
          </div>
        )}

      {progress.estimated_time_remaining && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <span>Estimated time remaining: {formatDuration(progress.estimated_time_remaining)}</span>
        </div>
      )}
    </div>
  );
};
