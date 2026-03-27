import React from 'react';
import { Clock } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatTimestamp } from '../utils/dataLoader';

interface StatusMetadataBarProps {
  finished: boolean;
  modified: boolean;
  fewShotExamplesCount: number;
  onToggleFinished: () => void;
  onEditMetadata: () => void;
  onEditFewShotExamples: () => void;
  lastModified: string | null;
  unsavedQuestionNumbers: number[];
}

export const StatusMetadataBar: React.FC<StatusMetadataBarProps> = ({
  finished,
  modified,
  fewShotExamplesCount,
  onToggleFinished,
  onEditMetadata,
  onEditFewShotExamples,
  lastModified,
  unsavedQuestionNumbers,
}) => {
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 px-6 py-3">
      <div className="flex items-center gap-4 flex-wrap">
        <StatusBadge
          finished={finished}
          modified={modified}
          fewShotExamplesCount={fewShotExamplesCount}
          onToggleFinished={onToggleFinished}
          onEditMetadata={onEditMetadata}
          onEditFewShotExamples={onEditFewShotExamples}
        />

        {lastModified && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-700/50 rounded-lg px-3 py-1.5">
            <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="font-medium">Last modified: {formatTimestamp(lastModified)}</span>
          </div>
        )}

        {unsavedQuestionNumbers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-900/30 rounded-lg px-3 py-1.5 border border-amber-200/50 dark:border-amber-700/50 ml-auto">
            <span className="w-1.5 h-1.5 bg-amber-500 dark:bg-amber-400 rounded-full animate-pulse" />
            <span className="font-medium">Unsaved session changes</span>
            <span className="text-xs text-amber-600 dark:text-amber-500">
              Q: <span className="font-semibold">{unsavedQuestionNumbers.join(', ')}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
