import React from 'react';
import { CheckCircle, Circle, Edit3, Settings, Zap } from 'lucide-react';

interface StatusBadgeProps {
  finished: boolean;
  modified: boolean;
  fewShotExamplesCount?: number;
  onToggleFinished: () => void;
  onEditMetadata: () => void;
  onEditFewShotExamples: () => void;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  finished,
  modified,
  fewShotExamplesCount = 0,
  onToggleFinished,
  onEditMetadata,
  onEditFewShotExamples,
}) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Finished Badge */}
      <button
        onClick={onToggleFinished}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg ${
          finished
            ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600'
            : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-slate-200 hover:to-slate-300 border border-slate-300'
        }`}
      >
        {finished ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
        {finished ? 'Finished' : 'Not Finished'}
      </button>

      {/* Modified Badge */}
      {modified && (
        <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm">
          <Edit3 className="w-3.5 h-3.5" />
          Modified
        </div>
      )}

      {/* Few-shot Examples Button */}
      <button
        onClick={onEditFewShotExamples}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-100 to-purple-100 text-violet-800 hover:from-violet-200 hover:to-purple-200 border border-violet-200 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
      >
        <Zap className="w-3.5 h-3.5" />
        Few-shot
        {fewShotExamplesCount > 0 && (
          <span className="bg-violet-600 text-white text-xs px-1.5 py-0.5 rounded-full">{fewShotExamplesCount}</span>
        )}
      </button>

      {/* Edit Metadata Button */}
      <button
        onClick={onEditMetadata}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-slate-200 hover:to-slate-300 border border-slate-300 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
      >
        <Settings className="w-3.5 h-3.5" />
        Metadata
      </button>
    </div>
  );
};
