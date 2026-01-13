/**
 * Formatter Utilities
 *
 * Common formatting functions for summary statistics.
 * Extracted from SummaryView.tsx for reuse.
 */

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string like "5m 30.5s" or "30.5s"
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) return `${minutes}m ${secs.toFixed(1)}s`;
  return `${secs.toFixed(1)}s`;
}

/**
 * Format a number with locale-specific thousands separator
 * @param num - Number to format
 * @returns Formatted string with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}
