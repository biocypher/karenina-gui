/**
 * AdeleScoreBadge - Compact display of an ADeLe trait score.
 *
 * Shows a trait's classification with color-coded score badge.
 */

import React from 'react';
import { getScoreColorClass } from '../../types/adele';

interface AdeleScoreBadgeProps {
  /** Trait name (snake_case) */
  traitName: string;
  /** Score value (0-5, or -1 for error) */
  score: number;
  /** Class label */
  label: string;
  /** Show trait name in badge */
  showName?: boolean;
  /** Compact mode (smaller) */
  compact?: boolean;
}

/**
 * Format trait name for display (snake_case to Title Case).
 */
function formatTraitName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get abbreviated trait name (first letters of each word).
 */
function getTraitAbbrev(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export const AdeleScoreBadge: React.FC<AdeleScoreBadgeProps> = ({
  traitName,
  score,
  label,
  showName = true,
  compact = false,
}) => {
  const colorClass = getScoreColorClass(score);
  const isError = score === -1;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${colorClass}`}
        title={`${formatTraitName(traitName)}: ${label} (${score})`}
      >
        <span className="font-bold">{getTraitAbbrev(traitName)}</span>
        <span>{isError ? '!' : score}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      {showName && (
        <span className="text-sm text-slate-600 dark:text-slate-400 truncate" title={formatTraitName(traitName)}>
          {formatTraitName(traitName)}
        </span>
      )}
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
        {isError ? (
          <span>Error</span>
        ) : (
          <>
            <span className="capitalize">{label.replace('_', ' ')}</span>
            <span className="font-bold">({score})</span>
          </>
        )}
      </span>
    </div>
  );
};

export default AdeleScoreBadge;
