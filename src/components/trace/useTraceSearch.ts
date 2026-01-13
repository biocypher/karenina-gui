import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface MatchPosition {
  start: number;
  end: number;
  text: string;
}

export interface UseTraceSearchProps {
  text: string;
}

export interface UseTraceSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  caseSensitive: boolean;
  setCaseSensitive: (value: boolean) => void;
  useRegex: boolean;
  setUseRegex: (value: boolean) => void;
  currentMatchIndex: number;
  setCurrentMatchIndex: (index: number) => void;
  regexError: string | null;
  setRegexError: (error: string | null) => void;
  matches: MatchPosition[];
  matchRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>;
  goToNextMatch: () => void;
  goToPreviousMatch: () => void;
  clearSearch: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

// ============================================================================
// Custom Hook
// ============================================================================

export const useTraceSearch = (props: UseTraceSearchProps): UseTraceSearchReturn => {
  const { text } = props;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [regexError, setRegexError] = useState<string | null>(null);

  const matchRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Find all search matches in the text
  const matches = useMemo<MatchPosition[]>(() => {
    if (!searchQuery) return [];

    try {
      setRegexError(null);

      if (useRegex) {
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

          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }

        return foundMatches;
      } else {
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

  const goToNextMatch = useCallback(() => {
    if (matches.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
    }
  }, [matches.length]);

  const goToPreviousMatch = useCallback(() => {
    if (matches.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
    }
  }, [matches.length]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentMatchIndex(0);
    setRegexError(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && matches.length > 0) {
        e.preventDefault();
        goToNextMatch();
      }
    },
    [matches.length, goToNextMatch]
  );

  return {
    searchQuery,
    setSearchQuery,
    caseSensitive,
    setCaseSensitive,
    useRegex,
    setUseRegex,
    currentMatchIndex,
    setCurrentMatchIndex,
    regexError,
    setRegexError,
    matches,
    matchRefs,
    goToNextMatch,
    goToPreviousMatch,
    clearSearch,
    handleKeyDown,
  };
};
