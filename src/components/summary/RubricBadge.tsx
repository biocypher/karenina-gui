import React from 'react';

interface RubricBadgeProps {
  letters: string; // 1-2 characters, e.g., "A" or "AB"
  value: boolean | number;
  kind: 'boolean' | 'score';
}

/**
 * Get color for score-type badges based on score value (1-5 scale)
 */
const getScoreColor = (score: number): string => {
  const colors: Record<number, string> = {
    1: 'rgba(239, 68, 68, 0.7)', // red
    2: 'rgba(249, 115, 22, 0.7)', // orange
    3: 'rgba(234, 179, 8, 0.7)', // yellow
    4: 'rgba(132, 204, 22, 0.7)', // lime
    5: 'rgba(34, 197, 94, 0.7)', // green
  };
  const roundedScore = Math.round(Math.min(5, Math.max(1, score)));
  return colors[roundedScore] || colors[3];
};

/**
 * Get background color for boolean badges (lower opacity)
 */
const getBooleanBackgroundColor = (value: boolean): string => {
  return value
    ? 'rgba(34, 197, 94, 0.4)' // green 40%
    : 'rgba(239, 68, 68, 0.4)'; // red 40%
};

/**
 * Get text color for boolean badges (full opacity)
 */
const getBooleanTextColor = (value: boolean): string => {
  return value
    ? 'rgb(21, 128, 61)' // green-700
    : 'rgb(185, 28, 28)'; // red-700
};

/**
 * Individual rubric badge component for displaying trait evaluation results.
 *
 * - Boolean traits: Green/red badge with letters
 * - Score traits: Gradient-colored badge with letters and score value
 */
export function RubricBadge({ letters, value, kind }: RubricBadgeProps) {
  const isScore = kind === 'score' && typeof value === 'number';

  if (isScore) {
    const score = value as number;
    const roundedScore = Math.round(score);
    return (
      <div
        className="flex items-center justify-center rounded text-[9px] font-bold text-white shadow-sm"
        style={{
          backgroundColor: getScoreColor(score),
          minWidth: letters.length === 1 ? '28px' : '36px',
          height: '14px',
          padding: '0 3px',
        }}
        title={`${letters}: ${roundedScore}/5`}
      >
        {letters}:{roundedScore}
      </div>
    );
  }

  // Boolean badge
  const boolValue = value as boolean;
  return (
    <div
      className="flex items-center justify-center rounded text-[10px] font-bold shadow-sm"
      style={{
        backgroundColor: getBooleanBackgroundColor(boolValue),
        minWidth: letters.length === 1 ? '18px' : '24px',
        height: '14px',
        padding: '0 3px',
        color: getBooleanTextColor(boolValue),
      }}
      title={`${letters}: ${boolValue ? 'Pass' : 'Fail'}`}
    >
      {letters}
    </div>
  );
}

export default RubricBadge;
