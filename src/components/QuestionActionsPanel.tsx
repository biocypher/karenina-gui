import React from 'react';
import { Copy, Trash2, Wrench } from 'lucide-react';

interface QuestionActionsPanelProps {
  onDelete: () => void;
  onClone: () => void;
  disabled?: boolean;
}

export const QuestionActionsPanel: React.FC<QuestionActionsPanelProps> = ({ onDelete, onClone, disabled = false }) => {
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Wrench className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        Question Actions
      </h3>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Clone Button */}
        <button
          onClick={onClone}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 hover:from-indigo-200 hover:to-blue-200 border border-indigo-200 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 dark:from-indigo-900/50 dark:to-blue-900/50 dark:text-indigo-300 dark:border-indigo-700 dark:hover:from-indigo-900/70 dark:hover:to-blue-900/70"
        >
          <Copy className="w-3.5 h-3.5" />
          Clone
        </button>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-red-100 to-rose-100 text-red-700 hover:from-red-200 hover:to-rose-200 border border-red-200 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 dark:from-red-900/50 dark:to-rose-900/50 dark:text-red-300 dark:border-red-700 dark:hover:from-red-900/70 dark:hover:to-rose-900/70"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
};
