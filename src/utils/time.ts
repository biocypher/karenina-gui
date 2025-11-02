/**
 * Formats a duration in seconds to a human-readable string in mm:ss format
 * @param seconds - Duration in seconds (can be undefined or null)
 * @returns Formatted string (e.g., "02:30", "00:45", or "N/A")
 */
export const formatDuration = (seconds?: number): string => {
  // Check for invalid values (undefined, null, NaN)
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return 'N/A';
  }

  // Convert to mm:ss format
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  // Pad with zeros for consistent format
  const minutesStr = minutes.toString().padStart(2, '0');
  const secondsStr = remainingSeconds.toString().padStart(2, '0');

  return `${minutesStr}:${secondsStr}`;
};

/**
 * Formats a short duration in seconds to a compact human-readable string
 * @param seconds - Duration in seconds (can be undefined or null)
 * @returns Formatted string (e.g., "2m 30s", "45s", or "N/A")
 */
export const formatShortDuration = (seconds?: number): string => {
  // Check for invalid values (undefined, null, NaN)
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return 'N/A';
  }

  // Show seconds only for durations under 60s
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }

  // Show minutes and seconds for longer durations
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};
