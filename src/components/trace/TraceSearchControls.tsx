import React from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import type { MatchPosition } from './useTraceSearch';

// ============================================================================
// Props
// ============================================================================

export interface TraceSearchControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  caseSensitive: boolean;
  setCaseSensitive: (value: boolean) => void;
  useRegex: boolean;
  setUseRegex: (value: boolean) => void;
  currentMatchIndex: number;
  matches: MatchPosition[];
  regexError: string | null;
  onClearSearch: () => void;
  onGoToNextMatch: () => void;
  onGoToPreviousMatch: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

// ============================================================================
// Component
// ============================================================================

export const TraceSearchControls: React.FC<TraceSearchControlsProps> = ({
  searchQuery,
  setSearchQuery,
  caseSensitive,
  setCaseSensitive,
  useRegex,
  setUseRegex,
  currentMatchIndex,
  matches,
  regexError,
  onClearSearch,
  onGoToNextMatch,
  onGoToPreviousMatch,
  onKeyDown,
}) => {
  return (
    <div className="space-y-2">
      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search in response..."
            className="w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
          />
          {searchQuery && (
            <button
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Controls */}
        {matches.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={onGoToPreviousMatch}
              className="p-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
              title="Previous match"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={onGoToNextMatch}
              className="p-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
              title="Next match"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Options and Match Counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Case Sensitive Toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            <span>Case sensitive</span>
          </label>

          {/* Regex Toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            <span>Use regex</span>
          </label>
        </div>

        {/* Match Counter */}
        {searchQuery && (
          <div className="text-xs text-slate-600 dark:text-slate-300">
            {matches.length > 0 ? (
              <>
                Match <span className="font-semibold">{currentMatchIndex + 1}</span> of{' '}
                <span className="font-semibold">{matches.length}</span>
              </>
            ) : (
              <span className="text-red-600 dark:text-red-400">No matches found</span>
            )}
          </div>
        )}
      </div>

      {/* Regex Error Display */}
      {regexError && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1">
          Invalid regex: {regexError}
        </div>
      )}
    </div>
  );
};
