import React from 'react';
import { CheckCircle, Circle, Edit3 } from 'lucide-react';

interface StatusBadgeProps {
  finished: boolean;
  modified: boolean;
  onToggleFinished: () => void;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ finished, modified, onToggleFinished }) => {
  return (
    <div className="flex items-center gap-3">
      {/* Finished Badge */}
      <button
        onClick={onToggleFinished}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
          finished
            ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600'
            : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-slate-200 hover:to-slate-300 border border-slate-300'
        }`}
      >
        {finished ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Circle className="w-4 h-4" />
        )}
        {finished ? 'Finished' : 'Not Finished'}
      </button>

      {/* Modified Badge */}
      {modified && (
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm">
          <Edit3 className="w-4 h-4" />
          Modified
        </div>
      )}
    </div>
  );
};