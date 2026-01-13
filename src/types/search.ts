/**
 * Search result types for deep-judgment
 */

export interface SearchResultItem {
  title?: string | null; // Optional - will use truncated content if missing
  content: string; // Required - the main text
  url?: string | null; // Optional - will not show clickable link if missing
}
