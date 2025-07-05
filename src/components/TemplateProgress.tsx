import React from 'react';
import { Clock } from 'lucide-react';
import { TemplateGenerationProgress } from '../types';

interface TemplateProgressProps {
  progress: TemplateGenerationProgress | null;
}

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

export const TemplateProgress: React.FC<TemplateProgressProps> = ({ progress }) => {
  if (!progress) return null;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-slate-600 dark:text-slate-300">Status:</span>
          <span className="ml-2 font-medium text-slate-900 dark:text-slate-100 capitalize">{progress.status}</span>
        </div>
        <div>
          <span className="text-slate-600 dark:text-slate-300">Current:</span>
          <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">{progress.current_question}</span>
        </div>
        <div>
          <span className="text-slate-600 dark:text-slate-300">Processed:</span>
          <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
            {progress.processed_count} / {progress.total_count}
          </span>
        </div>
      </div>

      {progress.estimated_time_remaining && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <span>Estimated time remaining: {formatDuration(progress.estimated_time_remaining)}</span>
        </div>
      )}
    </div>
  );
};
