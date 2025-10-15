import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

interface SearchItem {
  index: number;
  title: string;
  content: string;
  url: string;
}

interface SearchResultsDisplayProps {
  searchResults: string;
}

/**
 * Parse search results from the formatted string returned by Tavily search tool.
 *
 * Expected format:
 * <item_1>
 * [1] Title
 *     Content (can be multi-line)
 *     Source: https://example.com
 * </item_1>
 *
 * @param searchResults - Formatted search results string
 * @returns Array of parsed search items
 */
function parseSearchResults(searchResults: string): SearchItem[] {
  // Regex to match <item_N>...</item_N> blocks
  // Captures: index, title (after [N]), content (multi-line), and URL
  const itemRegex = /<item_(\d+)>\s*\[\d+\]\s*([^\n]+)\n\s+(.+?)\n\s+Source:\s*(.+?)\s*<\/item_\d+>/gs;

  const items: SearchItem[] = [];
  let match;

  while ((match = itemRegex.exec(searchResults)) !== null) {
    items.push({
      index: parseInt(match[1], 10),
      title: match[2].trim(),
      content: match[3].trim(),
      url: match[4].trim(),
    });
  }

  return items;
}

const SearchResultItem: React.FC<{
  item: SearchItem;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ item, isExpanded, onToggle }) => {
  return (
    <div className="bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900 rounded p-2">
      {/* Collapsible header - shows title */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-2 text-left hover:opacity-80 transition-opacity"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        ) : (
          <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        )}
        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{item.title}</span>
      </button>

      {/* Collapsible content - shows full content and source */}
      {isExpanded && (
        <div className="mt-2 ml-5 space-y-2">
          {/* Content */}
          <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.content}</div>

          {/* Source URL as clickable link */}
          <div className="flex items-center gap-1">
            <ExternalLink className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {item.url}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export const SearchResultsDisplay: React.FC<SearchResultsDisplayProps> = ({ searchResults }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Parse search results
  const items = parseSearchResults(searchResults);

  if (items.length === 0) {
    // Fallback if parsing fails - show raw text
    return (
      <div className="text-xs text-slate-600 dark:text-slate-400">
        <p className="font-medium mb-1">Search Validation:</p>
        <p className="whitespace-pre-wrap">{searchResults}</p>
      </div>
    );
  }

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="space-y-2">
      {/* Collapsible header for entire search results section */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-medium text-blue-800 dark:text-blue-200 hover:opacity-80 transition-opacity"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Search Validation ({items.length} {items.length === 1 ? 'result' : 'results'})
      </button>

      {/* Collapsible content - all search result items */}
      {isExpanded && (
        <div className="space-y-2">
          {items.map((item) => (
            <SearchResultItem
              key={item.index}
              item={item}
              isExpanded={expandedItems.has(item.index)}
              onToggle={() => toggleItem(item.index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
