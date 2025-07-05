import React from 'react';
import { diffLines } from 'diff';

interface DiffViewerProps {
  originalCode: string;
  currentCode: string;
  title: string;
  hideHeader?: boolean;
}

interface DiffPart {
  added?: boolean;
  removed?: boolean;
  value: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ originalCode, currentCode, title, hideHeader = false }) => {
  const diff = diffLines(originalCode, currentCode);

  const renderDiffLine = (part: DiffPart, index: number) => {
    const lineClass = part.added
      ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-l-4 border-emerald-500 dark:border-emerald-400 text-emerald-900 dark:text-emerald-300'
      : part.removed
        ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-l-4 border-red-500 dark:border-red-400 text-red-900 dark:text-red-300'
        : 'bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100';

    const prefix = part.added ? '+' : part.removed ? '-' : ' ';
    const lines = part.value
      .split('\n')
      .filter((line: string, i: number, arr: string[]) => i < arr.length - 1 || line.trim() !== '');

    return lines.map((line: string, lineIndex: number) => (
      <div key={`${index}-${lineIndex}`} className={`px-4 py-1.5 font-mono text-sm ${lineClass}`}>
        <span className="inline-block w-6 text-slate-500 dark:text-slate-400 select-none font-semibold">{prefix}</span>
        <span className="ml-2">{line}</span>
      </div>
    ));
  };

  return (
    <div className="h-full flex flex-col bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-600 rounded-2xl overflow-hidden shadow-xl">
      {/* Header - conditionally rendered */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-b border-slate-300 dark:border-slate-600 flex-shrink-0">
          <div className="flex items-center gap-2">{/* Window controls removed for cleaner interface */}</div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</div>
        </div>
      )}

      {/* Diff Content */}
      <div className="flex-1 overflow-auto">
        <div className="min-h-full">
          {diff.length === 1 && !diff[0].added && !diff[0].removed ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <p className="text-lg font-semibold mb-2">No Changes</p>
              <p className="font-medium">The current code is identical to the {title.toLowerCase()}.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-600">
              {diff.map((part, index) => renderDiffLine(part, index))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 border-t border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-50 dark:bg-emerald-900/30 border-l-2 border-emerald-500 dark:border-emerald-400 rounded-sm shadow-sm"></div>
          <span className="font-medium">Added</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-50 dark:bg-red-900/30 border-l-2 border-red-500 dark:border-red-400 rounded-sm shadow-sm"></div>
          <span className="font-medium">Removed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-sm shadow-sm"></div>
          <span className="font-medium">Unchanged</span>
        </div>
      </div>
    </div>
  );
};
