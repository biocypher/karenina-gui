import React from 'react';
import { useTraceHighlightingStore } from '../stores/useTraceHighlightingStore';
import { useConfigModalStore } from '../stores/useConfigModalStore';
import { useTraceSearch, useTraceMessageBlocks, TraceSearchControls, TraceMessageNavigation } from './trace';

interface TraceHighlightedTextDisplayProps {
  text: string;
  className?: string;
}

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

  // Use custom hook for search functionality
  const {
    searchQuery,
    setSearchQuery,
    caseSensitive,
    setCaseSensitive,
    useRegex,
    setUseRegex,
    currentMatchIndex,
    regexError,
    matches,
    matchRefs,
    goToNextMatch,
    goToPreviousMatch,
    clearSearch,
    handleKeyDown,
  } = useTraceSearch({ text });

  // Use custom hook for message blocks
  const {
    activePatterns,
    displayMessageBlocks,
    showFinalOnly,
    setShowFinalOnly,
    displayText,
    containerRef,
    messageHeaderRefs,
    highlightedMessageIndex,
    scrollToMessage,
    getColorClasses: getBlockColorClasses,
  } = useTraceMessageBlocks({
    text,
    patterns,
    highlightingEnabled,
  });

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
        const color = getBlockColorClasses(region.colorId);
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

  return (
    <div className="space-y-3">
      {/* Search Controls */}
      <TraceSearchControls
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        caseSensitive={caseSensitive}
        setCaseSensitive={setCaseSensitive}
        useRegex={useRegex}
        setUseRegex={setUseRegex}
        currentMatchIndex={currentMatchIndex}
        matches={matches}
        regexError={regexError}
        onClearSearch={clearSearch}
        onGoToNextMatch={goToNextMatch}
        onGoToPreviousMatch={goToPreviousMatch}
        onKeyDown={handleKeyDown}
      />

      {/* Message Navigation */}
      <TraceMessageNavigation
        activePatterns={activePatterns}
        messageBlocks={displayMessageBlocks}
        showFinalOnly={showFinalOnly}
        onToggleFinalOnly={(patternId) => setShowFinalOnly(showFinalOnly ? null : patternId)}
        onScrollToMessage={scrollToMessage}
        onOpenConfig={() => openModal('traceHighlighting')}
        getColorClasses={getBlockColorClasses}
      />

      {/* Text Display with Highlighting */}
      <div ref={containerRef} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 max-h-[32rem] overflow-y-auto">
        {renderHighlightedText()}
      </div>
    </div>
  );
};
