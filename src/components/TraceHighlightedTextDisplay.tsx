import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, X, MessageSquare, FileText, Settings } from 'lucide-react';
import {
  useTraceHighlightingStore,
  HIGHLIGHT_COLORS,
  HighlightPattern,
  HighlightColorId,
} from '../stores/useTraceHighlightingStore';
import { useConfigModalStore } from '../stores/useConfigModalStore';
import { logger } from '../utils/logger';

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
  patternId: string;
  patternName: string;
  colorId: HighlightColorId;
  headerStart: number;
  headerEnd: number;
  contentStart: number;
  contentEnd: number;
  fullText: string;
}

// Helper to get color classes
const getColorClasses = (colorId: HighlightColorId) => {
  return HIGHLIGHT_COLORS.find((c) => c.id === colorId) ?? HIGHLIGHT_COLORS[0];
};

/**
 * TraceHighlightedTextDisplay - Enhanced text display component with trace message highlighting.
 *
 * Features:
 * - Dynamic pattern highlighting with customizable colors and names
 * - "Final Response" toggle to show only the last message of a specific type
 * - Full search functionality with regex support
 * - Jump-to navigation with pattern names
 */
export const TraceHighlightedTextDisplay: React.FC<TraceHighlightedTextDisplayProps> = ({ text, className = '' }) => {
  const { patterns, highlightingEnabled } = useTraceHighlightingStore();
  const { openModal } = useConfigModalStore();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [regexError, setRegexError] = useState<string | null>(null);

  // View mode state - track which pattern to show final message for
  const [showFinalOnly, setShowFinalOnly] = useState<string | null>(null);

  // Track which message was just jumped to (for highlight effect)
  const [highlightedMessageIndex, setHighlightedMessageIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const messageHeaderRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Get active patterns (enabled with non-empty regex)
  const activePatterns = useMemo<HighlightPattern[]>(() => {
    return patterns.filter((p) => p.enabled && p.pattern.trim());
  }, [patterns]);

  // Parse message blocks from text
  const messageBlocks = useMemo<MessageBlock[]>(() => {
    if (!highlightingEnabled || activePatterns.length === 0) {
      return [];
    }

    const blocks: MessageBlock[] = [];

    try {
      // Combine patterns with alternation - each in its own capture group
      const combinedPattern = activePatterns.map((p) => `(${p.pattern})`).join('|');
      const regex = new RegExp(combinedPattern, 'g');

      interface MatchInfo {
        index: number;
        text: string;
        patternIndex: number;
      }

      const matches: MatchInfo[] = [];
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Determine which pattern matched by checking which capture group is defined
        let patternIndex = 0;
        for (let i = 1; i < match.length; i++) {
          if (match[i] !== undefined) {
            patternIndex = i - 1;
            break;
          }
        }

        matches.push({
          index: match.index,
          text: match[0],
          patternIndex,
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
        const pattern = activePatterns[current.patternIndex];

        blocks.push({
          patternId: pattern.id,
          patternName: pattern.name,
          colorId: pattern.colorId,
          headerStart: current.index,
          headerEnd: current.index + current.text.length,
          contentStart: current.index + current.text.length,
          contentEnd: next ? next.index : text.length,
          fullText: text.substring(current.index, next ? next.index : text.length),
        });
      }
    } catch (error) {
      logger.warning('TRACE_HIGHLIGHTING', 'Invalid trace highlighting pattern', 'TraceHighlightedTextDisplay', {
        error,
      });
    }

    return blocks;
  }, [text, activePatterns, highlightingEnabled]);

  // Get the last message block for each pattern type
  const lastMessages = useMemo(() => {
    const lastByPattern: Record<string, MessageBlock> = {};
    for (const block of messageBlocks) {
      lastByPattern[block.patternId] = block;
    }
    return lastByPattern;
  }, [messageBlocks]);

  // Determine which patterns have at least one match (for showing toggle buttons)
  const matchedPatternIds = useMemo(() => {
    return new Set(messageBlocks.map((b) => b.patternId));
  }, [messageBlocks]);

  // Get text to display based on toggle state
  const displayText = useMemo(() => {
    if (showFinalOnly && lastMessages[showFinalOnly]) {
      return lastMessages[showFinalOnly].fullText;
    }
    return text;
  }, [text, showFinalOnly, lastMessages]);

  // Recalculate message blocks for display text when in final-only mode
  const displayMessageBlocks = useMemo<MessageBlock[]>(() => {
    if (showFinalOnly && lastMessages[showFinalOnly]) {
      const lastMsg = lastMessages[showFinalOnly];
      return [
        {
          patternId: lastMsg.patternId,
          patternName: lastMsg.patternName,
          colorId: lastMsg.colorId,
          headerStart: 0,
          headerEnd: lastMsg.headerEnd - lastMsg.headerStart,
          contentStart: lastMsg.headerEnd - lastMsg.headerStart,
          contentEnd: lastMsg.fullText.length,
          fullText: lastMsg.fullText,
        },
      ];
    }
    return messageBlocks;
  }, [showFinalOnly, lastMessages, messageBlocks]);

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
    setShowFinalOnly(null);
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

  // Scroll to a specific message by index (only within the trace container)
  const scrollToMessage = (index: number) => {
    const header = messageHeaderRefs.current[index];
    const container = containerRef.current;
    if (header && container) {
      // Get positions relative to the viewport
      const containerRect = container.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      // Calculate scroll position: current scroll + (header position - container position) - padding
      const scrollTop = container.scrollTop + (headerRect.top - containerRect.top) - 8;
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });

      // Highlight the jumped-to message temporarily
      setHighlightedMessageIndex(index);
      setTimeout(() => setHighlightedMessageIndex(null), 2000);
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
      type: 'header' | 'search' | 'search-current';
      colorId?: HighlightColorId;
      messageIndex?: number;
    }

    const regions: HighlightRegion[] = [];

    // Add header regions if highlighting is enabled
    if (highlightingEnabled) {
      displayMessageBlocks.forEach((block, index) => {
        regions.push({
          start: block.headerStart,
          end: block.headerEnd,
          type: 'header',
          colorId: block.colorId,
          messageIndex: index,
        });
      });
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

      if (region.type === 'header' && region.colorId) {
        const color = getColorClasses(region.colorId);
        bgClass = color.bg;
      } else if (region.type === 'search-current') {
        bgClass = 'bg-orange-500';
        textClass = 'text-white';
        fontWeight = 'font-bold';
      } else if (region.type === 'search') {
        bgClass = 'bg-yellow-400';
        textClass = 'text-black';
      }

      const isSearchMatch = region.type === 'search' || region.type === 'search-current';
      const matchIndex = isSearchMatch ? matches.findIndex((m) => m.start === region.start) : -1;
      const isHeader = region.type === 'header';
      const isHighlightedJump = isHeader && region.messageIndex === highlightedMessageIndex;

      segments.push(
        <span
          key={segmentKey++}
          ref={(el) => {
            if (matchIndex >= 0) {
              matchRefs.current[matchIndex] = el;
            }
            if (isHeader && region.messageIndex !== undefined) {
              messageHeaderRefs.current[region.messageIndex] = el;
            }
          }}
          className={`${bgClass} ${textClass} ${fontWeight} px-0.5 rounded transition-all duration-300 ${
            isHighlightedJump ? 'ring-2 ring-blue-500 ring-offset-1 scale-[1.02]' : ''
          }`}
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

  // Get the first pattern that has matches (for default "Final Response" button)
  const firstMatchedPattern = activePatterns.find((p) => matchedPatternIds.has(p.id));

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

      {/* Final Response Toggle Button */}
      {firstMatchedPattern && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFinalOnly(showFinalOnly ? null : firstMatchedPattern.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showFinalOnly
                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {showFinalOnly ? (
              <>
                <FileText className="w-4 h-4" />
                Show Full Trace
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                Final {firstMatchedPattern.name}
              </>
            )}
          </button>
          {showFinalOnly && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing last {activePatterns.find((p) => p.id === showFinalOnly)?.name ?? 'message'} only
            </span>
          )}
        </div>
      )}

      {/* Message Navigation Selector */}
      {highlightingEnabled && displayMessageBlocks.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => openModal('traceHighlighting')}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0"
            title="Configure trace highlighting"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">Jump to:</span>
          {(() => {
            // Track count per pattern for numbering
            const countsPerPattern: Record<string, number> = {};
            return displayMessageBlocks.map((block, index) => {
              countsPerPattern[block.patternId] = (countsPerPattern[block.patternId] ?? 0) + 1;
              const num = countsPerPattern[block.patternId];
              const color = getColorClasses(block.colorId);
              return (
                <button
                  key={index}
                  onClick={() => scrollToMessage(index)}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition-colors flex-shrink-0 ${color.bg} ${color.text} hover:opacity-80`}
                >
                  {block.patternName} {num}
                </button>
              );
            });
          })()}
        </div>
      )}

      {/* Text Display with Highlighting */}
      <div ref={containerRef} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 max-h-[32rem] overflow-y-auto">
        {renderHighlightedText()}
      </div>
    </div>
  );
};
