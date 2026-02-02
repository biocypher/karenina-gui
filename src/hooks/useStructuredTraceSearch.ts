import { useState, useMemo, useCallback } from 'react';
import type { TraceMessage } from '../types/trace';

export interface StructuredSearchMatch {
  messageIndex: number;
  field: 'content' | 'tool_name' | 'tool_input';
  startOffset: number;
  endOffset: number;
}

export interface UseStructuredTraceSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  matches: StructuredSearchMatch[];
  currentMatchIndex: number;
  goToNext: () => void;
  goToPrev: () => void;
  totalMatches: number;
}

export function useStructuredTraceSearch(traceMessages: TraceMessage[] | undefined): UseStructuredTraceSearchReturn {
  const [query, setQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const matches = useMemo(() => {
    if (!query || !traceMessages || traceMessages.length === 0) return [];

    const results: StructuredSearchMatch[] = [];
    const lowerQuery = query.toLowerCase();

    traceMessages.forEach((msg, msgIdx) => {
      // Search content
      const contentLower = (msg.content || '').toLowerCase();
      let pos = contentLower.indexOf(lowerQuery);
      while (pos !== -1) {
        results.push({
          messageIndex: msgIdx,
          field: 'content',
          startOffset: pos,
          endOffset: pos + query.length,
        });
        pos = contentLower.indexOf(lowerQuery, pos + 1);
      }

      // Search tool call names and inputs
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          if (tc.name.toLowerCase().includes(lowerQuery)) {
            results.push({
              messageIndex: msgIdx,
              field: 'tool_name',
              startOffset: 0,
              endOffset: tc.name.length,
            });
          }
          const inputStr = JSON.stringify(tc.input).toLowerCase();
          if (inputStr.includes(lowerQuery)) {
            results.push({
              messageIndex: msgIdx,
              field: 'tool_input',
              startOffset: 0,
              endOffset: 0,
            });
          }
        }
      }
    });

    return results;
  }, [query, traceMessages]);

  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const goToPrev = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  return {
    query,
    setQuery: (q: string) => {
      setQuery(q);
      setCurrentMatchIndex(0);
    },
    matches,
    currentMatchIndex,
    goToNext,
    goToPrev,
    totalMatches: matches.length,
  };
}
