import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../../utils/logger';
import type { HighlightPattern, HighlightColorId } from '../../stores/useTraceHighlightingStore';
import { HIGHLIGHT_COLORS } from '../../stores/useTraceHighlightingStore';

// ============================================================================
// Types
// ============================================================================

export interface MessageBlock {
  patternId: string;
  patternName: string;
  colorId: HighlightColorId;
  headerStart: number;
  headerEnd: number;
  contentStart: number;
  contentEnd: number;
  fullText: string;
}

export interface UseTraceMessageBlocksProps {
  text: string;
  patterns: HighlightPattern[];
  highlightingEnabled: boolean;
}

export interface UseTraceMessageBlocksReturn {
  activePatterns: HighlightPattern[];
  messageBlocks: MessageBlock[];
  displayMessageBlocks: MessageBlock[];
  lastMessages: Record<string, MessageBlock>;
  matchedPatternIds: Set<string>;
  showFinalOnly: string | null;
  setShowFinalOnly: (patternId: string | null) => void;
  displayText: string;
  containerRef: React.RefObject<HTMLDivElement>;
  messageHeaderRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>;
  highlightedMessageIndex: number | null;
  scrollToMessage: (index: number) => void;
  getColorClasses: (colorId: HighlightColorId) => { bg: string; text: string; border: string };
}

// ============================================================================
// Helper Functions
// ============================================================================

const getColorClasses = (colorId: HighlightColorId) => {
  return HIGHLIGHT_COLORS.find((c) => c.id === colorId) ?? HIGHLIGHT_COLORS[0];
};

// ============================================================================
// Custom Hook
// ============================================================================

export const useTraceMessageBlocks = (props: UseTraceMessageBlocksProps): UseTraceMessageBlocksReturn => {
  const { text, patterns, highlightingEnabled } = props;

  // View mode state - track which pattern to show final message for
  const [showFinalOnly, setShowFinalOnly] = useState<string | null>(null);

  // Track which message was just jumped to (for highlight effect)
  const [highlightedMessageIndex, setHighlightedMessageIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
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
      logger.warning('TRACE_HIGHLIGHTING', 'Invalid trace highlighting pattern', 'useTraceMessageBlocks', {
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

  // Reset view mode when text changes
  useEffect(() => {
    setShowFinalOnly(null);
  }, [text]);

  // Scroll to a specific message by index (only within the trace container)
  const scrollToMessage = useCallback((index: number) => {
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
  }, []);

  return {
    activePatterns,
    messageBlocks,
    displayMessageBlocks,
    lastMessages,
    matchedPatternIds,
    showFinalOnly,
    setShowFinalOnly,
    displayText,
    containerRef,
    messageHeaderRefs,
    highlightedMessageIndex,
    scrollToMessage,
    getColorClasses,
  };
};
