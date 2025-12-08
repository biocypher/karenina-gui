import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, X, MessageSquare, FileText } from 'lucide-react';
import { useTraceHighlightingStore } from '../stores/useTraceHighlightingStore';

interface TraceHighlightedTextDisplayProps {
  text: string;
  className?: string;
}

interface MatchPosition {
  start: number;
  end: number;
  text: string;
}

interface MessageBlock {
  type: 'ai' | 'tool';
  headerStart: number;
  headerEnd: number;
  contentStart: number;
  contentEnd: number;
  fullText: string;
}

/**
 * TraceHighlightedTextDisplay - Enhanced text display component with trace message highlighting.
 *
 * Features:
 * - Highlights AI message headers in green
 * - Highlights Tool message headers in yellow
 * - "Final AI Response" toggle to show only the last AI message
 * - Full search functionality with regex support
 */
export const TraceHighlightedTextDisplay: React.FC<TraceHighlightedTextDisplayProps> = ({ text, className = '' }) => {
  const { aiMessagePattern, toolMessagePattern, highlightingEnabled } = useTraceHighlightingStore();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [regexError, setRegexError] = useState<string | null>(null);

  // View mode state
  const [showFinalAIOnly, setShowFinalAIOnly] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Parse message blocks from text
  const messageBlocks = useMemo<MessageBlock[]>(() => {
    if (!highlightingEnabled || (!aiMessagePattern.trim() && !toolMessagePattern.trim())) {
      return [];
    }

    const blocks: MessageBlock[] = [];
    const patterns: { pattern: string; type: 'ai' | 'tool' }[] = [];

    if (aiMessagePattern.trim()) {
      patterns.push({ pattern: aiMessagePattern, type: 'ai' });
    }
    if (toolMessagePattern.trim()) {
      patterns.push({ pattern: toolMessagePattern, type: 'tool' });
    }

    if (patterns.length === 0) return [];

    try {
      // Combine patterns with alternation
      const combinedPattern = patterns.map((p) => `(${p.pattern})`).join('|');
      const regex = new RegExp(combinedPattern, 'g');

      interface MatchInfo {
        index: number;
        text: string;
        type: 'ai' | 'tool';
      }

      const matches: MatchInfo[] = [];
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Determine which pattern matched
        const isAI = patterns[0]?.type === 'ai' && match[1] !== undefined;
        matches.push({
          index: match.index,
          text: match[0],
          type: isAI ? 'ai' : 'tool',
        });

        // Prevent infinite loop on zero-width matches
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }

      // Build blocks with content
      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const next = matches[i + 1];

        blocks.push({
          type: current.type,
          headerStart: current.index,
          headerEnd: current.index + current.text.length,
          contentStart: current.index + current.text.length,
          contentEnd: next ? next.index : text.length,
          fullText: text.substring(current.index, next ? next.index : text.length),
        });
      }
    } catch (error) {
      console.warn('Invalid trace highlighting pattern:', error);
    }

    return blocks;
  }, [text, aiMessagePattern, toolMessagePattern, highlightingEnabled]);

  // Get the last AI message block
  const lastAIMessage = useMemo(() => {
    const aiBlocks = messageBlocks.filter((b) => b.type === 'ai');
    return aiBlocks.length > 0 ? aiBlocks[aiBlocks.length - 1] : null;
  }, [messageBlocks]);

  // Determine if "Final AI Response" button should be shown
  const showFinalAIButton = messageBlocks.some((b) => b.type === 'ai');

  // Get text to display based on toggle state
  const displayText = useMemo(() => {
    if (showFinalAIOnly && lastAIMessage) {
      return lastAIMessage.fullText;
    }
    return text;
  }, [text, showFinalAIOnly, lastAIMessage]);

  // Recalculate message blocks for display text when in final AI mode
  const displayMessageBlocks = useMemo<MessageBlock[]>(() => {
    if (showFinalAIOnly && lastAIMessage) {
      // Single block for the final AI message
      return [
        {
          type: 'ai',
          headerStart: 0,
          headerEnd: lastAIMessage.headerEnd - lastAIMessage.headerStart,
          contentStart: lastAIMessage.headerEnd - lastAIMessage.headerStart,
          contentEnd: lastAIMessage.fullText.length,
          fullText: lastAIMessage.fullText,
        },
      ];
    }
    return messageBlocks;
  }, [showFinalAIOnly, lastAIMessage, messageBlocks]);

  // Find all search matches in the display text
  const matches = useMemo<MatchPosition[]>(() => {
    if (!searchQuery) return [];

    try {
      setRegexError(null);

      if (useRegex) {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(searchQuery, flags);
        const foundMatches: MatchPosition[] = [];
        let match;

        while ((match = regex.exec(displayText)) !== null) {
          foundMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
          });

          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }

        return foundMatches;
      } else {
        const foundMatches: MatchPosition[] = [];
        const searchText = caseSensitive ? displayText : displayText.toLowerCase();
        const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();
        let startIndex = 0;

        while (true) {
          const index = searchText.indexOf(query, startIndex);
          if (index === -1) break;

          foundMatches.push({
            start: index,
            end: index + query.length,
            text: displayText.substring(index, index + query.length),
          });

          startIndex = index + 1;
        }

        return foundMatches;
      }
    } catch (error) {
      if (useRegex) {
        setRegexError(error instanceof Error ? error.message : 'Invalid regex pattern');
      }
      return [];
    }
  }, [searchQuery, caseSensitive, useRegex, displayText]);

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

  // Reset view mode when text changes
  useEffect(() => {
    setShowFinalAIOnly(false);
  }, [text]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && matches.length > 0) {
      e.preventDefault();
      goToNextMatch();
    }
  };

  // Build highlighted text segments
  const renderHighlightedText = () => {
    const segments: React.ReactNode[] = [];
    let currentIndex = 0;
    let segmentKey = 0;

    // Get all highlight regions (headers and search matches)
    interface HighlightRegion {
      start: number;
      end: number;
      type: 'ai-header' | 'tool-header' | 'search' | 'search-current';
    }

    const regions: HighlightRegion[] = [];

    // Add header regions if highlighting is enabled
    if (highlightingEnabled) {
      for (const block of displayMessageBlocks) {
        regions.push({
          start: block.headerStart,
          end: block.headerEnd,
          type: block.type === 'ai' ? 'ai-header' : 'tool-header',
        });
      }
    }

    // Add search match regions
    matches.forEach((match, index) => {
      regions.push({
        start: match.start,
        end: match.end,
        type: index === currentMatchIndex ? 'search-current' : 'search',
      });
    });

    // Sort regions by start position
    regions.sort((a, b) => a.start - b.start);

    // Process text with highlights
    for (const region of regions) {
      // Add plain text before this region
      if (region.start > currentIndex) {
        segments.push(<span key={segmentKey++}>{displayText.substring(currentIndex, region.start)}</span>);
      }

      // Skip if we've already passed this region (overlapping)
      if (region.start < currentIndex) continue;

      // Get styles for this region type
      let bgClass = '';
      let textClass = '';
      let fontWeight = '';

      switch (region.type) {
        case 'ai-header':
          bgClass = 'bg-green-200 dark:bg-green-800/60';
          break;
        case 'tool-header':
          bgClass = 'bg-yellow-200 dark:bg-yellow-800/60';
          break;
        case 'search-current':
          bgClass = 'bg-orange-500';
          textClass = 'text-white';
          fontWeight = 'font-bold';
          break;
        case 'search':
          bgClass = 'bg-yellow-400';
          textClass = 'text-black';
          break;
      }

      const isSearchMatch = region.type === 'search' || region.type === 'search-current';
      const matchIndex = isSearchMatch ? matches.findIndex((m) => m.start === region.start) : -1;

      segments.push(
        <span
          key={segmentKey++}
          ref={
            matchIndex >= 0
              ? (el) => {
                  matchRefs.current[matchIndex] = el;
                }
              : undefined
          }
          className={`${bgClass} ${textClass} ${fontWeight} px-0.5 rounded`}
        >
          {displayText.substring(region.start, region.end)}
        </span>
      );

      currentIndex = region.end;
    }

    // Add remaining text
    if (currentIndex < displayText.length) {
      segments.push(<span key={segmentKey++}>{displayText.substring(currentIndex)}</span>);
    }

    return <pre className={`whitespace-pre-wrap text-sm overflow-x-auto ${className}`}>{segments}</pre>;
  };

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
              onKeyDown={handleKeyDown}
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

      {/* Final AI Response Toggle Button */}
      {showFinalAIButton && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFinalAIOnly(!showFinalAIOnly)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showFinalAIOnly
                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {showFinalAIOnly ? (
              <>
                <FileText className="w-4 h-4" />
                Show Full Trace
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                Final AI Response
              </>
            )}
          </button>
          {showFinalAIOnly && (
            <span className="text-xs text-slate-500 dark:text-slate-400">Showing last AI message only</span>
          )}
        </div>
      )}

      {/* Text Display with Highlighting */}
      <div ref={containerRef} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 max-h-96 overflow-y-auto">
        {renderHighlightedText()}
      </div>
    </div>
  );
};
