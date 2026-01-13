import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface RubricCellProps {
  rubricResult: Record<string, number | boolean> | null;
  metricTraitMetrics?: Record<string, Record<string, number>>;
}

export const RubricCell: React.FC<RubricCellProps> = ({ rubricResult, metricTraitMetrics }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasLLMTraits = rubricResult && Object.keys(rubricResult).length > 0;
  const hasMetricTraits = metricTraitMetrics && Object.keys(metricTraitMetrics).length > 0;

  if (!hasLLMTraits && !hasMetricTraits) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
        N/A
      </span>
    );
  }

  const traits = hasLLMTraits ? Object.entries(rubricResult!) : [];
  const metricTraits = hasMetricTraits ? Object.entries(metricTraitMetrics!) : [];

  const passedTraits = traits.filter(([, value]) => (typeof value === 'boolean' ? value : value && value >= 3)).length;
  const totalTraits = traits.length + metricTraits.length;

  const summary = `${passedTraits}/${totalTraits}`;
  const hasGoodResults = totalTraits > 0 && passedTraits >= totalTraits * 0.5;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`inline-flex items-center px-2 py-1 rounded text-xs ${
          hasGoodResults
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
        } hover:opacity-80`}
      >
        {isExpanded ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
        {summary}
      </button>

      {isExpanded && (
        <div className="mt-1 space-y-1 text-xs">
          {traits.map(([name, value]) => (
            <div
              key={name}
              className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded"
            >
              <span className="font-medium text-slate-700 dark:text-slate-300">{name}:</span>
              <span
                className={`font-semibold ${
                  typeof value === 'boolean'
                    ? value
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                    : value && value >= 3
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                }`}
              >
                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value || 'N/A'}
              </span>
            </div>
          ))}
          {metricTraits.map(([name, metrics]) => (
            <div key={`metric-${name}`} className="bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded space-y-1">
              <div className="flex items-center gap-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>
                <span className="text-xs text-purple-600 dark:text-purple-400">(Metric)</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {metrics && typeof metrics === 'object'
                  ? Object.entries(metrics).map(([metricName, value]) => (
                      <span
                        key={metricName}
                        className="text-xs text-purple-600 dark:text-purple-400"
                        title={`${metricName}: ${(value * 100).toFixed(1)}%`}
                      >
                        {metricName}: {(value * 100).toFixed(1)}%
                      </span>
                    ))
                  : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
