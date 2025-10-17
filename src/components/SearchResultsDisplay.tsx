import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { SearchResultItem } from '../types';

interface SearchResultsDisplayProps {
  searchResults: SearchResultItem[];
}

const SearchResultItemComponent: React.FC<{
  item: SearchResultItem;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ item, isExpanded, onToggle }) => {
  // Use title if available, otherwise use truncated content (max 80 chars)
  const displayTitle = item.title || (item.content.length > 80 ? item.content.substring(0, 80) + '...' : item.content);

  // Determine if we should show the title was truncated from content
  const titleIsTruncated = !item.title;

  return (
    <div className="bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900 rounded p-2">
      {/* Collapsible header - shows title or truncated content */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-2 text-left hover:opacity-80 transition-opacity"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        ) : (
          <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        )}
        <span
          className={`text-xs font-medium ${
            titleIsTruncated ? 'text-slate-600 dark:text-slate-400 italic' : 'text-slate-800 dark:text-slate-200'
          }`}
        >
          {displayTitle}
        </span>
      </button>

      {/* Collapsible content - shows full content and source */}
      {isExpanded && (
        <div className="mt-2 ml-5 space-y-2">
          {/* Content */}
          <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.content}</div>

          {/* Source URL as clickable link (only if available) */}
          {item.url ? (
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
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-500 italic">Source not available</div>
          )}
        </div>
      )}
    </div>
  );
};

export const SearchResultsDisplay: React.FC<SearchResultsDisplayProps> = ({ searchResults }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // No results case
  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="text-xs text-slate-600 dark:text-slate-400">
        <p className="font-medium mb-1">Search Validation:</p>
        <p>No search results available</p>
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
        Search Validation ({searchResults.length} {searchResults.length === 1 ? 'result' : 'results'})
      </button>

      {/* Collapsible content - all search result items */}
      {isExpanded && (
        <div className="space-y-2">
          {searchResults.map((item, idx) => (
            <SearchResultItemComponent
              key={idx}
              item={item}
              isExpanded={expandedItems.has(idx)}
              onToggle={() => toggleItem(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
