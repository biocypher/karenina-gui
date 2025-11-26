import React from 'react';
import { RubricBadge } from './RubricBadge';
import type { HeatmapCell, TraitLetterMap, BadgeVisibilityFilter } from '../../types';

interface RubricBadgeOverlayProps {
  rubricScores: HeatmapCell['rubric_scores'];
  letterAssignments: TraitLetterMap;
  visibilityFilter: BadgeVisibilityFilter;
  cellPassed: boolean | null; // The cell's template pass/fail status
}

interface BadgeData {
  letters: string;
  value: boolean | number;
  kind: 'boolean' | 'score';
}

/**
 * Container component for displaying multiple rubric badges on a heatmap cell.
 *
 * Features:
 * - Positioned at top-left of cell
 * - Constrained within cell bounds (overflow hidden)
 * - Filters badges based on visibility filter (all/passed/failed/hidden)
 * - Sorts badges by letters for consistent ordering
 */
export function RubricBadgeOverlay({
  rubricScores,
  letterAssignments,
  visibilityFilter,
  cellPassed,
}: RubricBadgeOverlayProps) {
  // Don't render if hidden or no data
  if (visibilityFilter === 'hidden') {
    return null;
  }

  if (!rubricScores || Object.keys(letterAssignments).length === 0) {
    return null;
  }

  // Filter based on visibility (only show on passed/failed cells if filter is set)
  if (visibilityFilter === 'passed' && cellPassed !== true) {
    return null;
  }
  if (visibilityFilter === 'failed' && cellPassed !== false) {
    return null;
  }

  // Collect badges for all assigned traits
  const badges: BadgeData[] = [];

  Object.entries(letterAssignments).forEach(([traitName, assignment]) => {
    let value: boolean | number | undefined;

    if (assignment.traitType === 'llm' && rubricScores.llm) {
      value = rubricScores.llm[traitName];
    } else if (assignment.traitType === 'regex' && rubricScores.regex) {
      value = rubricScores.regex[traitName];
    } else if (assignment.traitType === 'callable' && rubricScores.callable) {
      value = rubricScores.callable[traitName];
    }

    // Only add badge if we have a value (trait was evaluated)
    if (value !== undefined) {
      badges.push({
        letters: assignment.letters,
        value,
        kind: assignment.kind,
      });
    }
  });

  if (badges.length === 0) {
    return null;
  }

  // Sort badges by letters for consistent ordering
  badges.sort((a, b) => a.letters.localeCompare(b.letters));

  return (
    <div
      className="absolute top-0.5 left-0.5 flex flex-wrap gap-0.5 pointer-events-none"
      style={{
        maxWidth: 'calc(100% - 4px)',
        maxHeight: 'calc(100% - 4px)',
        overflow: 'hidden',
      }}
    >
      {badges.map((badge, idx) => (
        <RubricBadge key={idx} {...badge} />
      ))}
    </div>
  );
}

export default RubricBadgeOverlay;
