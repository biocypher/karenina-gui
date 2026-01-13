import React from 'react';
import type { VerificationResult } from '../../types';

interface DeepJudgmentCellProps {
  result: VerificationResult;
}

export const DeepJudgmentCell: React.FC<DeepJudgmentCellProps> = ({ result }) => {
  // Not enabled - show disabled state
  if (!result.deep_judgment?.deep_judgment_enabled) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
        Disabled
      </span>
    );
  }

  // Enabled but not performed - show not performed state
  if (!result.deep_judgment?.deep_judgment_performed) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
        Not Performed
      </span>
    );
  }

  // Check if search was enabled (hallucination risk assessment present)
  const searchEnabled =
    result.deep_judgment?.deep_judgment_search_enabled && result.deep_judgment?.hallucination_risk_assessment;

  // If search was enabled, show Hallucination Risk badge
  if (searchEnabled && result.deep_judgment?.hallucination_risk_assessment) {
    const riskValues = Object.values(result.deep_judgment.hallucination_risk_assessment);

    // Find the highest risk level across all attributes
    let highestRisk: 'none' | 'low' | 'medium' | 'high' = 'none';
    const riskOrder = { none: 0, low: 1, medium: 2, high: 3 };

    riskValues.forEach((risk) => {
      if (riskOrder[risk as keyof typeof riskOrder] > riskOrder[highestRisk]) {
        highestRisk = risk as 'none' | 'low' | 'medium' | 'high';
      }
    });

    // Color-code by highest risk level
    const getRiskStyle = (risk: string) => {
      switch (risk) {
        case 'high':
          return {
            bg: 'bg-red-100 dark:bg-red-900/40',
            text: 'text-red-800 dark:text-red-200',
            border: 'border-red-300 dark:border-red-700',
          };
        case 'medium':
          return {
            bg: 'bg-orange-100 dark:bg-orange-900/40',
            text: 'text-orange-800 dark:text-orange-200',
            border: 'border-orange-300 dark:border-orange-700',
          };
        case 'low':
          return {
            bg: 'bg-yellow-100 dark:bg-yellow-900/40',
            text: 'text-yellow-800 dark:text-yellow-200',
            border: 'border-yellow-300 dark:border-yellow-700',
          };
        case 'none':
        default:
          return {
            bg: 'bg-green-100 dark:bg-green-900/40',
            text: 'text-green-800 dark:text-green-200',
            border: 'border-green-300 dark:border-green-700',
          };
      }
    };

    const style = getRiskStyle(highestRisk);
    const riskCount = riskValues.filter((r) => r !== 'none').length;

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded text-xs ${style.bg} ${style.text} border ${style.border}`}
        title={`Hallucination risk: ${highestRisk.toUpperCase()} (${riskCount} attribute${riskCount === 1 ? '' : 's'} with risk)`}
      >
        {highestRisk.toUpperCase()}
      </span>
    );
  }

  // When search not enabled, show "None" (no risk assessment performed)
  return (
    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      None
    </span>
  );
};
