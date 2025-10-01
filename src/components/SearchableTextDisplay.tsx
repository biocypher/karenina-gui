import React, { useState, useEffect, useRef, useMemo } from 'react';
import Highlighter from 'react-highlight-words';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface SearchableTextDisplayProps {
  text: string;
  className?: string;
}

interface MatchPosition {
  start: number;
  end: number;
  text: string;
}

export const SearchableTextDisplay: React.FC<SearchableTextDisplayProps> = ({ text, className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [regexError, setRegexError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Find all matches in the text
  const matches = useMemo<MatchPosition[]>(() => {
    if (!searchQuery) return [];

    try {
      setRegexError(null);

      if (useRegex) {
        // Use regex mode
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(searchQuery, flags);
        const foundMatches: MatchPosition[] = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
          foundMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
          });

          // Prevent infinite loop on zero-width matches
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }

        return foundMatches;
      } else {
        // Use plain text search
        const foundMatches: MatchPosition[] = [];
        const searchText = caseSensitive ? text : text.toLowerCase();
        const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();
        let startIndex = 0;

        while (true) {
          const index = searchText.indexOf(query, startIndex);
          if (index === -1) break;

          foundMatches.push({
            start: index,
            end: index + query.length,
            text: text.substring(index, index + query.length),
          });

          startIndex = index + 1;
        }

        return foundMatches;
      }
    } catch (error) {
      // Handle regex errors
      if (useRegex) {
        setRegexError(error instanceof Error ? error.message : 'Invalid regex pattern');
      }
      return [];
    }
  }, [searchQuery, caseSensitive, useRegex, text]);

  // Reset current match index when matches change
  useEffect(() => {
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
    }
  }, [matches]);

  // Scroll to current match
  useEffect(() => {
    if (matches.length > 0 && matchRefs.current[currentMatchIndex]) {
      matchRefs.current[currentMatchIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentMatchIndex, matches]);

  const goToNextMatch = () => {
    if (matches.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
    }
  };

  const goToPreviousMatch = () => {
    if (matches.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setCurrentMatchIndex(0);
    setRegexError(null);
  };

  // Custom highlight renderer for react-highlight-words
  const highlightStyle = (text: string, index: number) => {
    const isCurrentMatch = index === currentMatchIndex;
    return {
      backgroundColor: isCurrentMatch ? '#f97316' : '#fbbf24', // orange for current, yellow for others
      color: isCurrentMatch ? '#ffffff' : '#000000',
      fontWeight: isCurrentMatch ? 'bold' : 'normal',
      padding: '2px 0',
      borderRadius: '2px',
    };
  };

  // Build search words array for Highlighter component
  const searchWords = useMemo(() => {
    if (!searchQuery) return [];

    if (useRegex) {
      try {
        return [searchQuery];
      } catch {
        return [];
      }
    } else {
      return [searchQuery];
    }
  }, [searchQuery, useRegex]);

  return (
    <div className="space-y-3">
      {/* Search Controls */}
      <div className="space-y-2">
        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in response..."
              className="w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
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
                onClick={goToPreviousMatch}
                className="p-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                title="Previous match"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={goToNextMatch}
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

      {/* Text Display with Highlighting */}
      <div ref={containerRef} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 max-h-96 overflow-y-auto">
        {searchQuery && !regexError ? (
          <pre className={`whitespace-pre-wrap text-sm overflow-x-auto ${className}`}>
            <Highlighter
              searchWords={searchWords}
              autoEscape={!useRegex}
              textToHighlight={text}
              caseSensitive={caseSensitive}
              findChunks={() => {
                return matches.map((match) => ({
                  start: match.start,
                  end: match.end,
                  highlight: true,
                }));
              }}
              highlightTag={({ children, highlightIndex }) => (
                <span
                  ref={(el) => {
                    if (highlightIndex !== undefined) {
                      matchRefs.current[highlightIndex] = el;
                    }
                  }}
                  style={highlightStyle(children as string, highlightIndex ?? 0)}
                >
                  {children}
                </span>
              )}
            />
          </pre>
        ) : (
          <pre className={`whitespace-pre-wrap text-sm overflow-x-auto ${className}`}>{text}</pre>
        )}
      </div>
    </div>
  );
};
