import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Search, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, FileText } from 'lucide-react';
import type { TraceMessage } from '../../types/trace';
import { TraceMessageBlock } from './TraceMessageBlock';

interface TraceStructuredDisplayProps {
  traceMessages: TraceMessage[];
  className?: string;
}

const ROLE_LABELS: Record<string, string> = {
  assistant: 'Assistant',
  tool: 'Tool',
  user: 'User',
  system: 'System',
};

export const TraceStructuredDisplay: React.FC<TraceStructuredDisplayProps> = ({ traceMessages, className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFinalOnly, setShowFinalOnly] = useState(false);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset state when messages change
  useEffect(() => {
    setSearchQuery('');
    setShowFinalOnly(false);
    setCurrentMatchIdx(0);
    setFocusedIdx(null);
  }, [traceMessages]);

  // Reset match index when search changes
  useEffect(() => {
    setCurrentMatchIdx(0);
  }, [searchQuery]);

  // Filter: show final assistant message only
  const displayMessages = useMemo(() => {
    if (!showFinalOnly) return traceMessages;
    for (let i = traceMessages.length - 1; i >= 0; i--) {
      if (traceMessages[i].role === 'assistant') return [traceMessages[i]];
    }
    return traceMessages;
  }, [traceMessages, showFinalOnly]);

  // Search: find indices of messages containing the query
  const matchingIndices = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return displayMessages.reduce<number[]>((acc, msg, i) => {
      if (msg.content?.toLowerCase().includes(q)) acc.push(i);
      return acc;
    }, []);
  }, [displayMessages, searchQuery]);

  // Scroll to a message by its index in displayMessages
  const scrollToMessage = useCallback((idx: number) => {
    const el = messageRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Navigate search matches
  const goToNext = useCallback(() => {
    if (matchingIndices.length === 0) return;
    const next = (currentMatchIdx + 1) % matchingIndices.length;
    setCurrentMatchIdx(next);
    scrollToMessage(matchingIndices[next]);
  }, [matchingIndices, currentMatchIdx, scrollToMessage]);

  const goToPrev = useCallback(() => {
    if (matchingIndices.length === 0) return;
    const prev = (currentMatchIdx - 1 + matchingIndices.length) % matchingIndices.length;
    setCurrentMatchIdx(prev);
    scrollToMessage(matchingIndices[prev]);
  }, [matchingIndices, currentMatchIdx, scrollToMessage]);

  // Message stepper: prev/next through all messages
  const stepMessage = useCallback(
    (direction: 1 | -1) => {
      const total = displayMessages.length;
      if (total === 0) return;
      const current = focusedIdx ?? (direction === 1 ? -1 : total);
      const next = (current + direction + total) % total;
      setFocusedIdx(next);
      scrollToMessage(next);
    },
    [displayMessages.length, focusedIdx, scrollToMessage]
  );

  // Jump to message navigation buttons (by role)
  const messageJumpTargets = useMemo(() => {
    const counters: Record<string, number> = {};
    return displayMessages.map((msg, i) => {
      counters[msg.role] = (counters[msg.role] ?? 0) + 1;
      return { index: i, role: msg.role, label: `${ROLE_LABELS[msg.role] ?? msg.role} ${counters[msg.role]}` };
    });
  }, [displayMessages]);

  if (!traceMessages || traceMessages.length === 0) {
    return (
      <div className="text-slate-400 dark:text-slate-500 text-sm italic p-3">
        No structured trace messages available.
      </div>
    );
  }

  const currentMatchMessageIdx = matchingIndices[currentMatchIdx] ?? -1;

  return (
    <div className={`${className}`}>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-slate-50 dark:bg-gray-700/90 backdrop-blur-sm border-b border-slate-200 dark:border-gray-600 px-3 py-2 space-y-1.5">
        {/* Row 1: search + final response */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goToNext();
              }}
              placeholder="Search messages..."
              className="w-full pl-8 pr-8 py-1 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentMatchIdx(0);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Match navigation */}
          {matchingIndices.length > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                {currentMatchIdx + 1}/{matchingIndices.length}
              </span>
              <button
                onClick={goToPrev}
                className="p-0.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={goToNext}
                className="p-0.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {searchQuery && matchingIndices.length === 0 && (
            <span className="text-[10px] text-red-500 dark:text-red-400 flex-shrink-0">No matches</span>
          )}

          {/* Final Response toggle */}
          <button
            onClick={() => setShowFinalOnly(!showFinalOnly)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors flex-shrink-0 ${
              showFinalOnly
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'
                : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
            }`}
          >
            {showFinalOnly ? (
              <>
                <FileText className="w-3 h-3" />
                Show All
              </>
            ) : (
              <>
                <MessageSquare className="w-3 h-3" />
                Final Response
              </>
            )}
          </button>
        </div>

        {/* Row 2: message stepper + jump-to */}
        {displayMessages.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Prev/Next stepper */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => stepMessage(-1)}
                className="p-0.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                title="Previous message"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums min-w-[3.5rem] text-center">
                {focusedIdx != null
                  ? `${focusedIdx + 1} / ${displayMessages.length}`
                  : `${displayMessages.length} msgs`}
              </span>
              <button
                onClick={() => stepMessage(1)}
                className="p-0.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                title="Next message"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-slate-300 dark:text-slate-600">|</span>

            {/* Jump-to buttons */}
            <div className="flex items-center gap-1 overflow-x-auto min-w-0">
              {messageJumpTargets.map(({ index, role, label }) => {
                const roleColors: Record<string, string> = {
                  assistant: 'bg-green-100 dark:bg-green-800/40 text-green-700 dark:text-green-300',
                  user: 'bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300',
                  tool: 'bg-yellow-100 dark:bg-yellow-800/40 text-yellow-700 dark:text-yellow-300',
                  system: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
                };
                const isActive = focusedIdx === index;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setFocusedIdx(index);
                      scrollToMessage(index);
                    }}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 transition-all ${
                      roleColors[role] ?? roleColors.system
                    } ${isActive ? 'ring-1 ring-blue-400 dark:ring-blue-500 scale-105' : 'hover:opacity-80'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="space-y-2 max-h-[32rem] overflow-y-auto p-3">
        {displayMessages.map((msg, idx) => (
          <div
            key={`${msg.role}-${msg.block_index}-${idx}`}
            ref={(el) => {
              messageRefs.current[idx] = el;
            }}
          >
            <TraceMessageBlock
              message={msg}
              searchQuery={searchQuery}
              isCurrentMatch={idx === currentMatchMessageIdx || idx === focusedIdx}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
